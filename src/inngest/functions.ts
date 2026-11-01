// src/inngest/functions.ts
import { generateText } from "ai";
import { inngest } from "./client";
import { google } from "@ai-sdk/google";

export const demoGenerate = inngest.createFunction(
  { id: "demo-generate", triggers: { event: "demo/generate" } },
  async ({ step }) => {
    const text = await step.run("generate-text", async () => {
      const { text } = await generateText({
        model: google("gemini-3.1-flash-lite"),
        prompt: "Write a vegetarian lasagna recipe for 4 people.",
      });
      return text;
    });

    return { text };
  }
);
