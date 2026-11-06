import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NonRetriableError } from "inngest";
import { getFunctionName } from "convex/server";

const mocks = vi.hoisted(() => ({ fetchAction: vi.fn() }));
vi.mock("convex/nextjs", () => ({ fetchAction: mocks.fetchAction }));
vi.mock("../src/inngest/client", () => ({
  inngest: { createFunction: (config: unknown, handler: unknown) => ({ config, handler }) },
}));
import { chatReply } from "../src/inngest/chat";
import { api } from "../convex/_generated/api";

type EventData = { messageId?: string; attempt?: number };
const workflow = chatReply as unknown as {
  config: {
    retries: number;
    onFailure: (ctx: { event: { data: { event: { data: EventData } } }; step: typeof step }) => Promise<void>;
  };
  handler: (ctx: { event: { data: EventData }; step: typeof step }) => Promise<unknown>;
};
const step = { run: vi.fn(async (_name: string, run: () => Promise<unknown>) => run()) };

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("CHAT_WORKER_SECRET", "a".repeat(32));
  mocks.fetchAction.mockResolvedValue(null);
});

afterEach(() => vi.unstubAllEnvs());

describe("Inngest chat workflow", () => {
  it("runs generation inside a durable step and leaves credentials out of its result", async () => {
    expect(workflow.config.retries).toBe(3);
    const result = await workflow.handler({ event: { data: { messageId: "message-id", attempt: 1 } }, step });
    expect(step.run).toHaveBeenCalledWith("generate-and-save-reply", expect.any(Function));
    expect(mocks.fetchAction).toHaveBeenCalledWith(api.chat.runGeneration, { messageId: "message-id", attempt: 1, secret: "a".repeat(32) });
    expect(result).toEqual({ messageId: "message-id" });
  });

  it("propagates a temporary failure so Inngest can retry without marking the message failed", async () => {
    mocks.fetchAction.mockRejectedValueOnce(new Error("Temporary provider failure"));
    await expect(workflow.handler({ event: { data: { messageId: "message-id", attempt: 1 } }, step })).rejects.toThrow("Temporary provider failure");
    expect(mocks.fetchAction).toHaveBeenCalledTimes(1);
    expect(getFunctionName(mocks.fetchAction.mock.calls[0][0])).toBe("chat:runGeneration");
  });

  it("marks only the original attempt failed when retries are exhausted", async () => {
    await workflow.config.onFailure({ event: { data: { event: { data: { messageId: "message-id", attempt: 2 } } } }, step });
    expect(mocks.fetchAction).toHaveBeenCalledWith(api.chat.failGeneration, { messageId: "message-id", attempt: 2, secret: "a".repeat(32) });
  });

  it("rejects malformed events before calling the backend", async () => {
    await expect(workflow.handler({ event: { data: { messageId: "message-id", attempt: -1 } }, step })).rejects.toBeInstanceOf(NonRetriableError);
    await workflow.config.onFailure({ event: { data: { event: { data: {} } } }, step });
    expect(mocks.fetchAction).not.toHaveBeenCalled();
  });
});
