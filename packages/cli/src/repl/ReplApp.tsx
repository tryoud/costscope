// SPDX-License-Identifier: Apache-2.0

import React, { useState, useCallback, useEffect, useRef } from "react";
import { Box, Text, useApp, useInput, useStdout } from "ink";
import TextInput from "ink-text-input";
import { getCompletions, type ReplCommand } from "./commands.js";
import { getLiveHint, type ReplResult } from "./startRepl.js";
import type { ReplHistory } from "./history.js";

interface Props {
  onSubmit: (input: string) => Promise<ReplResult>;
  version: string;
  projectType: string;
  history: ReplHistory;
}

type State = "idle" | "running";
type InputMode = ">" | "/" | "!";

interface HistoryEntry {
  input: string;
  result: ReplResult;
}

const OTTER_FRAMES = [
  ["  /\\_/\\  ", " ( ō‿ō ) ", "  > ♦ <  "],
  ["  /\\_/\\  ", " ( ō‿ō ) ", "  > ♦ <  "],
  ["  /\\_/\\  ", " ( ō‿ō ) ", "  > ♦ <  "],
  ["  /\\_/\\  ", " ( ^‿^ ) ", "  > ♦ <  "],
];
const OTTER_RUNNING = [
  ["  /\\_/\\  ", " ( ō~ō ) ", "  ~~~~~  "],
  ["  /\\_/\\  ", " ( ō‿ō ) ", "  ~~~~~  "],
];

const TIER_COLOR: Record<string, "green" | "yellow" | "red"> = {
  cheap: "green",
  balanced: "yellow",
  premium: "red",
};

function getMode(value: string): InputMode {
  if (value.startsWith("/")) return "/";
  if (value.startsWith("!")) return "!";
  return ">";
}

export function ReplApp({ onSubmit, version, projectType, history }: Props) {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const [input, setInput] = useState("");
  const [state, setState] = useState<State>("idle");
  const [runningInput, setRunningInput] = useState<string | null>(null);
  const [sessionHistory, setSessionHistory] = useState<HistoryEntry[]>([]);
  const [completions, setCompletions] = useState<ReplCommand[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [otterFrame, setOtterFrame] = useState(0);
  const [tokens, setTokens] = useState(0);
  const tokenRef = useRef(0);
  const navigatingRef = useRef(false);

  const cols = stdout?.columns ?? 80;
  const cwd = process.cwd().replace(process.env["HOME"] ?? "", "~");
  const mode = getMode(input);
  const hint = getLiveHint(input, projectType);

  useEffect(() => {
    const frames = state === "running" ? OTTER_RUNNING : OTTER_FRAMES;
    const interval = setInterval(() => {
      setOtterFrame((f) => (f + 1) % frames.length);
    }, state === "running" ? 150 : 3000);
    return () => clearInterval(interval);
  }, [state]);

  useEffect(() => {
    const handler = () => exit();
    process.on("SIGINT", handler);
    return () => { process.off("SIGINT", handler); };
  }, [exit]);

  const handleChange = useCallback((value: string) => {
    setInput(value);
    navigatingRef.current = false;
    setCompletions(getCompletions(value));
    setSelectedIdx(0);
  }, []);

  useInput((ch, key) => {
    if (state !== "idle") return;

    // History navigation
    if (key.upArrow && completions.length === 0) {
      if (!navigatingRef.current) {
        history.startNavigation(input);
        navigatingRef.current = true;
      }
      const prev = history.previous();
      if (prev !== null) setInput(prev);
      return;
    }
    if (key.downArrow && navigatingRef.current) {
      const next = history.next();
      if (next !== null) setInput(next);
      return;
    }

    // Completion navigation
    if (completions.length > 0) {
      if (key.downArrow) setSelectedIdx((i) => (i + 1) % completions.length);
      else if (key.upArrow) setSelectedIdx((i) => (i - 1 + completions.length) % completions.length);
      else if (key.tab) {
        const alias = completions[selectedIdx]?.aliases[0] ?? "";
        setInput(alias + " ");
        setCompletions([]);
      }
    }
  });

  const handleSubmit = useCallback(async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setInput("");
    setCompletions([]);
    navigatingRef.current = false;
    history.reset();
    setRunningInput(trimmed);
    setState("running");
    try {
      const result = await onSubmit(trimmed);
      tokenRef.current += Math.ceil((trimmed.length + (result.summary?.length ?? 0)) / 4);
      setTokens(tokenRef.current);
      if (result.summary === "__clear__") {
        setSessionHistory([]);
      } else {
        setSessionHistory((prev) => [...prev, { input: trimmed, result }]);
      }
    } finally {
      setRunningInput(null);
      setState("idle");
    }
  }, [onSubmit, history]);

  const frames = state === "running" ? OTTER_RUNNING : OTTER_FRAMES;
  const otter = frames[otterFrame % frames.length] ?? frames[0]!;

  // Border with tier hint as right-side label
  const innerWidth = cols - 2;
  const tierLabel = hint.tier ? ` ${hint.tier} · ${hint.model} ` : " default ";
  const topFill = Math.max(0, innerWidth - tierLabel.length - 1);
  const topBorder = "─".repeat(topFill) + tierLabel + "─";
  const bottomBorder = "─".repeat(innerWidth);

  // Mode indicator color
  const modeColor = mode === "!" ? "yellow" : mode === "/" ? "cyan" : "cyan";
  const promptChar = state === "running" ? "⠋" : mode;

  return (
    <Box flexDirection="column" width={cols}>
      {/* Header */}
      <Box marginTop={1} marginBottom={1}>
        <Box flexDirection="column" marginRight={2} width={10}>
          {otter.map((line, i) => (
            <Text key={i} color="cyan">{line}</Text>
          ))}
        </Box>
        <Box flexDirection="column" justifyContent="center">
          <Box>
            <Text bold color="cyan">CostScope </Text>
            <Text>v{version}  </Text>
            <Text dimColor>·  {projectType}  ·  autopilot mode</Text>
          </Box>
          <Text dimColor>Type <Text color="cyan">/help</Text>  ·  <Text color="yellow">!</Text><Text dimColor>cmd</Text> for shell  ·  ↑↓ history</Text>
        </Box>
      </Box>

      {/* Session history */}
      {sessionHistory.map((entry, i) => (
        <Box key={i} marginBottom={1} flexDirection="column">
          <Box>
            <Text dimColor>▸ </Text>
            <Text dimColor>{entry.input}</Text>
          </Box>
          <Box marginLeft={2} flexDirection="column">
            {entry.result.status === "done"    && <Text color="green">✓ {entry.result.summary}</Text>}
            {entry.result.status === "stopped" && <Text color="yellow">⚠ {entry.result.summary}</Text>}
            {entry.result.status === "failed"  && <Text color="red">✗ {entry.result.summary}</Text>}
            {entry.result.status === "bash"    && <Text color="yellow">$ {entry.result.summary.replace(/^! /, "")}</Text>}
            {entry.result.status === "info"    && <Text color="cyan">{entry.result.summary}</Text>}
            {entry.result.lines?.map((line, j) => (
              <Text key={j} dimColor>{line}</Text>
            ))}
          </Box>
        </Box>
      ))}

      {/* Slash completions */}
      {completions.length > 0 && (
        <Box flexDirection="column" marginBottom={0}>
          {completions.map((cmd, i) => (
            <Box key={cmd.handler} paddingX={1}>
              <Text bold={i === selectedIdx} inverse={i === selectedIdx}>
                {(cmd.aliases[0] ?? "").padEnd(14)}
              </Text>
              <Text dimColor>  {cmd.description}</Text>
            </Box>
          ))}
        </Box>
      )}

      {/* Input box */}
      <Box flexDirection="column">
        <Text dimColor>
          {"├"}
          {hint.tier
            ? <>{"─".repeat(topFill)}<Text color={TIER_COLOR[hint.tier] ?? "white"}>{tierLabel}</Text>{"─┤"}</>
            : topBorder + "┤"
          }
        </Text>
        <Box paddingX={2} height={2}>
          <Text color={modeColor} bold>{promptChar} </Text>
          {state === "idle" ? (
            <TextInput value={input} onChange={handleChange} onSubmit={handleSubmit} placeholder="" />
          ) : (
            <Text dimColor>{runningInput}</Text>
          )}
        </Box>
        <Text dimColor>{"└" + bottomBorder + "┘"}</Text>
      </Box>

      {/* Status bar */}
      <Box justifyContent="space-between" width={cols} paddingX={1}>
        <Text dimColor>{cwd}</Text>
        <Text dimColor>{tokens.toLocaleString()} tokens</Text>
      </Box>
    </Box>
  );
}
