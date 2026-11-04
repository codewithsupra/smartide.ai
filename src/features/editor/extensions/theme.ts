import { EditorView } from "@codemirror/view";

export const customTheme = EditorView.theme({
    "&": {
        height: "100%",
        color: "var(--foreground)",
        backgroundColor: "var(--background)",
    },
    "&.cm-focused": {
        outline: "none",
    },
    ".cm-scroller": {
        overflow: "auto",
        fontFamily: "var(--font-plex-mono, ui-monospace), monospace",
        fontSize: "14px",
        lineHeight: "1.6",
    },
    ".cm-content": {
        padding: "12px 0",
        caretColor: "var(--foreground)",
    },
    ".cm-line": {
        padding: "0 12px",
    },
    ".cm-cursor, .cm-dropCursor": {
        borderLeftColor: "var(--foreground)",
    },
    ".cm-gutters": {
        backgroundColor: "var(--background)",
        color: "var(--muted-foreground)",
        border: "none",
    },
    ".cm-lineNumbers .cm-gutterElement": {
        minWidth: "36px",
        padding: "0 8px",
    },
    ".cm-activeLine, .cm-activeLineGutter": {
        backgroundColor: "var(--accent)",
    },
    ".cm-activeLineGutter": {
        color: "var(--foreground)",
    },
    "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": {
        backgroundColor: "color-mix(in srgb, var(--ring) 30%, transparent)",
    },
    ".cm-selectionMatch": {
        backgroundColor: "color-mix(in srgb, var(--ring) 18%, transparent)",
    },
    ".cm-searchMatch": {
        backgroundColor: "#eab30830",
        outline: "1px solid #eab30870",
    },
    ".cm-searchMatch.cm-searchMatch-selected": {
        backgroundColor: "#eab30860",
    },
    "&.cm-focused .cm-matchingBracket": {
        backgroundColor: "var(--accent)",
        outline: "1px solid var(--ring)",
    },
    "&.cm-focused .cm-nonmatchingBracket": {
        outline: "1px solid var(--destructive)",
    },
    ".cm-foldPlaceholder": {
        backgroundColor: "var(--muted)",
        border: "1px solid var(--border)",
        color: "var(--muted-foreground)",
    },
    ".cm-panels, .cm-tooltip": {
        backgroundColor: "var(--popover)",
        color: "var(--popover-foreground)",
        border: "1px solid var(--border)",
    },
    ".cm-tooltip-autocomplete > ul > li[aria-selected]": {
        backgroundColor: "var(--accent)",
        color: "var(--accent-foreground)",
    },
    ".cm-tooltip .cm-tooltip-arrow:after": {
        borderTopColor: "var(--popover)",
        borderBottomColor: "var(--popover)",
    },
    ".cm-minimap-gutter": {
        backgroundColor: "var(--background)",
        borderLeft: "1px solid var(--border)",
    },
    ".cm-minimap-gutter .cm-minimap-overlay": {
        background: "var(--muted-foreground)",
        opacity: "0.12",
    },
    ".cm-minimap-gutter .cm-minimap-overlay:hover": {
        opacity: "0.2",
    },
    ".cm-minimap-gutter .cm-minimap-box-shadow": {
        boxShadow: "none",
    },
}, { dark: true });
