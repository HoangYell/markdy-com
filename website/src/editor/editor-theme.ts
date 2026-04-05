/**
 * CodeMirror 6 editor themes for MarkdyScript playground.
 * Provides light and dark themes matching the website design system.
 */

import { EditorView } from "@codemirror/view";

/* ── Shared base styles ────────────────────────────────────────────── */

const baseTheme = EditorView.baseTheme({
  "&": {
    fontSize: "0.82rem",
    flex: "1",
  },
  ".cm-content": {
    fontFamily: '"SF Mono", "Fira Code", "Cascadia Code", "Consolas", monospace',
    lineHeight: "1.7",
    padding: "1.1rem",
    caretColor: "var(--cm-caret)",
  },
  ".cm-gutters": {
    border: "none",
    paddingLeft: "0.5rem",
  },
  ".cm-lineNumbers .cm-gutterElement": {
    fontSize: "0.72rem",
    minWidth: "2.2em",
    padding: "0 0.4rem 0 0",
    opacity: "0.5",
  },
  ".cm-scroller": {
    overflow: "auto",
  },
  ".cm-activeLine": {
    backgroundColor: "var(--cm-activeLine) !important",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "var(--cm-activeLine) !important",
  },
  ".cm-selectionMatch": {
    backgroundColor: "var(--cm-selection) !important",
  },
  "&.cm-focused .cm-selectionBackground, ::selection": {
    backgroundColor: "var(--cm-selection) !important",
  },
  ".cm-cursor": {
    borderLeftColor: "var(--cm-caret)",
    borderLeftWidth: "2px",
  },
  ".cm-tooltip": {
    border: "1px solid var(--cm-tooltipBorder)",
    backgroundColor: "var(--cm-tooltipBg)",
    borderRadius: "8px",
    boxShadow: "0 4px 16px var(--cm-tooltipShadow)",
    overflow: "hidden",
  },
  ".cm-tooltip-autocomplete": {
    "& > ul": {
      fontFamily: '"SF Mono", "Fira Code", monospace',
      fontSize: "0.78rem",
      maxHeight: "240px",
    },
    "& > ul > li": {
      padding: "4px 10px",
    },
    "& > ul > li[aria-selected]": {
      backgroundColor: "var(--cm-tooltipSelected)",
      color: "var(--cm-tooltipSelectedText)",
    },
  },
  ".cm-completionLabel": {
    fontWeight: "500",
  },
  ".cm-completionDetail": {
    marginLeft: "0.6em",
    fontStyle: "normal",
    opacity: "0.6",
  },
  ".cm-tooltip.cm-completionInfo": {
    padding: "6px 10px",
    fontSize: "0.75rem",
    fontFamily: '"SF Mono", "Fira Code", monospace',
    maxWidth: "320px",
  },
});

/* ── Light theme ───────────────────────────────────────────────────── */

const lightTheme = EditorView.theme({
  "&": {
    backgroundColor: "#ffffff",
    color: "#24292f",
  },
  ".cm-gutters": {
    backgroundColor: "#f6f8fa",
    color: "#8c959f",
  },
}, { dark: false });

/* ── Dark theme ────────────────────────────────────────────────────── */

const darkTheme = EditorView.theme({
  "&": {
    backgroundColor: "#0d1117",
    color: "#c9d1d9",
  },
  ".cm-gutters": {
    backgroundColor: "#0d1117",
    color: "#484f58",
  },
}, { dark: true });

export { baseTheme, lightTheme, darkTheme };
