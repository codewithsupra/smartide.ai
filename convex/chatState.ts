import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

export const getPendingReply = internalQuery({
  args: { messageId: v.id("messages"), attempt: v.optional(v.number()) },
  returns: v.union(v.object({ threadId: v.string(), promptMessageId: v.string() }), v.null()),
  handler: async (ctx, { messageId, attempt = 1 }) => {
    const message = await ctx.db.get("messages", messageId);
    if (!message || (message.generationAttempt ?? 1) !== attempt || message.status !== "processing" || !message.promptMessageId) return null;
    const conversation = await ctx.db.get("conversations", message.conversationId);
    if (!conversation?.threadId || conversation.pendingMessageId !== messageId ||
        conversation.projectId !== message.projectId) return null;
    const project = await ctx.db.get("projects", conversation.projectId);
    if (!project) return null;
    return { threadId: conversation.threadId, promptMessageId: message.promptMessageId };
  },
});

export const finishReply = internalMutation({
  args: { messageId: v.id("messages"), content: v.string(), error: v.optional(v.string()), attempt: v.optional(v.number()) },
  returns: v.null(),
  handler: async (ctx, { messageId, content, error, attempt = 1 }) => {
    const message = await ctx.db.get("messages", messageId);
    if (!message || (message.generationAttempt ?? 1) !== attempt || message.status !== "processing") return null;
    const conversation = await ctx.db.get("conversations", message.conversationId);
    if (!conversation || conversation.pendingMessageId !== messageId ||
        conversation.projectId !== message.projectId) return null;
    await ctx.db.patch("messages", messageId, { content, status: error ? "failed" : "completed", error });
    const now = Date.now();
    await ctx.db.patch("conversations", conversation._id, { pendingMessageId: undefined, updatedAt: now });
    if (await ctx.db.get("projects", conversation.projectId)) {
      await ctx.db.patch("projects", conversation.projectId, { updatedAt: now });
    }
    return null;
  },
});
