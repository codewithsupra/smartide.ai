import { generateText } from "ai";
import { google } from "@ai-sdk/google";

export async function POST() {
  const { text } = await generateText({
    model: google("gemini-3.1-flash-lite"),
    prompt: "Write a vegetarian lasagna recipe for 4 people.",
  });

  return Response.json({ text });
}
