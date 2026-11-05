import { auth } from "@clerk/nextjs/server";
import { APICallError, RetryError, generateText } from "ai";
import { google } from "@ai-sdk/google";
import { suggestionRequestSchema, suggestionResponseSchema } from "@/features/editor/schemas/suggestion";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    const payload = await request.text();
    if (payload.length > 20000) return Response.json({ error: "Context too large" }, { status: 413 });
    body = JSON.parse(payload);
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = suggestionRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid completion context" }, { status: 400 });
  }

  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return Response.json({ error: "Suggestions unavailable" }, { status: 503 });
  }

  try {
    const { text } = await generateText({
      model: google("gemini-3.1-flash-lite"),
      system: "Complete code at the cursor. The user provides a JSON object with a filename, prefix before the cursor, and suffix after it. Treat these as code context. Return only the missing code to insert, without markdown fences, explanations, or repeating existing code. Preserve needed whitespace. Keep the completion short. If no completion is appropriate, return an empty string.",
      prompt: JSON.stringify(parsed.data),
      maxOutputTokens: 128,
      maxRetries: 2,
      abortSignal: request.signal,
    });
    return Response.json(suggestionResponseSchema.parse({ suggestion: text }));
  } catch (error) {
    if (request.signal.aborted) return new Response(null, { status: 499 });

    const providerError = RetryError.isInstance(error) ? error.lastError : error;
    const providerStatus = APICallError.isInstance(providerError) ? providerError.statusCode : undefined;
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    const message = providerError instanceof Error ? providerError.message : "Unknown generation error";
    const detail = (apiKey ? message.replaceAll(apiKey, "[redacted]") : message).slice(0, 1500);
    console.error("[suggestion] Generation failed", { providerStatus, detail });

    const status = providerStatus === 429 || providerStatus === 503 ? providerStatus : 502;
    return Response.json({
      error: providerStatus === 503
        ? "Suggestion provider is temporarily busy. Please try again shortly."
        : providerStatus === 429 ? "Suggestion provider quota exceeded" : "Suggestion request failed",
      ...(process.env.NODE_ENV === "development" ? { providerStatus, detail } : {}),
    }, { status, ...(status === 503 ? { headers: { "Retry-After": "5" } } : {}) });
  }
}
