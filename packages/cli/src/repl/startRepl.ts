// SPDX-License-Identifier: Apache-2.0

import React from "react";
import { render } from "ink";
import { execa } from "execa";
import readline from "node:readline";
import { ReplApp } from "./ReplApp.js";
import { ReplHistory } from "./history.js";
import { parseSlashInput, COMMANDS } from "./commands.js";
import { autopilotCommand, type AutopilotProgress, type RunCommandResult, type AutopilotOptions } from "../commands/autopilot.js";
import { getChangedFiles, isGitRepository, planExecution, detectProject, loadConfig } from "@costscope/core";
import type { PlannedTask } from "@costscope/core";
import { getThemeNames, setCurrentTheme, getCurrentTheme, cycleTheme } from "./themes.js";
import { createSession, loadActiveSession, addMessage, clearSession, listSessions, switchSession, deleteSession, getSessionContext, type ReplSession } from "./session.js";

// Streaming state for REPL
export interface StreamingState {
  active: boolean;
  currentGoal: string;
  progress: AutopilotProgress | null;
}

const streamingState: StreamingState = {
  active: false,
  currentGoal: "",
  progress: null
};

export function getStreamingState(): StreamingState {
  return { ...streamingState };
}

export function setStreamingState(state: Partial<StreamingState>): void {
  Object.assign(streamingState, state);
}
import { planCommand } from "../commands/plan.js";
import { routeCommand } from "../commands/route.js";
import { scopeCommand } from "../commands/scope.js";
import { scanCommand } from "../commands/scan.js";
import { costCommand } from "../commands/cost.js";
import { classifyTask, detectProject, loadConfig, applyPreset, writeConfig } from "@costscope/core";
import type { ModelPreset } from "@costscope/core";
import { checkUpdate } from "../update/checkUpdate.js";

const VERSION = "0.2.0";

// Readline interface for confirmation prompts
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Ask user for confirmation in the REPL.
 * Returns true if user confirms (y/yes), false otherwise.
 */
async function askConfirm(prompt: string): Promise<boolean> {
  return new Promise((resolve) => {
    rl.question(`${prompt} (y/n) `, (answer) => {
      resolve(answer.trim().toLowerCase().startsWith("y"));
    });
  });
}

export interface ReplResult {
  status: "done" | "stopped" | "failed" | "info" | "bash";
  summary: string;
  lines?: string[];
}

export interface LiveHint {
  tier: "cheap" | "balanced" | "premium" | null;
  model: string | null;
}

async function handleBash(cmd: string): Promise<ReplResult> {
  try {
    const { stdout, stderr } = await execa("sh", ["-c", cmd], { timeout: 30_000, reject: false });
    const output = [stdout, stderr].filter(Boolean).join("\n").trim();
    const lines = output ? output.split("\n").slice(0, 20) : ["(no output)"];
    return { status: "bash", summary: `! ${cmd}`, lines };
  } catch (error) {
    return { status: "failed", summary: error instanceof Error ? error.message : String(error) };
  }
}

async function handleCommand(input: string, root: string, config?: string): Promise<ReplResult | null> {
  const parsed = parseSlashInput(input);
  if (!parsed) return null;

  try {
    switch (parsed.handler) {
      case "status": {
        const isGit = await isGitRepository(root);
        if (!isGit) return { status: "failed", summary: "Not a git repository" };
        const changed = await getChangedFiles(root);
        const lines = changed.length === 0
          ? ["Clean working tree"]
          : changed.slice(0, 10).map((f) => `  ${f}`).concat(changed.length > 10 ? [`  ... and ${changed.length - 10} more`] : []);
        return { status: "info", summary: `${changed.length} changed file${changed.length === 1 ? "" : "s"}`, lines };
      }

      case "update": {
        await checkUpdate({ force: true });
        return { status: "info", summary: "Update check complete — notification shown above if update available" };
      }

      case "exit":
        process.exit(0);

      case "theme": {
        const themeArg = parsed.args?.trim().toLowerCase();
        const themes = getThemeNames();
        
        if (!themeArg) {
          // Show current theme
          const current = getCurrentTheme();
          return { status: "info", summary: `Current theme: ${current.name}`, lines: themes.map(t => `  - ${t}`) };
        }
        
        if (themeArg === "cycle" || themeArg === "next") {
          const newTheme = cycleTheme();
          return { status: "done", summary: `Theme → ${newTheme}` };
        }
        
        if (!themes.includes(themeArg as any)) {
          return { status: "failed", summary: `Unknown theme. Available: ${themes.join(" · ")}` };
        }
        
        setCurrentTheme(themeArg as any);
        return { status: "done", summary: `Theme → ${themeArg}` };
      }

      case "clear":
        return { status: "info", summary: "__clear__" };

      case "keybindings": {
        const lines = [
          "Navigation:",
          "  ↑↓         Navigate history / completions",
          "  Tab        Autocomplete",
          "",
          "Editing:",
          "  Backspace  Delete previous character",
          "  Delete     Delete next character",
          "  ←→         Move cursor",
          "  Home/End   Move to start/end of line (Ctrl+A / Ctrl+E)",
          "",
          "Actions:",
          "  Enter      New line (in multiline mode)",
          "  Ctrl+Enter Submit command",
          "  Esc        Clear input / cancel",
          "  Ctrl+C     Exit REPL",
          "",
          "Commands:",
          "  /help      Show this help",
          "  /exit      Exit REPL",
          "  /clear     Clear session history",
        ];
        return { status: "info", summary: "Keyboard Shortcuts", lines };
      }

      case "help": {
        const lines = COMMANDS.map((c) => `${c.aliases.join(", ").padEnd(18)} ${c.description}`);
        return { status: "info", summary: "Commands", lines };
      }

      case "history": {
        // Will be handled with session context - for now just return info
        return { status: "info", summary: "Use /sessions to view history" };
      }

      case "sessions": {
        const sessions = await listSessions();
        if (sessions.length === 0) {
          return { status: "info", summary: "No previous sessions" };
        }
        const lines = sessions.map((s, i) => 
          `  [${i + 1}] ${new Date(s.createdAt).toLocaleDateString()} - ${s.messageCount} messages, ${s.tokenCount} tokens`
        );
        return { status: "info", summary: `${sessions.length} session(s)`, lines };
      }

      case "new": {
        await createSession();
        return { status: "done", summary: "New session started" };
      }

      case "plan": {
        if (!parsed.args) return { status: "failed", summary: "/plan requires a task — e.g. /plan update hero section" };
        const result = await planCommand(parsed.args, { root, config }) as { tasks?: { id: string; task: string; route?: { tier?: string } }[] };
        const lines = (result.tasks ?? []).map((t) => `  ${t.id}  →  ${t.route?.tier ?? "?"}  ${t.task}`);
        return { status: "info", summary: `Plan: ${parsed.args}`, lines };
      }

      case "route": {
        if (!parsed.args) return { status: "failed", summary: "/route requires a task" };
        const result = await routeCommand(parsed.args, { root, config }) as Record<string, unknown>;
        const lines = [`tier: ${result["tier"]}`, `risk: ${result["risk"]}`, `auto-run: ${result["autoRunAllowed"]}`];
        return { status: "info", summary: `Route: ${parsed.args}`, lines };
      }

      case "scope": {
        if (!parsed.args) return { status: "failed", summary: "/scope requires a task" };
        const result = await scopeCommand(parsed.args, { root, config }) as Record<string, unknown>;
        const allowed = Array.isArray(result["allowedFiles"]) ? result["allowedFiles"] as string[] : [];
        const lines = allowed.length ? allowed.map((f) => `  ${f}`) : ["  (no specific files matched)"];
        return { status: "info", summary: `Scope: ${parsed.args}`, lines };
      }

      case "scan": {
        const result = await scanCommand({ root }) as Record<string, unknown>;
        const lines = [
          `type:    ${result["projectType"]}`,
          `manager: ${result["packageManager"] ?? "—"}`,
          `build:   ${result["buildCommand"] ?? "—"}`,
          `test:    ${result["testCommand"] ?? "—"}`,
        ];
        return { status: "info", summary: "Project scan", lines };
      }

      case "cost": {
        if (!parsed.args) return { status: "failed", summary: "/cost requires a task" };
        const result = await costCommand(parsed.args, { root, config }) as Record<string, unknown>;
        return { status: "info", summary: `Cost estimate: ${result["estimatedCost"] ?? result["tier"] ?? JSON.stringify(result)}` };
      }

      case "config": {
        const cfg = await loadConfig(root, config);
        const lines = [
          `preset:   ${cfg.preset ?? "—"}`,
          `cheap:    ${cfg.providers?.cheap?.model ?? "—"}`,
          `balanced: ${cfg.providers?.balanced?.model ?? "—"}`,
          `premium:  ${cfg.providers?.premium?.model ?? "—"}`,
        ];
        return { status: "info", summary: "Config", lines };
      }

      case "model": {
        const tier = parsed.args?.trim().toLowerCase() as "cheap" | "balanced" | "premium";
        const validTiers = ["cheap", "balanced", "premium"];
        if (!tier || !validTiers.includes(tier)) {
          return { status: "failed", summary: "/model requires tier: cheap · balanced · premium" };
        }
        
        const cfg = await loadConfig(root, config);
        const currentModel = cfg.providers?.[tier]?.model ?? "—";
        
        if (!parsed.args.includes(" ")) {
          // Just show current model
          return { status: "info", summary: `${tier} model: ${currentModel}` };
        }
        
        // Set new model
        const newModel = parsed.args.split(" ")[1];
        if (!newModel) {
          return { status: "failed", summary: `Specify model: /model ${tier} <model-name>` };
        }
        
        await writeConfig(root, {
          ...cfg,
          providers: {
            ...cfg.providers,
            [tier]: { ...cfg.providers?.[tier], model: newModel }
          }
        }, true);
        
        return { status: "done", summary: `Set ${tier} model → ${newModel}` };
      }

      case "preset": {
        const presetName = parsed.args?.trim().toLowerCase();
        const valid: ModelPreset[] = ["default", "student", "quality"];
        if (!presetName || !valid.includes(presetName as ModelPreset)) {
          return { status: "failed", summary: "/preset requires: default · student · quality" };
        }
        const preset = presetName as ModelPreset;
        const cfg = await loadConfig(root, config);
        const providers = applyPreset(preset, undefined);
        await writeConfig(root, { ...cfg, preset, providers }, true);
        return {
          status: "done",
          summary: `Preset → ${preset}`,
          lines: [
            `cheap:    ${providers.cheap?.model ?? "—"}`,
            `balanced: ${providers.balanced?.model ?? "—"}`,
            `premium:  ${providers.premium?.model ?? "—"}`,
          ]
        };
      }

      default:
        return { status: "failed", summary: `Unknown command: ${parsed.handler}` };
    }
  } catch (error) {
    return { status: "failed", summary: error instanceof Error ? error.message : String(error) };
  }
}

async function runInput(input: string, root: string, config?: string, onProgress?: (progress: AutopilotProgress) => void): Promise<ReplResult> {
  const trimmed = input.trim();

  if (trimmed.startsWith("!")) {
    return handleBash(trimmed.slice(1).trim());
  }

  if (trimmed.startsWith("/")) {
    const result = await handleCommand(trimmed, root, config);
    if (result) return result;
    return { status: "failed", summary: "Unknown command. Type /help for available commands." };
  }

  try {
    setStreamingState({ active: true, currentGoal: trimmed, progress: null });
    
    // In REPL mode, check tasks first and ask for confirmation if needed
    const [project, loadedConfig] = await Promise.all([detectProject(root), loadConfig(root, config)]);
    const plan = planExecution(trimmed, project, loadedConfig);
    
    // Find first non-auto-run-safe task
    const blockedTask = plan.tasks.find((t) => !t.route.autoRunAllowed);
    
    let yes = true;
    if (blockedTask) {
      // Ask for confirmation in REPL
      const confirmed = await askConfirm(`Task "${blockedTask.task}" requires manual review (tier: ${blockedTask.route.tier}, risk: ${blockedTask.classification.risk}). Proceed anyway?`);
      if (!confirmed) {
        setStreamingState({ active: false, currentGoal: "", progress: null });
        return { status: "stopped", summary: "User cancelled - task requires manual review" };
      }
      yes = true; // User confirmed, proceed
    }
    
    const result = await autopilotCommand(trimmed, {
      root, config, yes, noReviewPrompt: true,
      onProgress: (progress: AutopilotProgress) => {
        setStreamingState({ progress });
        onProgress?.(progress);
      }
    }) as Record<string, unknown>;

    setStreamingState({ active: false, currentGoal: "", progress: null });

    if (result["stopped"]) {
      const reason = Array.isArray(result["reason"]) ? String(result["reason"][0]) : "stopped";
      return { status: "stopped", summary: reason };
    }
    const count = Array.isArray(result["results"]) ? result["results"].length : 0;
    return { status: "done", summary: count > 0 ? `Completed ${count} task${count === 1 ? "" : "s"}` : "Done — no tasks executed" };
  } catch (error) {
    setStreamingState({ active: false, currentGoal: "", progress: null });
    return { status: "failed", summary: error instanceof Error ? error.message : String(error) };
  }
}

export function getLiveHint(input: string, projectType: string): LiveHint {
  const trimmed = input.trim();
  if (!trimmed || trimmed.startsWith("/") || trimmed.startsWith("!")) return { tier: null, model: null };
  try {
    const classification = classifyTask(trimmed);
    const tier = classification.tier as "cheap" | "balanced" | "premium";
    const modelMap: Record<string, string> = { cheap: "vibe", balanced: "deepseek", premium: "claude" };
    return { tier, model: modelMap[tier] ?? null };
  } catch {
    return { tier: null, model: null };
  }
}

export async function startRepl(root: string, config?: string): Promise<void> {
  const [history, project] = await Promise.all([ReplHistory.load(), detectProject(root)]);

  const { waitUntilExit } = render(
    React.createElement(ReplApp, {
      version: VERSION,
      projectType: project.projectType,
      history,
      onSubmit: async (input: string, onProgress?: (progress: AutopilotProgress) => void) => {
        await history.push(input);
        return runInput(input, root, config, onProgress);
      },
      getStreamingState
    })
  );

  await waitUntilExit();
}
