"use node";

import { Inngest } from "inngest";
import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

export const dispatch = internalAction({
  args: { messageId: v.id("messages"), attempt: v.number() },
  returns: v.null(),
  handler: async (ctx, { messageId, attempt }) => {
    const pending = await ctx.runQuery(internal.chatState.getPendingReply, { messageId, attempt });
    if (!pending) return null;
    try {
      if (!process.env.INNGEST_EVENT_KEY || (process.env.CHAT_WORKER_SECRET?.length ?? 0) < 32) {
        throw new Error("CHAT_WORKFLOW_NOT_CONFIGURED");
      }
      const client = new Inngest({
        id: "smartide.ai",
        eventKey: process.env.INNGEST_EVENT_KEY,
        baseUrl: process.env.INNGEST_EVENT_API_BASE_URL,
        isDev: false,
      });
      // No prompt, provider credential, or worker secret is included in the event.
      // Stable ID prevents a repeated send from starting another job for this attempt.
      await client.send({
        id: `chat-${messageId}-${attempt}`,
        name: "chat/reply.requested",
        data: { messageId, attempt },
      });
    } catch (error) {
      // The SDK retries event delivery. If it still fails, unblock the composer.
      await ctx.runMutation(internal.chatState.finishReply, {
        messageId, attempt, content: "",
        error: error instanceof Error && error.message === "CHAT_WORKFLOW_NOT_CONFIGURED"
          ? "Chat's Inngest workflow is not configured yet."
          : "Could not queue your reply. Please retry.",
      });
    }
    return null;
  },
});
