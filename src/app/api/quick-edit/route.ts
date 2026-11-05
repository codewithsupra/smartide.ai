import { google } from "@ai-sdk/google";
import { APICallError, generateText, Output, RetryError } from "ai";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { quickEditRequestSchema, quickEditResponseSchema } from "@/features/editor/schemas/quick-edit";

const URL_REGEX = /https?:\/\/[^\s<>"']+/gi;

const QUICK_EDIT_PROMPT = `You are a code editing assistant. Edit the selected code based on the user's instruction.

<context>
<selected_code>
{selectedCode}
</selected_code>
<full_code_context>
{fullCode}
</full_code_context>
</context>

{documentation}

<instruction>
{instruction}
</instruction>

<instructions>
Return an object with an editedCode field containing only the edited version of the selected code.
Maintain the same indentation level as the original.
Do not include any explanations or comments unless requested.
If the instruction is unclear or cannot be applied, return the original code unchanged.
</instructions>`;

export async  function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    const payload = await request.text();
    if (payload.length > 1000000) {
      return NextResponse.json({ error: "Edit context too large" }, { status: 413 });
    }
    body = JSON.parse(payload);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = quickEditRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid quick-edit request" }, { status: 400 });
  }
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return NextResponse.json({ error: "Quick edit is unavailable" }, { status: 503 });
  }

  try {
    const context = { ...parsed.data };
    const urls = [...new Set(context.instruction.match(URL_REGEX) ?? [])].slice(0, 3);
    if (urls.length > 0 && process.env.FIRECRAWL_API_KEY) {
      const { firecrawl } = await import("@/lib/firecrawl");
      const pages = await Promise.allSettled(urls.map((url) =>
        firecrawl.scrape(url.replace(/[.,;!?]+$/, ""), { formats: ["markdown"] }),
      ));
      const scraped = pages.flatMap((page, index) =>
        page.status === "fulfilled" && page.value.markdown
          ? [`Source: ${urls[index]}\n${page.value.markdown.slice(0, 12000)}`]
          : [],
      );
      context.documentation = [context.documentation, ...scraped].filter(Boolean).join("\n\n");
    }

    if (request.signal.aborted) return new NextResponse(null, { status: 499 });
    const prompt = QUICK_EDIT_PROMPT.replace(
      /\{(selectedCode|fullCode|documentation|instruction)\}/g,
      (_match, key: keyof typeof context) => context[key],
    );
    const { output } = await generateText({
      model: google("gemini-3.1-flash-lite"),
      output: Output.object({ schema: quickEditResponseSchema }),
      prompt,
      maxOutputTokens: 8192,
      maxRetries: 2,
      abortSignal: request.signal,
    });

    return NextResponse.json(quickEditResponseSchema.parse(output));
  } catch (error) {
    if (request.signal.aborted) return new NextResponse(null, { status: 499 });
    const providerError = RetryError.isInstance(error) ? error.lastError : error;
    const providerStatus = APICallError.isInstance(providerError) ? providerError.statusCode : undefined;
    const status = providerStatus === 429 || providerStatus === 503 ? providerStatus : 502;
    return NextResponse.json({
      error: status === 503 ? "Quick-edit provider is temporarily busy. Try again shortly."
        : status === 429 ? "Quick-edit provider quota exceeded" : "Quick edit failed. Please try again.",
    }, { status });
  }
}
