// SPDX-License-Identifier: Apache-2.0

/**
 * Color themes for the REPL.
 * Inspired by Vibe's theme system.
 */

import type { BoxProps, TextProps } from "ink";

export type ThemeName = "dark" | "light" | "dracula" | "solarized";

export interface ReplTheme {
  name: ThemeName;
  // Border and background
  borderColor: string;
  backgroundColor?: string;
  
  // Text colors
  textPrimary: string;
  textSecondary: string;
  textDim: string;
  
  // Status colors
  success: string;
  warning: string;
  error: string;
  info: string;
  
  // Syntax highlighting
  codeBackground?: string;
  keyword: string;
  string: string;
  number: string;
  comment: string;
  function: string;
  
  // UI elements
  otterColor: string;
  promptColor: string;
  tierColor: Record<string, string>;
}

export const THEMES: Record<ThemeName, ReplTheme> = {
  dark: {
    name: "dark",
    borderColor: "gray",
    textPrimary: "white",
    textSecondary: "gray",
    textDim: "dim",
    success: "green",
    warning: "yellow",
    error: "red",
    info: "cyan",
    otterColor: "cyan",
    promptColor: "cyan",
    tierColor: {
      cheap: "green",
      balanced: "yellow",
      premium: "red"
    },
    keyword: "magenta",
    string: "green",
    number: "yellow",
    comment: "gray",
    function: "cyan"
  },
  light: {
    name: "light",
    borderColor: "gray",
    backgroundColor: "white",
    textPrimary: "black",
    textSecondary: "gray",
    textDim: "dim",
    success: "green",
    warning: "yellow",
    error: "red",
    info: "blue",
    otterColor: "blue",
    promptColor: "blue",
    tierColor: {
      cheap: "green",
      balanced: "yellow",
      premium: "red"
    },
    keyword: "purple",
    string: "green",
    number: "orange",
    comment: "gray",
    function: "blue"
  },
  dracula: {
    name: "dracula",
    borderColor: "magenta",
    textPrimary: "white",
    textSecondary: "gray",
    textDim: "dim",
    success: "green",
    warning: "yellow",
    error: "red",
    info: "purple",
    otterColor: "purple",
    promptColor: "purple",
    tierColor: {
      cheap: "#50fa7b",
      balanced: "#ffb86c",
      premium: "#ff5555"
    },
    codeBackground: "#282a36",
    keyword: "#ff79c6",
    string: "#f1fa8c",
    number: "#bd93f9",
    comment: "#6272a4",
    function: "#8be9fd"
  },
  solarized: {
    name: "solarized",
    borderColor: "blue",
    textPrimary: "#839496",
    textSecondary: "#586e75",
    textDim: "#93a1a1",
    success: "#859900",
    warning: "#b58900",
    error: "#dc322f",
    info: "#268bd2",
    otterColor: "#268bd2",
    promptColor: "#268bd2",
    tierColor: {
      cheap: "#859900",
      balanced: "#b58900",
      premium: "#dc322f"
    },
    keyword: "#b58900",
    string: "#2aa198",
    number: "#d33682",
    comment: "#839496",
    function: "#268bd2"
  }
};

// Default theme
const DEFAULT_THEME_NAME: ThemeName = "dark";

// Get or set the current theme
let currentThemeName: ThemeName = DEFAULT_THEME_NAME;

export function getCurrentTheme(): ReplTheme {
  return THEMES[currentThemeName];
}

export function setCurrentTheme(name: ThemeName): void {
  if (THEMES[name]) {
    currentThemeName = name;
  }
}

export function getThemeNames(): ThemeName[] {
  return Object.keys(THEMES) as ThemeName[];
}

export function cycleTheme(): ThemeName {
  const themes = getThemeNames();
  const currentIndex = themes.indexOf(currentThemeName);
  const nextIndex = (currentIndex + 1) % themes.length;
  currentThemeName = themes[nextIndex];
  return currentThemeName;
}

/**
 * Apply syntax highlighting to code blocks in text.
 * Simple regex-based highlighting for common patterns.
 */
export function highlightCode(text: string, theme: ReplTheme = getCurrentTheme()): string {
  // Match code blocks (```...```) or inline code (`...`)
  // This is a simplified version - for full highlighting, use a proper parser
  
  // For now, just return the text as-is
  // A full implementation would use a syntax highlighter library
  return text;
}

/**
 * Format a code block with syntax highlighting.
 */
export function formatCodeBlock(code: string, language?: string, theme: ReplTheme = getCurrentTheme()): string {
  // Simple highlighting based on file extension
  const highlighted = applySimpleHighlighting(code, language, theme);
  return highlighted;
}

function applySimpleHighlighting(code: string, language?: string, theme: ReplTheme): string {
  if (!language) {
    // Try to detect language from code
    language = detectLanguage(code);
  }
  
  // Apply language-specific highlighting
  switch (language) {
    case "js":
    case "javascript":
    case "ts":
    case "typescript":
      return highlightJavaScript(code, theme);
    case "py":
    case "python":
      return highlightPython(code, theme);
    case "json":
      return highlightJson(code, theme);
    case "sh":
    case "bash":
      return highlightBash(code, theme);
    case "md":
    case "markdown":
      return highlightMarkdown(code, theme);
    default:
      return code;
  }
}

function detectLanguage(code: string): string | undefined {
  const firstLine = code.split("\n")[0];
  
  // Check for shebang
  if (firstLine.startsWith("#!/bin/bash") || firstLine.startsWith("#!/bin/sh") || firstLine.startsWith("#!/usr/bin/env bash")) {
    return "bash";
  }
  
  // Check for common patterns
  if (code.includes("import ") && code.includes("from") || code.includes("export ")) {
    return "js";
  }
  if (code.includes("def ") || code.includes("import ") && code.includes(":")) {
    return "py";
  }
  if (code.trim().startsWith("{") || code.trim().startsWith("[")) {
    return "json";
  }
  
  return undefined;
}

function highlightJavaScript(code: string, theme: ReplTheme): string {
  // Simple regex-based highlighting for JavaScript/TypeScript
  return code
    .replace(/\b(function|const|let|var|class|interface|type|export|import|if|else|for|while|return|async|await|try|catch|finally|throw|new|delete|typeof|instanceof|void|this)\b/g, (m) => ansiColor(m, theme.keyword))
    .replace(/\b(null|undefined|true|false|NaN|Infinity)\b/g, (m) => ansiColor(m, theme.keyword))
    .replace(/\b([0-9]+(\.[0-9]+)?)\b/g, (m) => ansiColor(m, theme.number))
    .replace(/("[^"]*"|'[^']*'|`[^`]*`)/g, (m) => ansiColor(m, theme.string))
    .replace(/\/\/[^/]*\/\//g, (m) => ansiColor(m, theme.comment))
    .replace(/\/\*[\s\S]*?\*\//g, (m) => ansiColor(m, theme.comment))
    .replace(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?=\()/g, (m) => ansiColor(m, theme.function));
}

function highlightPython(code: string, theme: ReplTheme): string {
  return code
    .replace(/\b(def|class|import|from|as|if|elif|else|for|while|return|try|except|finally|with|lambda|async|await|yield|pass|break|continue|raise|assert|global|nonlocal)\b/g, (m) => ansiColor(m, theme.keyword))
    .replace(/\b(None|True|False)\b/g, (m) => ansiColor(m, theme.keyword))
    .replace(/\b([0-9]+(\.[0-9]+)?)\b/g, (m) => ansiColor(m, theme.number))
    .replace(/("[^"]*"|'[^']*'|`[^`]*`)/g, (m) => ansiColor(m, theme.string))
    .replace(/#.*$/gm, (m) => ansiColor(m, theme.comment));
}

function highlightJson(code: string, theme: ReplTheme): string {
  return code
    .replace(/\b(true|false|null)\b/g, (m) => ansiColor(m, theme.keyword))
    .replace(/\b([0-9]+(\.[0-9]+)?)\b/g, (m) => ansiColor(m, theme.number))
    .replace(/("[^"]*"|'[^']*')/g, (m) => {
      // Check if it's a key (before colon)
      if (/"[^"]*":/.test(m + code.slice(code.indexOf(m) + m.length, code.indexOf(m) + m.length + 1))) {
        return ansiColor(m, theme.keyword);
      }
      return ansiColor(m, theme.string);
    });
}

function highlightBash(code: string, theme: ReplTheme): string {
  return code
    .replace(/\b(if|then|else|elif|fi|for|while|do|done|case|esac|function|return|export|alias|source|echo|cd|pwd|ls|cat|grep|sed|awk|mkdir|rm|cp|mv|chmod|chown|sudo)\b/g, (m) => ansiColor(m, theme.keyword))
    .replace(/\b([0-9]+(\.[0-9]+)?)\b/g, (m) => ansiColor(m, theme.number))
    .replace(/("[^"]*"|'[^']*')/g, (m) => ansiColor(m, theme.string))
    .replace(/#.*$/gm, (m) => ansiColor(m, theme.comment));
}

function highlightMarkdown(code: string, theme: ReplTheme): string {
  return code
    .replace(/^#{1,6}\s+/gm, (m) => ansiColor(m, theme.keyword))
    .replace(/`([^`]+)`/g, (m) => ansiColor(m, theme.string))
    .replace(/\*\*([^*]+)\*\*/g, (m) => ansiColor(m, theme.keyword))
    .replace(/\*([^*]+)\*/g, (m) => ansiColor(m, theme.string))
    .replace(/__([^_]+)__/g, (m) => ansiColor(m, theme.keyword))
    .replace(/_([^_]+)_/g, (m) => ansiColor(m, theme.string));
}

/**
 * Wrap text in ANSI color codes.
 * This is a simple implementation - in a real terminal, Ink handles colors differently.
 * For Ink, we return a special marker that can be processed later.
 */
function ansiColor(text: string, color: string): string {
  // For now, just return the text as-is
  // In a full implementation, we'd use Ink's Text component with color prop
  return text;
}
