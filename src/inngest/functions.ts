// src/inngest/functions.ts
import { NonRetriableError } from "inngest";
import { inngest } from "./client";
import { generateDemoText, getConversationId } from "@/lib/ai-generation";
import { firecrawl } from "@/lib/firecrawl";

const URL_REGEX = /https?:\/\/[^\s<>"']+/gi;

export const demoGenerate = inngest.createFunction(
  { id: "demo-generate", triggers: { event: "demo/generate" } },
  async ({ step, event }) => {
    const prompt: unknown = event.data?.prompt;
    if (typeof prompt !== "string" || !prompt.trim()) {
      throw new NonRetriableError("A nonempty prompt is required.");
    }

    // Persist the ID so retries and durable step replays use the same conversation.
    const conversationId = await step.run("conversation-id", async () =>
      getConversationId(event.data?.conversationId),
    );

    const urls = await step.run("extract-urls", async () => {
      const matches = prompt.match(URL_REGEX) ?? [];
      return [...new Set(matches.map((match) => {
        let url = match.replace(/[.,;:!?\]}]+$/, "");
        // Preserve balanced parentheses within URLs, e.g. Wikipedia links.
        while (
          url.endsWith(")") &&
          (url.match(/\)/g)?.length ?? 0) > (url.match(/\(/g)?.length ?? 0)
        ) {
          url = url.slice(0, -1).replace(/[.,;:!?\]}]+$/, "");
        }
        return url;
      }))];
    });

    const results = await Promise.all(
      urls.map((url, index) =>
        step.run(`scrape-url-${index}`, async () => {
          const doc = await firecrawl.scrape(url, { formats: ["markdown"] });
          return doc.markdown ? { url, text: doc.markdown } : null;
        }),
      ),
    );
    const scrapedContent = results.filter((result) => result !== null);

    const context = scrapedContent
      .map(({ url, text }) => `Source: ${url}\n${text}`)
      .join("\n\n---\n\n");

    const text = await step.run("generate-text", async () => {
      const { text } = await generateDemoText(
        context
          ? `${prompt}\n\nUse the following scraped page content as context:\n\n${context}`
          : prompt,
        conversationId,
      );
      return text;
    });

    return { text };
  },
);

export const demoError = inngest.createFunction(
  { id: "demo-error", triggers: { event: "demo/error" } },
  async ({ event,step}) => {
    const message: unknown = event.data?.message;
     await step.run("throw-error", async () => {
      if (typeof message !== "string" || !message.trim()) {
        throw new NonRetriableError("A nonempty message is required.");
      }
      throw new Error(message);
    });
  },
);
