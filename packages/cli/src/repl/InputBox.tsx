// SPDX-License-Identifier: Apache-2.0

/**
 * Custom input component for REPL with multiline support.
 * Features:
 * - Enter: Insert newline
 * - Ctrl+Enter: Submit
 * - Up/Down: History navigation
 * - Backspace/Delete: Edit text
 * - Left/Right: Move cursor
 * - Tab: Autocomplete
 */

import React, { useState, useCallback, useRef, useEffect } from "react";
import { Box, Text, useInput, useStdout } from "ink";
import type { ReplHistory } from "./history.js";

export interface InputBoxProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  history: ReplHistory;
  completions?: string[];
  selectedCompletionIndex?: number;
  onCompletionSelect?: (index: number) => void;
  mode?: ">";
}

// ANSI escape codes for cursor movement
// These are used to position the cursor correctly in multiline input
const CSI = "\x1b[";

/**
 * Get the display representation of the input with cursor.
 * For multiline input, we need to handle cursor positioning carefully.
 */
function getDisplayText(value: string, cursorPos: number, prompt: string): { lines: string[]; cursorLine: number; cursorCol: number } {
  const lines = value.split("\n");
  
  // Calculate which line and column the cursor is on
  let lineIndex = 0;
  let colIndex = 0;
  let pos = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const lineLength = lines[i].length;
    if (pos + lineLength >= cursorPos) {
      lineIndex = i;
      colIndex = cursorPos - pos;
      break;
    }
    pos += lineLength + 1; // +1 for newline
  }
  
  // Add prompt to first line
  const displayLines = lines.map((line, i) => {
    if (i === 0) return `${prompt}${line}`;
    return `  ${line}`; // Indent subsequent lines
  });
  
  return {
    lines: displayLines,
    cursorLine: lineIndex,
    cursorCol: colIndex + (lineIndex === 0 ? prompt.length : 2)
  };
}

/**
 * Calculate the position in the flat string from line/column.
 */
function getCursorPosition(lines: string[], lineIndex: number, colIndex: number, promptLength: number): number {
  let pos = 0;
  for (let i = 0; i < lineIndex; i++) {
    pos += lines[i].length + 1; // +1 for newline
  }
  pos += colIndex - (lineIndex === 0 ? promptLength : 0);
  return Math.max(0, Math.min(pos, lines.join("\n").length));
}

export function InputBox({
  value,
  onChange,
  onSubmit,
  placeholder = "",
  history,
  completions = [],
  selectedCompletionIndex = 0,
  onCompletionSelect,
  mode = ">"
}: InputBoxProps) {
  const { stdout } = useStdout();
  const [cursorPos, setCursorPos] = useState(0);
  const [navigatingHistory, setNavigatingHistory] = useState(false);
  const linesRef = useRef<string[]>([]);
  
  // Update lines ref when value changes
  useEffect(() => {
    linesRef.current = value.split("\n");
  }, [value]);

  // Calculate cursor line and column
  const { lines: displayLines, cursorLine, cursorCol } = getDisplayText(value, cursorPos, mode + " ");
  const promptLength = (mode + " ").length;

  // Handle keyboard input
  const handleKey = useCallback((ch: string, key: { name?: string; ctrl?: boolean; shift?: boolean; meta?: boolean }) => {
    // Handle Ctrl+Enter: submit
    if (key.ctrl && (key.name === "return" || key.name === "enter") || ch === "\r") {
      if (value.trim()) {
        onSubmit();
      }
      return;
    }

    // Handle regular Enter: insert newline
    if (key.name === "return" || key.name === "enter" || ch === "\n") {
      const lines = value.split("\n");
      const currentLine = lines[cursorLine] || "";
      const newLine = currentLine.slice(0, cursorCol - (cursorLine === 0 ? promptLength : 2)) + "\n" + currentLine.slice(cursorCol - (cursorLine === 0 ? promptLength : 2));
      
      const newLines = [...lines];
      newLines[cursorLine] = newLine.slice(0, newLine.indexOf("\n"));
      newLines.splice(cursorLine + 1, 0, newLine.slice(newLine.indexOf("\n") + 1));
      
      const newValue = newLines.join("\n");
      onChange(newValue);
      setCursorPos(cursorPos + 1);
      return;
    }

    // Handle Backspace
    if (key.name === "backspace") {
      if (cursorPos > 0) {
        const newValue = value.slice(0, cursorPos - 1) + value.slice(cursorPos);
        onChange(newValue);
        setCursorPos(cursorPos - 1);
        if (navigatingHistory) {
          setNavigatingHistory(false);
          history.reset();
        }
      }
      return;
    }

    // Handle Delete
    if (key.name === "delete" || (key.ctrl && ch === "d")) {
      if (cursorPos < value.length) {
        const newValue = value.slice(0, cursorPos) + value.slice(cursorPos + 1);
        onChange(newValue);
      }
      return;
    }

    // Handle Left arrow
    if (key.name === "left" || (key.ctrl && ch === "b")) {
      setCursorPos(Math.max(0, cursorPos - 1));
      if (navigatingHistory) {
        setNavigatingHistory(false);
        history.reset();
      }
      return;
    }

    // Handle Right arrow
    if (key.name === "right" || (key.ctrl && ch === "f")) {
      setCursorPos(Math.min(value.length, cursorPos + 1));
      if (navigatingHistory) {
        setNavigatingHistory(false);
        history.reset();
      }
      return;
    }

    // Handle Home (Ctrl+A)
    if ((key.ctrl && ch === "a") || key.name === "home") {
      setCursorPos(0);
      if (navigatingHistory) {
        setNavigatingHistory(false);
        history.reset();
      }
      return;
    }

    // Handle End (Ctrl+E)
    if ((key.ctrl && ch === "e") || key.name === "end") {
      setCursorPos(value.length);
      if (navigatingHistory) {
        setNavigatingHistory(false);
        history.reset();
      }
      return;
    }

    // Handle Up arrow: history navigation
    if (key.name === "up") {
      if (completions.length > 0) {
        const newIndex = (selectedCompletionIndex - 1 + completions.length) % completions.length;
        onCompletionSelect?.(newIndex);
        return;
      }
      if (!navigatingHistory) {
        history.startNavigation(value);
        setNavigatingHistory(true);
      }
      const prev = history.previous();
      if (prev !== null) {
        onChange(prev);
        setCursorPos(prev.length);
      }
      return;
    }

    // Handle Down arrow: history navigation
    if (key.name === "down") {
      if (completions.length > 0) {
        const newIndex = (selectedCompletionIndex + 1) % completions.length;
        onCompletionSelect?.(newIndex);
        return;
      }
      if (navigatingHistory) {
        const next = history.next();
        if (next !== null) {
          onChange(next);
          setCursorPos(next.length);
        } else {
          setNavigatingHistory(false);
        }
      }
      return;
    }

    // Handle Tab: autocomplete
    if (key.tab && completions.length > 0) {
      const completion = completions[selectedCompletionIndex];
      if (completion) {
        // Find the current word boundary
        const beforeCursor = value.slice(0, cursorPos);
        const wordStart = beforeCursor.search(/[/\s]([^\s]*)$/);
        const prefixStart = wordStart >= 0 ? wordStart + 1 : 0;
        const prefix = beforeCursor.slice(prefixStart);
        
        const newValue = value.slice(0, prefixStart) + completion + " " + value.slice(cursorPos);
        onChange(newValue);
        setCursorPos(prefixStart + completion.length + 1);
        onCompletionSelect?.(0);
        setNavigatingHistory(false);
      }
      return;
    }

    // Handle Escape: clear input
    if (key.name === "escape") {
      onChange("");
      setCursorPos(0);
      setNavigatingHistory(false);
      history.reset();
      return;
    }

    // Handle Ctrl+C: let parent handle
    if (key.name === "c" && key.ctrl) {
      return;
    }

    // Handle character input
    if (ch && ch.length === 1) {
      if (navigatingHistory) {
        setNavigatingHistory(false);
        history.reset();
      }
      
      const newValue = value.slice(0, cursorPos) + ch + value.slice(cursorPos);
      onChange(newValue);
      setCursorPos(cursorPos + 1);
      return;
    }
  }, [
    value, cursorPos, navigatingHistory, completions, selectedCompletionIndex,
    onChange, onSubmit, onCompletionSelect, history, mode
  ]);

  // Use global useInput to capture all keys
  useInput(handleKey);

  // Reset cursor position when value changes externally (e.g., from history)
  useEffect(() => {
    if (!navigatingHistory) {
      setCursorPos(value.length);
    }
  }, [value, navigatingHistory]);

  // Display the input
  const displayText = value.length > 0 ? value : placeholder;
  const displayMode = navigatingHistory ? "[history]" : mode;
  
  // For multiline, show each line with proper indentation
  const lines = displayText.split("\n");
  
  return (
    <Box flexDirection="column">
      {lines.map((line, i) => (
        <Box key={i}>
          {i === 0 ? (
            <Text color="cyan" bold>{displayMode} </Text>
          ) : (
            <Text color="cyan" bold>  </Text> // Indent for continuation lines
          )}
          <Text>{line}</Text>
        </Box>
      ))}
    </Box>
  );
}
