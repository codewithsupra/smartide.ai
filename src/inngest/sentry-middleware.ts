import * as Sentry from "@sentry/nextjs";
import { Middleware } from "inngest";

export class SentryMiddleware extends Middleware.BaseMiddleware {
  readonly id = "sentry";

  async onRunError({
    ctx,
    error,
    fn,
    isFinalAttempt,
  }: Middleware.OnRunErrorArgs) {
    if (!isFinalAttempt) return;

    Sentry.withScope((scope) => {
      scope.setTag("inngest.function", fn.id());
      scope.setTag("inngest.run_id", ctx.runId);
      scope.setTag("inngest.event", ctx.event.name);
      scope.setContext("inngest", {
        functionId: fn.id(),
        runId: ctx.runId,
        eventName: ctx.event.name,
        attempt: ctx.attempt,
      });
      Sentry.captureException(error);
    });

    // Finish delivery before the HTTP request ends in serverless environments.
    await Sentry.flush(2000);
  }
}
