// src/inngest/client.ts
import { Inngest } from "inngest";
import { SentryMiddleware } from "./sentry-middleware";

export const inngest = new Inngest({
  id: "smartide.ai",
  middleware: [SentryMiddleware],
});
