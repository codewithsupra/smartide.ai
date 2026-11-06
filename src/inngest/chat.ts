import { fetchAction } from "convex/nextjs";
import { NonRetriableError } from "inngest";
import { z } from "zod";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { inngest } from "./client";

export const chatReplyEventSchema = z.object({
  messageId: z.string().min(1).max(100),
  attempt: z.number().int().positive(),
});

function workerSecret() {
  const secret = process.env.CHAT_WORKER_SECRET;
  if (!secret || secret.length < 32) throw new NonRetriableError("Chat worker is not configured.");
  return secret;
}

export const chatReply = inngest.createFunction(
  {
    id: "chat-reply",
    triggers: { event: "chat/reply.requested" },
    retries: 3,
    idempotency: "event.data.messageId + ':' + string(event.data.attempt)",
    onFailure: async ({ event, step }) => {
      const parsed = chatReplyEventSchema.safeParse(event.data.event.data);
      if (!parsed.success) return;
      await step.run("mark-reply-failed", () => fetchAction(api.chat.failGeneration, {
        messageId: parsed.data.messageId as Id<"messages">,
        attempt: parsed.data.attempt,
        secret: workerSecret(),
      }));
    },
  },
  async ({ event, step }) => {
    const parsed = chatReplyEventSchema.safeParse(event.data);
    if (!parsed.success) throw new NonRetriableError("Invalid chat event.");
    await step.run("generate-and-save-reply", () => fetchAction(api.chat.runGeneration, {
      messageId: parsed.data.messageId as Id<"messages">,
      attempt: parsed.data.attempt,
      secret: workerSecret(),
    }));
    return { messageId: parsed.data.messageId };
  },
);
