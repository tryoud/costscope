// SPDX-License-Identifier: Apache-2.0

import React from "react";
import { render } from "ink";
import { execa } from "execa";
import { ReplApp } from "./ReplApp.js";
import { ReplHistory } from "./history.js";
import { parseSlashInput, COMMANDS } from "./commands.js";
import { autopilotCommand } from "../commands/autopilot.js";
import { planCommand } from "../commands/plan.js";
import { routeCommand } from "../commands/route.js";
import { scopeCommand } from "../commands/scope.js";
import { scanCommand } from "../commands/scan.js";
import { costCommand } from "../commands/cost.js";
import { classifyTask, detectProject, loadConfig } from "@costscope/core";

const VERSION = "0.2.0";

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
      case "exit":
        process.exit(0);

      case "clear":
        return { status: "info", summary: "__clear__" };

      case "help": {
        const lines = COMMANDS.map((c) => `${c.aliases.join(", ").padEnd(18)} ${c.description}`);
        return { status: "info", summary: "Commands", lines };
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

      default:
        return { status: "failed", summary: `Unknown command: ${parsed.handler}` };
    }
  } catch (error) {
    return { status: "failed", summary: error instanceof Error ? error.message : String(error) };
  }
}

async function runInput(input: string, root: string, config?: string): Promise<ReplResult> {
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
    const result = await autopilotCommand(trimmed, {
      root, config, yes: true, noReviewPrompt: true
    }) as Record<string, unknown>;

    if (result["stopped"]) {
      const reason = Array.isArray(result["reason"]) ? String(result["reason"][0]) : "stopped";
      return { status: "stopped", summary: reason };
    }
    const count = Array.isArray(result["results"]) ? result["results"].length : 0;
    return { status: "done", summary: count > 0 ? `Completed ${count} task${count === 1 ? "" : "s"}` : "Done — no tasks executed" };
  } catch (error) {
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
      onSubmit: async (input: string) => {
        await history.push(input);
        return runInput(input, root, config);
      }
    })
  );

  await waitUntilExit();
}
