import { ViewPlugin, type EditorView, type ViewUpdate } from "@codemirror/view";
import type { StateEffectType } from "@codemirror/state";
import { suggestionErrorSchema, suggestionResponseSchema } from "../../schemas/suggestion";

export const createRequestPlugin = (
  fileName: string,
  setSuggestion: StateEffectType<string | null>,
) => ViewPlugin.fromClass(class {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private controller: AbortController | null = null;

  constructor(private view: EditorView) {}

  update(update: ViewUpdate) {
    const dismissed = update.transactions.some((transaction) =>
      transaction.effects.some((effect) => effect.is(setSuggestion) && effect.value === null),
    );
    if (update.docChanged || update.selectionSet || dismissed || !update.view.hasFocus) {
      this.cancel();
    }

    const typed = update.transactions.some((transaction) =>
      transaction.isUserEvent("input") && !transaction.isUserEvent("input.complete"),
    );
    const selection = update.state.selection;
    if (update.docChanged && typed && update.view.hasFocus &&
        selection.main.empty && selection.ranges.length === 1) {
      this.timer = setTimeout(() => { void this.request(); }, 400);
    }
  }

  private async request() {
    this.timer = null;
    const { doc, selection } = this.view.state;
    const cursor = selection.main.head;
    const controller = new AbortController();
    this.controller = controller;

    try {
      const response = await fetch("/api/suggestion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          fileName,
          prefix: doc.sliceString(Math.max(0, cursor - 10000), cursor),
          suffix: doc.sliceString(cursor, Math.min(doc.length, cursor + 3000)),
        }),
      });
      if (!response.ok) {
        if (process.env.NODE_ENV === "development") {
          const error = suggestionErrorSchema.safeParse(await response.json().catch(() => null));
          console.warn("[suggestion] API request failed", response.status,
            error.success ? error.data : response.statusText);
        }
        return;
      }
      const result = suggestionResponseSchema.safeParse(await response.json());

      // Never display a response for an outdated document or cursor position.
      if (controller.signal.aborted || !this.view.hasFocus ||
          this.view.state.doc !== doc || this.view.state.selection.main.head !== cursor) return;
      if (!result.success) return;

      this.view.dispatch({ effects: setSuggestion.of(result.data.suggestion || null) });
    } catch (error) {
      if (!controller.signal.aborted && process.env.NODE_ENV === "development") {
        console.warn("[suggestion] Request failed", error instanceof Error ? error.message : "Unknown error");
      }
    } finally {
      if (this.controller === controller) this.controller = null;
    }
  }

  private cancel() {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
    this.controller?.abort();
    this.controller = null;
  }

  destroy() {
    this.cancel();
  }
});
