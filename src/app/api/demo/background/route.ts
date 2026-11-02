import { inngest } from "@/inngest/client";
import { getConversationId } from "@/lib/ai-generation";

export async function POST(request: Request) {
  const conversationId = getConversationId(request.headers.get("x-conversation-id"));
  await inngest.send({
    name: "demo/generate",
    data: {
      prompt: "Write a vegetarian lasagna recipe for 4 people.",
      conversationId,
    },
  });

  return Response.json({ status: "Started", conversationId });
}
