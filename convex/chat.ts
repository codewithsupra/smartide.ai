"use node";

import { timingSafeEqual } from "node:crypto";
import { Agent } from "@convex-dev/agent";
import { google } from "@ai-sdk/google";
import { APICallError, RetryError } from "ai";
import { ConvexError, v } from "convex/values";
import { action, internalAction, type ActionCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { components, internal } from "./_generated/api";

const assistant = new Agent(components.agent, {
  name: "Project assistant",
  languageModel: google("gemini-3.1-flash-lite"),
  instructions: "You are a helpful coding assistant in a cloud IDE. Explain clearly with concrete examples. Use the conversation history. You cannot inspect or change project files unless the user includes their contents; do not claim that you have done so.",
  contextOptions: { recentMessages: 20 },
});

function requireWorker(secret: string) {
  const expected = process.env.CHAT_WORKER_SECRET;
  if (!expected || expected.length < 32) throw new ConvexError("Chat worker is not configured.");
  const received = Buffer.from(secret);
  const configured = Buffer.from(expected);
  if (received.length !== configured.length || !timingSafeEqual(received, configured)) {
    throw new ConvexError("Unauthorized worker.");
  }
}

function safeError(error: unknown): string {
  const cause = RetryError.isInstance(error) ? error.lastError : error;
  const status = APICallError.isInstance(cause) ? cause.statusCode : undefined;
  return status === 503 ? "The AI provider is busy. Please retry shortly."
    : status === 429 ? "The AI provider's quota has been reached. Please try again later."
    : cause instanceof Error && cause.message === "CHAT_NOT_CONFIGURED" ? "Chat is not configured on the server yet."
    : "Could not generate a reply. Please retry.";
}

async function generateReply(ctx: ActionCtx, messageId: Id<"messages">, attempt: number) {
  const pending = await ctx.runQuery(internal.chatState.getPendingReply, { messageId, attempt });
  if (!pending) return;
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) throw new Error("CHAT_NOT_CONFIGURED");
  const result = await assistant.generateText(ctx, { threadId: pending.threadId }, {
    promptMessageId: pending.promptMessageId,
    maxOutputTokens: 2048,
    maxRetries: 0, // Inngest owns retries for the workflow.
    abortSignal: AbortSignal.timeout(45000),
  });
  if (!result.text.trim()) throw new Error("EMPTY_REPLY");
  await ctx.runMutation(internal.chatState.finishReply, { messageId, attempt, content: result.text });
}

// Called by the server-side Inngest workflow; the secret never goes to the browser.
export const runGeneration = action({
  args: { messageId: v.id("messages"), attempt: v.number(), secret: v.string() },
  returns: v.null(),
  handler: async (ctx, { messageId, attempt, secret }) => {
    requireWorker(secret);
    try { await generateReply(ctx, messageId, attempt); }
    catch (error) {
      // Throw so Inngest retries; keep the placeholder processing until final failure.
      throw new ConvexError(safeError(error));
    }
    return null;
  },
});

export const failGeneration = action({
  args: { messageId: v.id("messages"), attempt: v.number(), secret: v.string() },
  returns: v.null(),
  handler: async (ctx, { messageId, attempt, secret }) => {
    requireWorker(secret);
    await ctx.runMutation(internal.chatState.finishReply, {
      messageId, attempt, content: "", error: "Could not generate a reply after retrying. Please try again.",
    });
    return null;
  },
});

// Allow jobs scheduled before the Inngest migration to finish normally.
export const generate = internalAction({
  args: { messageId: v.id("messages") },
  returns: v.null(),
  handler: async (ctx, { messageId }) => {
    try { await generateReply(ctx, messageId, 1); }
    catch (error) {
      await ctx.runMutation(internal.chatState.finishReply, {
        messageId, attempt: 1, content: "", error: safeError(error),
      });
    }
    return null;
  },
});
