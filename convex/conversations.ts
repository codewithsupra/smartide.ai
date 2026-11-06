import { ConvexError, v } from "convex/values";
import { verifyAuth } from "./auth";
import { mutation, query } from "./_generated/server";
import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import schema from "./schema";
import { createThread, saveMessage } from "@convex-dev/agent";
import { components, internal } from "./_generated/api";

const conversationValidator = v.object({
  ...schema.tables.conversations.validator.fields,
  _id: v.id("conversations"),
  _creationTime: v.number(),
});

const messageValidator = v.object({
  ...schema.tables.messages.validator.fields,
  _id: v.id("messages"),
  _creationTime: v.number(),
});

export const create = mutation({
  args: {
    projectId: v.id("projects"),
    title: v.optional(v.string()),
  },
  returns: v.id("conversations"),
  handler: async (ctx, { projectId, title }) => {
    const identity = await verifyAuth(ctx);
    const project = await ctx.db.get("projects", projectId);
    if (!project || project.ownerId !== identity.subject) {
      throw new ConvexError("Project not found.");
    }

    const conversationTitle = title?.trim() ?? "New conversation";
    if (!conversationTitle) {
      throw new ConvexError("Conversation title cannot be empty.");
    }

    const now = Date.now();
    const conversationId = await ctx.db.insert("conversations", {
      projectId,
      title: conversationTitle,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.patch("projects", projectId, { updatedAt: now });
    return conversationId;
  },
});
export const getById = query({
  args: { id: v.id("conversations") },
  returns: v.union(conversationValidator, v.null()),
  handler: async (ctx, { id }) => {
    const identity = await verifyAuth(ctx);
    const conversation = await ctx.db.get("conversations", id);
    if (!conversation) return null;

    const project = await ctx.db.get("projects", conversation.projectId);
    if (!project || project.ownerId !== identity.subject) return null;

    return conversation;
  },
});

export const getByProject = query({
  args: {
    projectId: v.id("projects"),
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(conversationValidator),
  handler: async (ctx, { projectId, paginationOpts }) => {
    const identity = await verifyAuth(ctx);
    const project = await ctx.db.get("projects", projectId);
    if (!project || project.ownerId !== identity.subject) {
      throw new ConvexError("Project not found.");
    }

    return await ctx.db
      .query("conversations")
      .withIndex("by_project", (q) => q.eq("projectId", projectId))
      .order("desc")
      .paginate(paginationOpts);
  },
});

export const getMessages = query({
  args: {
    conversationId: v.id("conversations"),
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(messageValidator),
  handler: async (ctx, { conversationId, paginationOpts }) => {
    const identity = await verifyAuth(ctx);
    const conversation = await ctx.db.get("conversations", conversationId);
    if (!conversation) {
      throw new ConvexError("Conversation not found.");
    }

    const project = await ctx.db.get("projects", conversation.projectId);
    if (!project || project.ownerId !== identity.subject) {
      throw new ConvexError("Conversation not found.");
    }

    return await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
      .order("desc")
      .paginate(paginationOpts);
  },
});

export const sendMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
    requestId: v.string(),
  },
  returns: v.id("messages"),
  handler: async (ctx, { conversationId, content, requestId }) => {
    const identity = await verifyAuth(ctx);
    const conversation = await ctx.db.get("conversations", conversationId);
    const project = conversation && await ctx.db.get("projects", conversation.projectId);
    if (!conversation || !project || project.ownerId !== identity.subject) {
      throw new ConvexError("Conversation not found.");
    }
    if (!content.trim() || content.length > 12000) {
      throw new ConvexError("Enter a message of at most 12,000 characters.");
    }
    if (!/^[a-zA-Z0-9_-]{1,100}$/.test(requestId)) throw new ConvexError("Invalid request ID.");

    const existing = await ctx.db.query("messages")
      .withIndex("by_conversation_request", (q) => q.eq("conversationId", conversationId).eq("requestId", requestId))
      .first();
    if (existing) return existing._id;
    if (conversation.pendingMessageId) {
      const pending = await ctx.db.get("messages", conversation.pendingMessageId);
      if (pending?.status === "processing") throw new ConvexError("Wait for the current reply to finish.");
    }

    let threadId = conversation.threadId;
    if (!threadId) {
      threadId = await createThread(ctx, components.agent, { userId: identity.subject, title: conversation.title });
      const history = await ctx.db.query("messages")
        .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId)).order("desc").take(40);
      for (const message of history.reverse()) {
        if (message.status !== "completed" || message.projectId !== conversation.projectId) continue;
        await saveMessage(ctx, components.agent, {
          threadId,
          message: { role: message.senderId === identity.subject ? "user" : "assistant", content: message.content },
        });
      }
    }

    const { messageId: promptMessageId } = await saveMessage(ctx, components.agent, {
      threadId, userId: identity.subject, message: { role: "user", content },
    });
    const now = Date.now();
    await ctx.db.insert("messages", {
      conversationId, projectId: conversation.projectId, senderId: identity.subject,
      content, status: "completed", createdAt: now,
    });
    const messageId = await ctx.db.insert("messages", {
      conversationId, projectId: conversation.projectId, senderId: "assistant",
      content: "", status: "processing", createdAt: now, requestId, promptMessageId, generationAttempt: 1,
    });
    await ctx.db.patch("conversations", conversationId, { threadId, pendingMessageId: messageId, updatedAt: now });
    await ctx.db.patch("projects", conversation.projectId, { updatedAt: now });
    await ctx.scheduler.runAfter(0, internal.chatDispatch.dispatch, { messageId, attempt: 1 });
    return messageId;
  },
});

export const retryMessage = mutation({
  args: { messageId: v.id("messages") },
  returns: v.null(),
  handler: async (ctx, { messageId }) => {
    const identity = await verifyAuth(ctx);
    const message = await ctx.db.get("messages", messageId);
    const conversation = message && await ctx.db.get("conversations", message.conversationId);
    const project = conversation && await ctx.db.get("projects", conversation.projectId);
    if (!message || !conversation || !project || project.ownerId !== identity.subject ||
        message.projectId !== conversation.projectId) throw new ConvexError("Message not found.");
    if (message.senderId !== "assistant" || message.status !== "failed" || !message.promptMessageId) {
      throw new ConvexError("This message cannot be retried.");
    }
    if (conversation.pendingMessageId) throw new ConvexError("Wait for the current reply to finish.");
    const latest = await ctx.db.query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", conversation._id)).order("desc").first();
    if (latest?._id !== messageId) throw new ConvexError("Only the latest failed reply can be retried.");

    const attempt = (message.generationAttempt ?? 1) + 1;
    await ctx.db.patch("messages", messageId, { status: "processing", error: undefined, generationAttempt: attempt });
    await ctx.db.patch("conversations", conversation._id, { pendingMessageId: messageId, updatedAt: Date.now() });
    await ctx.scheduler.runAfter(0, internal.chatDispatch.dispatch, { messageId, attempt });
    return null;
  },
});
