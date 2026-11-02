import { generateDemoText, getConversationId } from "@/lib/ai-generation";

export async function POST(request: Request) {
  const conversationId = getConversationId(request.headers.get("x-conversation-id"));
  const { text } = await generateDemoText(
    "Write a vegetarian lasagna recipe for 4 people.",
    conversationId,
  );

  return Response.json({ text, conversationId });
}
