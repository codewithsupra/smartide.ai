
import { EditorView, getPanel, keymap, showPanel, showTooltip, type Panel } from "@codemirror/view";
import { EditorState, Prec, StateEffect, StateField, type Extension } from "@codemirror/state";
import { isolateHistory } from "@codemirror/commands";
import { z } from "zod";
import { quickEditRequestSchema, quickEditResponseSchema } from "../../schemas/quick-edit";

const setQuickEditOpen = StateEffect.define<boolean>();
const errorSchema = z.object({ error: z.string() });

function createPanel(view: EditorView): Panel {
  const originalDocument = view.state.doc;
  const { from, to } = view.state.selection.main;
  const dom = document.createElement("form");
  dom.className = "cm-quick-edit";

  const label = document.createElement("label");
  label.textContent = "Quick edit";
  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Describe the change…";
  input.required = true;
  input.maxLength = 10000;
  label.appendChild(input);

  const apply = document.createElement("button");
  apply.type = "submit";
  apply.textContent = "Apply";
  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.textContent = "Cancel";
  const status = document.createElement("p");
  status.setAttribute("role", "status");
  dom.append(label, apply, cancel, status);

  let controller: AbortController | null = null;
  let destroyed = false;
  let invalidated = false;

  const close = () => {
    view.dispatch({ effects: setQuickEditOpen.of(false) });
    view.focus();
  };
  cancel.addEventListener("click", close);
  dom.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close();
    }
  });

  dom.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (controller || invalidated || destroyed) return;
    const request = quickEditRequestSchema.safeParse({
      selectedCode: originalDocument.sliceString(from, to),
      fullCode: originalDocument.toString(),
      instruction: input.value,
    });
    if (!request.success) {
      status.setAttribute("role", "alert");
      status.textContent = request.error.issues[0]?.message ?? "Enter an instruction.";
      return;
    }

    const currentRequest = new AbortController();
    controller = currentRequest;
    apply.disabled = input.disabled = true;
    status.setAttribute("role", "status");
    status.textContent = "Editing…";

    try {
      const response = await fetch("/api/quick-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: currentRequest.signal,
        body: JSON.stringify(request.data),
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        const error = errorSchema.safeParse(body);
        throw new Error(error.success ? error.data.error : "Quick edit failed. Please try again.");
      }
      const result = quickEditResponseSchema.safeParse(body);
      if (!result.success) throw new Error("The provider returned an invalid edit. Please try again.");
      if (destroyed || currentRequest.signal.aborted || view.state.doc !== originalDocument) return;

      view.dispatch({
        changes: { from, to, insert: result.data.editedCode },
        selection: { anchor: from + result.data.editedCode.length },
        effects: setQuickEditOpen.of(false),
        userEvent: "input.complete",
        annotations: isolateHistory.of("full"),
        scrollIntoView: true,
      });
      view.focus();
    } catch (error) {
      if (!destroyed && !currentRequest.signal.aborted) {
        status.setAttribute("role", "alert");
        status.textContent = error instanceof Error ? error.message : "Quick edit failed. Please try again.";
      }
    } finally {
      if (controller === currentRequest) controller = null;
      if (!destroyed && !invalidated) apply.disabled = input.disabled = false;
    }
  });

  return {
    dom,
    top: true,
    mount() { input.focus(); },
    update(update) {
      if (update.docChanged && update.state.field(quickEditOpen, false)) {
        invalidated = true;
        controller?.abort();
        apply.disabled = input.disabled = true;
        status.setAttribute("role", "alert");
        status.textContent = "Code changed. Close and reopen quick edit to continue.";
      }
    },
    destroy() {
      destroyed = true;
      controller?.abort();
    },
  };
}

const quickEditOpen = StateField.define<boolean>({
  create: () => false,
  update(value, transaction) {
    for (const effect of transaction.effects) {
      if (effect.is(setQuickEditOpen)) value = effect.value;
    }
    return value;
  },
  provide: (field) => showPanel.from(field, (open) => open ? createPanel : null),
});

function openQuickEdit(view: EditorView) {
  if (view.state.readOnly || view.state.selection.ranges.length !== 1) return false;
  const panel = getPanel(view, createPanel);
  if (panel) panel.dom.querySelector("input")?.focus();
  else view.dispatch({ effects: setQuickEditOpen.of(true) });
  return true;
}

const selectionPopup = showTooltip.compute(
  ["selection", "doc", quickEditOpen, EditorState.readOnly],
  (state) => {
    const selection = state.selection.main;
    if (state.readOnly || state.field(quickEditOpen) || selection.empty ||
        state.selection.ranges.length !== 1 || !state.sliceDoc(selection.from, selection.to).trim()) {
      return null;
    }

    return {
      pos: selection.from,
      end: selection.to,
      above: true,
      create(view) {
        const dom = document.createElement("div");
        dom.className = "cm-selection-quick-edit";
        dom.setAttribute("role", "toolbar");
        dom.setAttribute("aria-label", "Selected code actions");
        const label = document.createElement("span");
        label.textContent = "Want to change this code?";
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = "Edit with AI";
        button.addEventListener("mousedown", (event) => event.preventDefault());
        button.addEventListener("click", () => openQuickEdit(view));
        dom.append(label, button);
        return { dom, offset: { x: 0, y: 6 } };
      },
    };
  },
);

export const quickEdit = (): Extension => [
  quickEditOpen,
  selectionPopup,
  Prec.highest(keymap.of([{
    key: "Mod-k",
    run: openQuickEdit,
  }])),
  EditorView.baseTheme({
    ".cm-tooltip.cm-selection-quick-edit": {
      display: "flex", alignItems: "center", gap: "10px", padding: "6px 8px",
      borderRadius: "6px", border: "1px solid var(--border)",
      backgroundColor: "var(--popover)", color: "var(--popover-foreground)",
      fontFamily: "var(--font-sans, sans-serif)", fontSize: "12px",
      boxShadow: "0 4px 16px #0003",
    },
    ".cm-selection-quick-edit span": { color: "var(--muted-foreground)" },
    ".cm-selection-quick-edit button": {
      padding: "4px 8px", borderRadius: "4px", border: "1px solid var(--border)",
      backgroundColor: "var(--accent)", color: "var(--accent-foreground)",
      fontWeight: "500", cursor: "pointer", whiteSpace: "nowrap",
    },
    ".cm-selection-quick-edit button:hover": { backgroundColor: "var(--sidebar-accent)" },
    ".cm-selection-quick-edit button:focus-visible": { outline: "2px solid var(--ring)", outlineOffset: "2px" },
    ".cm-quick-edit": {
      display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px", padding: "12px",
      backgroundColor: "var(--sidebar)", color: "var(--foreground)", fontSize: "12px",
    },
    ".cm-quick-edit label": { display: "flex", flex: "1", alignItems: "center", gap: "8px", minWidth: "180px" },
    ".cm-quick-edit input": {
      flex: "1", minWidth: "0", padding: "6px 8px", borderRadius: "4px",
      border: "1px solid var(--border)", backgroundColor: "var(--background)", color: "var(--foreground)",
    },
    ".cm-quick-edit button": {
      padding: "6px 10px", border: "1px solid var(--border)", borderRadius: "4px",
      backgroundColor: "var(--accent)", color: "var(--foreground)", cursor: "pointer",
    },
    ".cm-quick-edit button:disabled": { opacity: "0.5", cursor: "wait" },
    ".cm-quick-edit input:focus-visible, .cm-quick-edit button:focus-visible": { outline: "2px solid var(--ring)", outlineOffset: "2px" },
    ".cm-quick-edit p": { flexBasis: "100%", margin: "0", color: "var(--muted-foreground)" },
    '.cm-quick-edit p[role="alert"]': { color: "var(--destructive)" },
  }),
];
