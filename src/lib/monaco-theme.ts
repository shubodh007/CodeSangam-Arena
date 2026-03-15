import type { Monaco } from "@monaco-editor/react";

/**
 * Registers the "arena-dark" Monaco editor theme.
 * Must be called inside the editor's onMount handler BEFORE `editor.updateOptions({ theme: "arena-dark" })`.
 *
 * Colors are derived from CodeArena's HSL design tokens:
 *   --background:   220 14%  7%   → #0d1117
 *   --editor-bg:    220 14%  8%   → #0e1318
 *   --primary:      160 84% 39%   → #12c96e (emerald)
 *   --accent:       199 89% 48%   → #08b4e8 (cyan)
 */
export function defineArenaTheme(monaco: Monaco): void {
  monaco.editor.defineTheme("arena-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      // Comments — muted italic
      { token: "comment",         foreground: "546e7a", fontStyle: "italic" },
      { token: "comment.line",    foreground: "546e7a", fontStyle: "italic" },
      { token: "comment.block",   foreground: "546e7a", fontStyle: "italic" },

      // Keywords — purple
      { token: "keyword",         foreground: "c792ea" },
      { token: "keyword.control", foreground: "c792ea" },
      { token: "storage",         foreground: "c792ea" },

      // Strings — soft green
      { token: "string",          foreground: "c3e88d" },
      { token: "string.escape",   foreground: "f78c6c" },

      // Numbers — orange
      { token: "number",          foreground: "f78c6c" },
      { token: "number.hex",      foreground: "f78c6c" },

      // Types / Classes — golden yellow
      { token: "type",            foreground: "ffcb6b" },
      { token: "class",           foreground: "ffcb6b" },
      { token: "struct",          foreground: "ffcb6b" },

      // Functions — blue
      { token: "function",        foreground: "82aaff" },
      { token: "method",          foreground: "82aaff" },

      // Variables — light
      { token: "variable",        foreground: "eeffff" },
      { token: "parameter",       foreground: "eeffff", fontStyle: "italic" },

      // Operators / Delimiters — cyan
      { token: "operator",        foreground: "89ddff" },
      { token: "delimiter",       foreground: "89ddff" },
      { token: "delimiter.bracket", foreground: "89ddff" },

      // Constants / builtins
      { token: "constant",        foreground: "f78c6c" },
      { token: "boolean",         foreground: "f78c6c" },

      // Punctuation
      { token: "punctuation",     foreground: "8892a4" },

      // Annotations / Decorators
      { token: "annotation",      foreground: "ffcb6b", fontStyle: "italic" },
    ],
    colors: {
      // Base surfaces
      "editor.background":              "#0e1318",
      "editor.foreground":              "#eeffff",
      "editorGutter.background":        "#0b1016",

      // Active line & selections
      "editor.lineHighlightBackground": "#1a2030",
      "editor.lineHighlightBorder":     "#00000000",
      "editor.selectionBackground":     "#08b4e840",
      "editor.inactiveSelectionBackground": "#08b4e820",
      "editor.wordHighlightBackground": "#08b4e825",

      // Cursor
      "editorCursor.foreground":        "#12c96e",
      "editorCursor.background":        "#0e1318",

      // Line numbers
      "editorLineNumber.foreground":       "#3d4f5e",
      "editorLineNumber.activeForeground": "#12c96e",

      // Indent guides
      "editorIndentGuide.background":       "#1e2a38",
      "editorIndentGuide.activeBackground": "#2e3d50",

      // Bracket matching
      "editorBracketMatch.background": "#12c96e18",
      "editorBracketMatch.border":     "#12c96e",

      // Bracket pair colorization
      "editorBracketHighlight.foreground1": "#12c96e",
      "editorBracketHighlight.foreground2": "#08b4e8",
      "editorBracketHighlight.foreground3": "#ffcb6b",

      // Whitespace
      "editorWhitespace.foreground": "#1e2a38",

      // Scrollbar
      "scrollbar.shadow":                    "#00000000",
      "scrollbarSlider.background":          "#ffffff12",
      "scrollbarSlider.hoverBackground":     "#ffffff22",
      "scrollbarSlider.activeBackground":    "#ffffff30",

      // Minimap
      "minimap.background":              "#0b1016",
      "minimap.selectionHighlight":      "#08b4e840",

      // Overlays
      "editorOverviewRuler.border":         "#00000000",
      "editorOverviewRuler.selectionHighlight": "#08b4e850",
      "editorOverviewRuler.wordHighlight":  "#08b4e840",

      // Find widget
      "editor.findMatchBackground":           "#f78c6c40",
      "editor.findMatchHighlightBackground":  "#f78c6c25",
      "editor.findMatchBorder":               "#f78c6c",
      "editor.findMatchHighlightBorder":      "#f78c6c50",

      // Error / Warning squiggles (keep distinct from code)
      "editorError.foreground":   "#ff5370",
      "editorWarning.foreground": "#ffcb6b",
      "editorInfo.foreground":    "#08b4e8",
    },
  });
}
