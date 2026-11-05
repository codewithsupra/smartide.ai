import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
  keymap,
} from "@codemirror/view";
import { Prec, StateEffect, StateField, type Extension } from "@codemirror/state";
import { createRequestPlugin } from "./request-plugin";

export const setSuggestionEffect = StateEffect.define<string | null>();

export const suggestionState = StateField.define<string | null>({
  create: () => null,
  update(value, transaction) {
    if (transaction.docChanged || transaction.selection) value = null;
    for (const effect of transaction.effects) {
      if (effect.is(setSuggestionEffect)) value = effect.value;
    }
    return value;
  },
});

class SuggestionWidget extends WidgetType {
  constructor(private readonly text: string) {
    super();
  }

  eq(other: SuggestionWidget) {
    return this.text === other.text;
  }

  toDOM() {
    const span = document.createElement("span");
    span.className = "cm-inline-suggestion";
    span.textContent = this.text;
    span.setAttribute("aria-hidden", "true");
    return span;
  }

  ignoreEvent() {
    return true;
  }
}

const renderPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = this.build(view);
    }

    build(view: EditorView) {
      const text = view.state.field(suggestionState);
      const selection = view.state.selection.main;
      if (!text || !selection.empty || view.state.selection.ranges.length !== 1) return Decoration.none;

      return Decoration.set([
        Decoration.widget({ widget: new SuggestionWidget(text), side: 1 })
          .range(selection.head),
      ]);
    }

    update(update: ViewUpdate) {
      if (
        update.docChanged ||
        update.selectionSet ||
        update.startState.field(suggestionState) !== update.state.field(suggestionState)
      ) {
        this.decorations = this.build(update.view);
      }
    }
  },
  { decorations: (plugin) => plugin.decorations },
);

const suggestionKeymap = keymap.of([
  {
    key: "Tab",
    run(view) {
      const text = view.state.field(suggestionState);
      const selection = view.state.selection;
      if (!text || !selection.main.empty || selection.ranges.length !== 1) return false;

      const cursor = selection.main.head;
      view.dispatch({
        changes: { from: cursor, insert: text },
        selection: { anchor: cursor + text.length },
        effects: setSuggestionEffect.of(null),
        userEvent: "input.complete",
        scrollIntoView: true,
      });
      return true;
    },
  },
  {
    key: "Escape",
    run(view) {
      const hasSuggestion = !!view.state.field(suggestionState);
      view.dispatch({ effects: setSuggestionEffect.of(null) });
      return hasSuggestion;
    },
  },
]);

export const suggestion = (fileName = "untitled.txt"): Extension => [
  suggestionState,
  renderPlugin,
  Prec.highest(suggestionKeymap),
  createRequestPlugin(fileName, setSuggestionEffect),
  EditorView.baseTheme({
    ".cm-inline-suggestion": {
      color: "var(--muted-foreground, #888)",
      opacity: "0.65",
      whiteSpace: "pre",
      pointerEvents: "none",
      userSelect: "none",
    },
  }),
];
