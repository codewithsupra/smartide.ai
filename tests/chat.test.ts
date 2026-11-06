/// <reference types="vite/client" />
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { convexTest, type TestConvex } from "convex-test";
import agentTest from "@convex-dev/agent/test";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";

const provider = vi.hoisted(() => ({ fail: false, calls: 0, prompts: [] as string[], events: [] as { name: string; id: string; data: { messageId: string; attempt: number } }[], deliveryFails: false }));
vi.mock("@ai-sdk/google", async () => {
  const { mockModel } = await import("@convex-dev/agent");
  const model = mockModel({ content: [{ type: "text", text: "A mocked coding explanation." }] });
  const generate = model.doGenerate.bind(model);
  model.doGenerate = async (options) => {
    provider.calls++;
    provider.prompts.push(JSON.stringify(options.prompt));
    if (provider.fail) throw new Error("Synthetic provider failure");
    return generate(options);
  };
  return { google: () => model };
});

vi.mock("inngest", async (importOriginal) => ({
  ...await importOriginal<typeof import("inngest")>(),
  Inngest: class {
    async send(event: (typeof provider.events)[number]) {
      if (provider.deliveryFails) throw new Error("Synthetic delivery failure");
      provider.events.push(event);
      return { ids: [event.id] };
    }
  },
}));

const modules = import.meta.glob("../convex/**/*.ts");
async function runWorkflow(t: TestConvex<typeof schema>) {
  await t.finishAllScheduledFunctions(vi.runAllTimers);
  for (const event of provider.events.splice(0)) {
    const args = { ...event.data, messageId: event.data.messageId as import("../convex/_generated/dataModel").Id<"messages">, secret: "a".repeat(32) };
    try { await t.action(api.chat.runGeneration, args); }
    catch { await t.action(api.chat.failGeneration, args); }
  }
}

async function setup() {
  const t = convexTest(schema, modules);
  agentTest.register(t);
  const owner = t.withIdentity({ subject: "owner" });
  const stranger = t.withIdentity({ subject: "stranger" });
  const projectId = await t.run((ctx) => ctx.db.insert("projects", { name: "Test", ownerId: "owner" }));
  const conversationId = await owner.mutation(api.conversations.create, { projectId });
  return { t, owner, stranger, conversationId };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "test-only-never-sent");
  vi.stubEnv("CHAT_WORKER_SECRET", "a".repeat(32));
  vi.stubEnv("INNGEST_EVENT_KEY", "test-event-key");
  provider.events = [];
  provider.deliveryFails = false;
  provider.fail = false;
  provider.calls = 0;
  provider.prompts = [];
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });

describe("project chat", () => {
  it("saves both messages atomically, deduplicates requests, and prevents overlapping replies", async () => {
    const { t, owner, conversationId } = await setup();
    const args = { conversationId, content: "Explain recursion", requestId: "request-1" };
    const messageId = await owner.mutation(api.conversations.sendMessage, args);
    expect(await owner.mutation(api.conversations.sendMessage, args)).toBe(messageId);
    await expect(owner.mutation(api.conversations.sendMessage, { ...args, requestId: "request-2" })).rejects.toThrow("Wait for the current reply");
    const messages = await t.run((ctx) => ctx.db.query("messages").collect());
    expect(messages).toHaveLength(2);
    expect(messages[0]).toMatchObject({ senderId: "owner", content: args.content, status: "completed" });
    expect(messages[1]).toMatchObject({ _id: messageId, senderId: "assistant", status: "processing" });
    await runWorkflow(t);
    expect(await t.run((ctx) => ctx.db.get("messages", messageId))).toMatchObject({ status: "completed", content: "A mocked coding explanation." });
    expect((await owner.query(api.conversations.getById, { id: conversationId }))?.pendingMessageId).toBeUndefined();
    expect(provider.calls).toBe(1);
  });

  it("refuses unauthenticated, foreign, blank, and oversized messages without writes", async () => {
    const { t, owner, stranger, conversationId } = await setup();
    const args = { conversationId, content: "Hello", requestId: "request-1" };
    await expect(t.mutation(api.conversations.sendMessage, args)).rejects.toThrow("Unauthorized");
    await expect(stranger.mutation(api.conversations.sendMessage, args)).rejects.toThrow("Conversation not found");
    await expect(owner.mutation(api.conversations.sendMessage, { ...args, content: "   " })).rejects.toThrow("12,000");
    await expect(owner.mutation(api.conversations.sendMessage, { ...args, content: "x".repeat(12001) })).rejects.toThrow("12,000");
    expect(await t.run((ctx) => ctx.db.query("messages").collect())).toHaveLength(0);
  });

  it("records failure and retries the same prompt without duplicating the user's message", async () => {
    const { t, owner, stranger, conversationId } = await setup();
    provider.fail = true;
    const messageId = await owner.mutation(api.conversations.sendMessage, { conversationId, content: "Hello", requestId: "request-1" });
    await runWorkflow(t);
    const failed = await t.run((ctx) => ctx.db.get("messages", messageId));
    expect(failed).toMatchObject({ status: "failed", error: "Could not generate a reply after retrying. Please try again." });
    await expect(stranger.mutation(api.conversations.retryMessage, { messageId })).rejects.toThrow("Message not found");
    provider.fail = false;
    await owner.mutation(api.conversations.retryMessage, { messageId });
    await runWorkflow(t);
    const retried = await t.run((ctx) => ctx.db.get("messages", messageId));
    expect(retried).toMatchObject({ status: "completed", promptMessageId: failed?.promptMessageId });
    expect(await t.run((ctx) => ctx.db.query("messages").collect())).toHaveLength(2);
    // A duplicate background delivery must not overwrite an already completed reply.
    await t.mutation(internal.chatState.finishReply, { messageId, content: "Wrong duplicate" });
    expect((await t.run((ctx) => ctx.db.get("messages", messageId)))?.content).toBe("A mocked coding explanation.");
  });

  it("keeps the same thread across turns and returns newest messages first", async () => {
    const { t, owner, conversationId } = await setup();
    const first = await owner.mutation(api.conversations.sendMessage, { conversationId, content: "My name is Ada", requestId: "turn-1" });
    await runWorkflow(t);
    const before = await owner.query(api.conversations.getById, { id: conversationId });
    const second = await owner.mutation(api.conversations.sendMessage, { conversationId, content: "What is my name?", requestId: "turn-2" });
    await runWorkflow(t);
    const after = await owner.query(api.conversations.getById, { id: conversationId });
    expect(after?.threadId).toBe(before?.threadId);
    const page = await owner.query(api.conversations.getMessages, { conversationId, paginationOpts: { cursor: null, numItems: 2 } });
    expect(page.page.map((message) => message._id)).toContain(second);
    expect(page.page.map((message) => message._id)).not.toContain(first);
    expect(page.isDone).toBe(false);
    expect(provider.calls).toBe(2);
    expect(provider.prompts[1]).toContain("My name is Ada");
    expect(provider.prompts[1]).toContain("A mocked coding explanation.");
  });

  it("prevents retrying an old failure after a newer turn", async () => {
    const { t, owner, conversationId } = await setup();
    provider.fail = true;
    const messageId = await owner.mutation(api.conversations.sendMessage, { conversationId, content: "First", requestId: "turn-1" });
    await runWorkflow(t);
    provider.fail = false;
    await owner.mutation(api.conversations.sendMessage, { conversationId, content: "Second", requestId: "turn-2" });
    await runWorkflow(t);
    await expect(owner.mutation(api.conversations.retryMessage, { messageId })).rejects.toThrow("Only the latest failed reply");
  });

  it("shows a safe configuration error when the backend key is absent", async () => {
    const { t, owner, conversationId } = await setup();
    vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "");
    const messageId = await owner.mutation(api.conversations.sendMessage, { conversationId, content: "Hello", requestId: "request-1" });
    await runWorkflow(t);
    expect(await t.run((ctx) => ctx.db.get("messages", messageId))).toMatchObject({ status: "failed", error: "Could not generate a reply after retrying. Please try again." });
    expect(provider.calls).toBe(0);
  });
  it("dispatches only IDs to Inngest and rejects callers without the worker secret", async () => {
    const { t, owner, conversationId } = await setup();
    const messageId = await owner.mutation(api.conversations.sendMessage, { conversationId, content: "Private question", requestId: "request-1" });
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    expect(provider.events).toEqual([{ name: "chat/reply.requested", id: `chat-${messageId}-1`, data: { messageId, attempt: 1 } }]);
    await expect(t.action(api.chat.runGeneration, { messageId, attempt: 1, secret: "incorrect" })).rejects.toThrow("Unauthorized worker");
    await expect(t.action(api.chat.failGeneration, { messageId, attempt: 1, secret: "incorrect" })).rejects.toThrow("Unauthorized worker");
    expect(provider.calls).toBe(0);
    expect((await t.run((ctx) => ctx.db.get("messages", messageId)))?.status).toBe("processing");
  });

  it("unblocks the conversation when Inngest cannot accept the event", async () => {
    const { t, owner, conversationId } = await setup();
    provider.deliveryFails = true;
    const messageId = await owner.mutation(api.conversations.sendMessage, { conversationId, content: "Hello", requestId: "request-1" });
    await runWorkflow(t);
    expect(await t.run((ctx) => ctx.db.get("messages", messageId))).toMatchObject({ status: "failed", error: "Could not queue your reply. Please retry." });
    expect(provider.calls).toBe(0);
  });

  it("ignores late results and final failures from an earlier manual attempt", async () => {
    const { t, owner, conversationId } = await setup();
    provider.deliveryFails = true;
    const messageId = await owner.mutation(api.conversations.sendMessage, { conversationId, content: "Hello", requestId: "request-1" });
    await runWorkflow(t);
    provider.deliveryFails = false;
    await owner.mutation(api.conversations.retryMessage, { messageId });
    await t.action(api.chat.failGeneration, { messageId, attempt: 1, secret: "a".repeat(32) });
    await t.mutation(internal.chatState.finishReply, { messageId, attempt: 1, content: "Stale answer" });
    expect(await t.run((ctx) => ctx.db.get("messages", messageId))).toMatchObject({ status: "processing", generationAttempt: 2, content: "" });
    await runWorkflow(t);
    expect((await t.run((ctx) => ctx.db.get("messages", messageId)))?.status).toBe("completed");
  });

});
