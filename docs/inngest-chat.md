# Chat with Inngest

The flow is:

1. The browser calls `conversations.sendMessage` in Convex.
2. Convex atomically saves the user message, assistant placeholder, and scheduled dispatch.
3. `convex/chatDispatch.ts` sends `chat/reply.requested` to Inngest. The event contains only `messageId` and `attempt`.
4. `src/inngest/chat.ts` runs the protected Convex generation action inside an Inngest durable step. Inngest retries it up to three times after the first attempt.
5. The Convex Agent uses the saved thread history to call Gemini, then saves the reply. Convex subscriptions update the sidebar.
6. Inngest's `onFailure` marks the reply failed after retries are exhausted. Manual Retry reuses the prompt and increments the attempt number.

Inngest orchestrates the workflow. The model call and Agent history stay in Convex. No other chat API route is needed: the existing `/api/inngest` route serves the workflow.

## Environment variables

These are server-only values. Never prefix secrets with `NEXT_PUBLIC_` or commit them.

| Variable | Next.js server | Convex deployment |
| --- | --- | --- |
| `CHAT_WORKER_SECRET` | Required | Required, identical value |
| `INNGEST_EVENT_KEY` | Needed if Next.js also sends cloud events | Required for the dispatcher |
| `INNGEST_SIGNING_KEY` | Required for Inngest Cloud request verification | Not needed |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Existing editor routes use it | Required for chat generation |
| `NEXT_PUBLIC_CONVEX_URL` | Existing Convex URL, used by the workflow | Not needed |
| `INNGEST_EVENT_API_BASE_URL` | Not used by the chat worker | Optional publicly reachable Dev Server origin; omit for Inngest Cloud |

Generate a new worker secret with `openssl rand -hex 32`. Store that value as `CHAT_WORKER_SECRET` in both environments. Do not reuse a provider key as the worker secret. Keep the secret out of logs and screenshots.

Convex environment variables are separate from Next.js's `.env.local`. Configuring one does not configure the other. Use the Convex dashboard or `npx convex env set VARIABLE_NAME` and supply secrets through stdin. Confirm the target deployment before setting any values.

## Inngest Cloud

Configure an Inngest event key on Convex and the shared worker secret on both servers. Configure the Gemini key on Convex. Configure the signing key on Next.js and sync the reachable `/api/inngest` endpoint in Inngest. Disable `INNGEST_DEV` for the deployed Next.js server. The served function is named `chat-reply`.

## Local development

Run the existing Next.js and Convex development processes and an Inngest Dev Server pointed at `http://localhost:3000/api/inngest` (adjust the port if necessary).

Important: a hosted Convex action cannot access your computer's `localhost`. To receive its events in the local Dev Server, expose that Dev Server through a public HTTPS tunnel, set `INNGEST_EVENT_API_BASE_URL` on the Convex development deployment to the public origin, and set a development event-key value there. Keep Next.js connected to that same Dev Server. Otherwise use Inngest Cloud with a reachable Next.js endpoint.

The Convex sender explicitly selects its event destination instead of attempting localhost auto-discovery. A missing configuration or failed event delivery marks the message failed with a retry button.

## Verification

`npx vitest run tests/chat.test.ts tests/inngest-chat.test.ts` uses a mocked model and mocked event transport. It does not call Gemini or Inngest Cloud. It checks persistence, ownership, request deduplication, message history, event contents, worker authorization, dispatch failure, stale attempt protection, and the workflow's generation/failure handlers.

A successful mocked run proves application behavior, not connectivity to the configured services. After configuration and deployment, send a short message in the app and follow the `chat-reply` run in Inngest. Check that the assistant placeholder changes from `processing` to `completed`.
