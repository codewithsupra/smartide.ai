import * as Sentry from "@sentry/nextjs";
import { generateText } from "ai";
import { google } from "@ai-sdk/google";

export function getConversationId(value: unknown): string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(value)
    ? value
    : crypto.randomUUID();
}

export function generateDemoText(prompt: string, conversationId: string) {
  // Isolate concurrent jobs so one conversation cannot inherit another's ID.
  return Sentry.withIsolationScope(() => {
    Sentry.setConversationId(conversationId);
    // Sentry 11 instruments AI SDK 7 automatically when tracing is enabled.
    return generateText({
      model: google("gemini-3.1-flash-lite"),
      prompt,
    });
  });
}
