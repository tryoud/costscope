// SPDX-License-Identifier: Apache-2.0

import React, { useState, useCallback, useEffect, useRef } from "react";
import { Box, Text, useApp, useStdout } from "ink";
import { getCompletions, type ReplCommand } from "./commands.js";
import { getLiveHint, type ReplResult, type StreamingState } from "./startRepl.js";
import type { ReplHistory } from "./history.js";
import type { AutopilotProgress } from "../commands/autopilot.js";
import { countTokens } from "@costscope/core";
import { InputBox } from "./InputBox.js";
import { getCurrentTheme } from "./themes.js";

interface Props {
  onSubmit: (input: string, onProgress?: (progress: AutopilotProgress) => void) => Promise<ReplResult>;
  version: string;
  projectType: string;
  history: ReplHistory;
  getStreamingState?: () => StreamingState;
}

type State = "idle" | "running";
type InputMode = ">" | "/" | "!";

interface HistoryEntry {
  input: string;
  result: ReplResult;
}

// Pixel art otter — 7 chars wide, 3 lines tall
const OTTER_FRAMES: string[][] = [
  [" ·███· ", "(◉ ‿ ◉)", " ·▀▀▀· "],   // normal
  [" ·███· ", "(◉ ‿ ◉)", " ·▀▀▀· "],
  [" ·███· ", "(◉ ‿ ◉)", " ·▀▀▀· "],
  [" ·███· ", "(◉ ‿ ◉)", " ·▀▀▀· "],
  [" ·███· ", "(─ ‿ ─)", " ·▀▀▀· "],   // blink
  [" ·███· ", "(◉ ‿ ◉)", " ·▀▀▀· "],
  [" ·███· ", "(◉ ‿ ◉)", " ·▀▀▀· "],
  [" ·███· ", "(◉ ‿ ─)", " ·▀▀▀· "],   // wink
  [" ·███· ", "(◉ ‿ ◉)", " ·▀▀▀· "],
  [" ·███· ", "(◉ ‿ ◉)", " ·▀▀▀· "],
];
const OTTER_RUNNING: string[][] = [
  [" ·███· ", "(◉ ~ ◉)", " ·~~~· "],
  [" ·███· ", "(◉ ~ ◉)", "  ~~~~ "],
  [" ·~~~· ", "(◉ ~ ◉)", " ·▀▀▀· "],
  [" ·███· ", "(◉ ~ ◉)", " ·~~~· "],
];

function getMode(value: string): InputMode {
  if (value.startsWith("/")) return "/";
  if (value.startsWith("!")) return "!";
  return ">";
}

export function ReplApp({ onSubmit, version, projectType, history, getStreamingState }: Props) {
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
  const [streamingProgress, setStreamingProgress] = useState<AutopilotProgress | null>(null);
  const tokenRef = useRef(0);
  const navigatingRef = useRef(false);

  // Poll streaming state when running
  useEffect(() => {
    if (state !== "running" || !getStreamingState) return;
    const interval = setInterval(() => {
      const streamState = getStreamingState();
      if (streamState.progress) {
        setStreamingProgress(streamState.progress);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [state, getStreamingState]);

  const cols = stdout?.columns ?? 80;
  const cwd = process.cwd().replace(process.env["HOME"] ?? "", "~");
  const mode = getMode(input);
  const hint = getLiveHint(input, projectType);
  const isStreaming = streamingProgress !== null;

  // Apply theme
  const theme = getCurrentTheme();

  // Determine otter animation based on streaming state
  const frames = isStreaming ? OTTER_RUNNING : (state === "running" ? OTTER_RUNNING : OTTER_FRAMES);

  useEffect(() => {
    const interval = setInterval(() => {
      setOtterFrame((f) => (f + 1) % frames.length);
    }, isStreaming ? 150 : 2000);
    return () => clearInterval(interval);
  }, [frames, isStreaming]);

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

  const handleSubmit = useCallback(async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setInput("");
    setCompletions([]);
    navigatingRef.current = false;
    history.reset();
    setRunningInput(trimmed);
    setState("running");
    setStreamingProgress(null);
    try {
      const result = await onSubmit(trimmed, (progress: AutopilotProgress) => {
        setStreamingProgress(progress);
      });
      // Use real token counting
      const inputTokens = countTokens(trimmed);
      const outputTokens = result.summary ? countTokens(result.summary) : 0;
      const resultLinesTokens = result.lines ? result.lines.reduce((sum, line) => sum + countTokens(line), 0) : 0;
      tokenRef.current += inputTokens + outputTokens + resultLinesTokens;
      setTokens(tokenRef.current);
      if (result.summary === "__clear__") {
        setSessionHistory([]);
      } else {
        setSessionHistory((prev) => [...prev, { input: trimmed, result }]);
      }
    } finally {
      setRunningInput(null);
      setState("idle");
      setStreamingProgress(null);
    }
  }, [onSubmit, history]);

  const otter = frames[otterFrame % frames.length] ?? frames[0]!;

  // Border — label at top-right like Vibe, no corner chars
  const tierLabel = hint.tier ? ` ${hint.tier} · ${hint.model} ` : " default ";
  const topFill = Math.max(0, cols - tierLabel.length - 1);
  const modeColor = mode === "!" ? "yellow" : theme.promptColor as any;
  const promptChar = state === "running" ? "⠋" : mode;
  
  // Tier colors from theme
  const tierColorMap = theme.tierColor as Record<string, string>;

  // Streaming progress display
  const progressText = streamingProgress ?
    streamingProgress.type === "task_start" ? `→ ${streamingProgress.taskId}: ${streamingProgress.summary ?? "Starting..."}` :
    streamingProgress.type === "task_complete" ? `✓ ${streamingProgress.taskId} (${streamingProgress.taskIndex}/${streamingProgress.totalTasks})` :
    streamingProgress.type === "start" ? `Autopilot started: ${streamingProgress.totalTasks ?? 0} task(s)` :
    streamingProgress.type === "stopped" ? `⚠ ${streamingProgress.summary}` :
    streamingProgress.summary
    : null;

  return (
    <Box flexDirection="column" width={cols}>
      {/* Header */}
      <Box marginTop={1} marginBottom={1}>
        <Box flexDirection="column" marginRight={2} width={9}>
          {otter.map((line, i) => (
            <Text key={i} color={theme.otterColor as any}>{line}</Text>
          ))}
        </Box>
        <Box flexDirection="column" justifyContent="center">
          <Box>
            <Text bold color={theme.info as any}>CostScope </Text>
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
            {entry.result.status === "done"    && <Text color={theme.success as any}>✓ {entry.result.summary}</Text>}
            {entry.result.status === "stopped" && <Text color={theme.warning as any}>⚠ {entry.result.summary}</Text>}
            {entry.result.status === "failed"  && <Text color={theme.error as any}>✗ {entry.result.summary}</Text>}
            {entry.result.status === "bash"    && <Text color={theme.warning as any}>$ {entry.result.summary.replace(/^! /, "")}</Text>}
            {entry.result.status === "info"    && <Text color={theme.info as any}>{entry.result.summary}</Text>}
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
              <Text bold={i === selectedIdx} inverse={i === selectedIdx} color={i === selectedIdx ? theme.promptColor as any : "white"}>
                {(cmd.aliases[0] ?? "").padEnd(14)}
              </Text>
              <Text dimColor>  {cmd.description}</Text>
            </Box>
          ))}
        </Box>
      )}

      {/* Streaming progress indicator */}
      {isStreaming && progressText && (
        <Box marginBottom={1} paddingX={2}>
          <Text color={theme.info as any}>✦ {progressText}</Text>
        </Box>
      )}

      {/* Input box — plain dashes, label top-right like Vibe */}
      <Box flexDirection="column">
        <Box>
          <Text dimColor>{"─".repeat(topFill)}</Text>
          {hint.tier
            ? <Text color={tierColorMap[hint.tier] ?? "white" as any}>{tierLabel}</Text>
            : <Text dimColor>{tierLabel}</Text>
          }
          <Text dimColor>{"─"}</Text>
        </Box>
        <Box paddingX={2}>
          {state === "idle" ? (
            <InputBox
              value={input}
              onChange={handleChange}
              onSubmit={() => handleSubmit(input)}
              placeholder=""
              history={history}
              completions={completions.map(c => c.aliases[0])}
              selectedCompletionIndex={selectedIdx}
              onCompletionSelect={(idx) => setSelectedIdx(idx)}
              mode={mode}
            />
          ) : (
            <Text dimColor>{runningInput.split("\n").map((line, i) => (
              <Box key={i}>
                {i === 0 && <Text color={modeColor} bold>{promptChar} </Text>}
                {i > 0 && <Text color="cyan" bold>  </Text>}
                <Text>{line}</Text>
              </Box>
            ))}</Text>
          )}
        </Box>
        <Text dimColor>{"─".repeat(cols)}</Text>
      </Box>

      {/* Status bar */}
      <Box justifyContent="space-between" width={cols} paddingX={1}>
        <Text dimColor>{cwd}</Text>
        <Text dimColor>{tokens.toLocaleString()} tokens</Text>
      </Box>
    </Box>
  );
}
