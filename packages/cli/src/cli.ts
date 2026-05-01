#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0

import { writeFile } from "node:fs/promises";
import path from "node:path";
import { Command } from "commander";
import type { Tier } from "@costscope/core";
import { detectVagueness } from "@costscope/core";
import { autopilotCommand } from "./commands/autopilot.js";
import { chatCommand } from "./commands/chat.js";
import { clarifyCommand } from "./commands/clarify.js";
import { mcpServerCommand } from "./commands/mcpServer.js";
import type { AgentProfile } from "@costscope/core";
import { checkDiffCommand } from "./commands/checkDiff.js";
import { classifyCommand } from "./commands/classify.js";
import { costCommand } from "./commands/cost.js";
import { guardCommand } from "./commands/guard.js";
import { initCommand } from "./commands/init.js";
import { orchestrateCommand } from "./commands/orchestrate.js";
import { planCommand } from "./commands/plan.js";
import { promptCommand } from "./commands/prompt.js";
import { reviewPromptCommand } from "./commands/reviewPrompt.js";
import { routeCommand } from "./commands/route.js";
import { runCommand } from "./commands/run.js";
import { scanCommand } from "./commands/scan.js";
import { scopeCommand } from "./commands/scope.js";
import { printHuman } from "./output/printHuman.js";
import { printJson } from "./output/printJson.js";

interface GlobalOptions {
  root?: string;
  config?: string;
  json?: boolean;
}

export function createProgram(): Command {
  const program = new Command();
  program
    .name("costscope")
    .description("Route AI coding tasks by cost, risk, and file scope before handing them to a worker agent.")
    .version("0.3.0")
    .option("--root <path>", "Repository root", process.cwd())
    .option("--config <path>", "Config file path")
    .option("--json", "Print machine-readable JSON");

  program
    .command("autopilot")
    .description("Plan and run a goal automatically with deterministic safety gates")
    .argument("<goal>", "Goal to run")
    .option("--dry-run", "Show what autopilot would run without invoking workers")
    .option("--model <model>", "Override configured worker model for executed tasks")
    .option("--max-tasks <count>", "Maximum number of mini-tasks to run", parsePositiveInt, 10)
    .option("--no-check", "Skip post-run diff scope checks")
    .option("--no-review-prompt", "Skip final review prompt generation")
    .action(async (
      goal: string,
      options: { dryRun?: boolean; model?: string; maxTasks?: number; check?: boolean; reviewPrompt?: boolean }
    ) => {
      const global = normalizeGlobalOptions(program.opts<GlobalOptions>());
      const refinedGoal = await maybeAutoClarify(goal, global.root, global.config, global.json);
      await printResult(
        "Autopilot",
        autopilotCommand(refinedGoal, {
          root: global.root,
          config: global.config,
          dryRun: options.dryRun,
          model: options.model,
          maxTasks: options.maxTasks,
          noCheck: options.check === false,
          noReviewPrompt: options.reviewPrompt === false
        }),
        global.json
      );
    });

  program
    .command("init")
    .description("Interactive setup wizard — detect project, choose preset, configure API keys")
    .option("--force", "Overwrite an existing config")
    .option("--no-interactive", "Skip wizard, write default config without prompts")
    .action(async (options: { force?: boolean; interactive?: boolean }) => {
      const global = normalizeGlobalOptions(program.opts<GlobalOptions>());
      const useWizard = (options.interactive ?? process.stdin.isTTY) && !global.json;
      if (useWizard) {
        await initCommand({ root: global.root, force: options.force, interactive: true });
      } else {
        await printResult(
          "Initialized CostScope config",
          initCommand({ root: global.root, force: options.force, interactive: false }),
          global.json
        );
      }
    });

  program
    .command("scan")
    .description("Detect project type, package manager, important paths, and common commands")
    .action(async () => {
      const global = normalizeGlobalOptions(program.opts<GlobalOptions>());
      await printResult("Project scan", scanCommand({ root: global.root }), global.json);
    });

  program
    .command("classify")
    .description("Classify task risk and recommended cost tier")
    .argument("<task>", "Task to classify")
    .action(async (task: string) => {
      const global = normalizeGlobalOptions(program.opts<GlobalOptions>());
      await printResult("Task classification", classifyCommand(task, { root: global.root }), global.json);
    });

  program
    .command("scope")
    .description("Plan allowed, maybe, and forbidden files for a task")
    .argument("<task>", "Task to scope")
    .action(async (task: string) => {
      const global = normalizeGlobalOptions(program.opts<GlobalOptions>());
      await printResult("File scope", scopeCommand(task, { root: global.root, config: global.config }), global.json);
    });

  program
    .command("route")
    .description("Plan scope and choose worker/reviewer recommendations")
    .argument("<task>", "Task to route")
    .action(async (task: string) => {
      const global = normalizeGlobalOptions(program.opts<GlobalOptions>());
      await printResult("Route decision", routeCommand(task, { root: global.root, config: global.config }), global.json);
    });

  program
    .command("plan")
    .description("Split a larger coding goal into scoped mini-tasks")
    .argument("<goal>", "Goal to plan")
    .action(async (goal: string) => {
      const global = normalizeGlobalOptions(program.opts<GlobalOptions>());
      await printResult("Execution plan", planCommand(goal, { root: global.root, config: global.config }), global.json);
    });

  program
    .command("prompt")
    .description("Generate a strict copy-paste worker prompt")
    .argument("<task>", "Task to prompt")
    .option("--agent <agent>", "Override recommended worker agent")
    .option("--output <file>", "Write prompt text to a file instead of stdout")
    .action(async (task: string, options: { agent?: string; output?: string }) => {
      const global = normalizeGlobalOptions(program.opts<GlobalOptions>());
      if (global.json) {
        await printResult("Worker prompt", promptCommand(task, { root: global.root, config: global.config, agent: options.agent }), true);
      } else {
        await printPrompt(promptCommand(task, { root: global.root, config: global.config, agent: options.agent }), options.output);
      }
    });

  program
    .command("review-prompt")
    .description("Generate a diff-only review prompt for a stronger model")
    .argument("<task>", "Task to review")
    .option("--diff", "Include current git diff")
    .option("--output <file>", "Write prompt text to a file instead of stdout")
    .action(async (task: string, options: { diff?: boolean; output?: string }) => {
      const global = normalizeGlobalOptions(program.opts<GlobalOptions>());
      if (global.json) {
        await printResult("Review prompt", reviewPromptCommand(task, { root: global.root, config: global.config, diff: options.diff }), true);
      } else {
        await printPrompt(reviewPromptCommand(task, { root: global.root, config: global.config, diff: options.diff }), options.output);
      }
    });

  program
    .command("check-diff")
    .description("Check current git changes against the last or supplied file scope")
    .option("--scope-file <path>", "JSON file containing a FileScope or scope command output")
    .option("--tier <tier>", "Tier for strict package/config checks", "cheap")
    .action(async (options: { scopeFile?: string; tier?: Tier }) => {
      const global = normalizeGlobalOptions(program.opts<GlobalOptions>());
      await printResult("Diff scope check", checkDiffCommand({ root: global.root, scopeFile: options.scopeFile, tier: options.tier }), global.json);
    });

  program
    .command("guard")
    .description("CI-friendly diff guard that exits non-zero when policy fails")
    .option("--scope-file <path>", "JSON file containing a FileScope or scope command output")
    .option("--tier <tier>", "Tier for strict package/config checks", "cheap")
    .option("--strict", "Fail on needs-review as well as block")
    .option("--base <ref>", "Compare committed changes against a base ref, for example origin/main")
    .action(async (options: { scopeFile?: string; tier?: Tier; strict?: boolean; base?: string }) => {
      const global = normalizeGlobalOptions(program.opts<GlobalOptions>());
      try {
        const result = await guardCommand({
          root: global.root,
          scopeFile: options.scopeFile,
          tier: options.tier,
          strict: options.strict,
          base: options.base
        });
        if (global.json) {
          printJson(result);
        } else {
          printHuman("Guard", result);
        }
        if (!result.passed) process.exitCode = 1;
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exitCode = 1;
      }
    });

  program
    .command("run")
    .description("Route, execute, and diff-check a scoped coding task")
    .argument("<task>", "Task to run")
    .option("--model <model>", "Override configured worker model")
    .option("--dry-run", "Show the planned route and prompt without running a worker")
    .option("--yes", "Confirm routes that require manual review")
    .option("--no-check", "Skip the post-run diff scope check")
    .option("--allow-dirty", "Allow running when the git working tree already has changes")
    .action(async (task: string, options: { model?: string; dryRun?: boolean; yes?: boolean; check?: boolean; allowDirty?: boolean }) => {
      const global = normalizeGlobalOptions(program.opts<GlobalOptions>());
      const refinedTask = await maybeAutoClarify(task, global.root, global.config, global.json);
      await printResult(
        "Run task",
        runCommand(refinedTask, {
          root: global.root,
          config: global.config,
          model: options.model,
          dryRun: options.dryRun,
          yes: options.yes,
          noCheck: options.check === false,
          allowDirty: options.allowDirty
        }),
        global.json
      );
    });

  program
    .command("orchestrate")
    .description("Plan a larger goal and optionally run its mini-tasks in dependency order")
    .argument("<goal>", "Goal to orchestrate")
    .option("--execute", "Run planned tasks instead of only showing the orchestration plan")
    .option("--yes", "Confirm routes that require manual review")
    .option("--model <model>", "Override configured worker model for executed tasks")
    .option("--no-check", "Skip post-run diff scope checks")
    .action(async (goal: string, options: { execute?: boolean; yes?: boolean; model?: string; check?: boolean }) => {
      const global = normalizeGlobalOptions(program.opts<GlobalOptions>());
      await printResult(
        "Orchestration",
        orchestrateCommand(goal, {
          root: global.root,
          config: global.config,
          execute: options.execute,
          yes: options.yes,
          model: options.model,
          noCheck: options.check === false
        }),
        global.json
      );
    });

  program
    .command("clarify")
    .description("Ask the user 3-10 multiple-choice questions to refine a vague task")
    .argument("<task>", "Task to clarify")
    .option("--force", "Run even if the task does not appear vague")
    .option("--output <file>", "Write the refined task to a file")
    .action(async (task: string, options: { force?: boolean; output?: string }) => {
      const global = normalizeGlobalOptions(program.opts<GlobalOptions>());
      try {
        const session = await clarifyCommand(task, {
          root: global.root,
          config: global.config,
          force: options.force,
          output: options.output,
          json: global.json
        });
        if (global.json) {
          printJson(session);
        } else {
          printHuman("Refined task", { refinedTask: session.refinedTask });
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exitCode = 1;
      }
    });

  program
    .command("chat")
    .description("Interactive REPL with permission-controlled tools (read/write/bash/grep)")
    .option("--profile <profile>", "Agent profile: default | plan | accept-edits | auto-approve", "default")
    .option("--continue", "Resume the most recent session")
    .option("--resume <id>", "Resume a specific session by id")
    .option("--prompt <text>", "Single-prompt mode: record one user message and exit")
    .action(async (options: { profile?: string; continue?: boolean; resume?: string; prompt?: string }) => {
      const global = normalizeGlobalOptions(program.opts<GlobalOptions>());
      try {
        await chatCommand({
          root: global.root,
          profile: options.profile as AgentProfile,
          continueLast: options.continue,
          resume: options.resume,
          prompt: options.prompt
        });
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exitCode = 1;
      }
    });

  program
    .command("mcp-server")
    .description("Run CostScope as a stdio MCP server (exposes classify/scope/route/check-diff/cost)")
    .action(async () => {
      try {
        await mcpServerCommand();
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exitCode = 1;
      }
    });

  program
    .command("cost")
    .description("Estimate rough local task cost by routed tier")
    .argument("<task>", "Task to estimate")
    .action(async (task: string) => {
      const global = normalizeGlobalOptions(program.opts<GlobalOptions>());
      await printResult("Cost estimate", costCommand(task, { root: global.root, config: global.config }), global.json);
    });

  return program;
}

function parsePositiveInt(value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error("--max-tasks must be a positive integer");
  }
  return parsed;
}

function normalizeGlobalOptions(options: GlobalOptions): { root: string; config?: string; json: boolean } {
  return {
    root: path.resolve(options.root ?? process.cwd()),
    config: options.config ? path.resolve(options.config) : undefined,
    json: Boolean(options.json)
  };
}

async function printPrompt(value: Promise<unknown>, outputFile?: string): Promise<void> {
  try {
    const resolved = await value;
    const text = isPromptShape(resolved) ? resolved.prompt : JSON.stringify(resolved, null, 2);
    if (outputFile) {
      await writeFile(path.resolve(outputFile), text, "utf8");
      console.error(`Prompt written to ${path.resolve(outputFile)}`);
    } else {
      process.stdout.write(text + "\n");
    }
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}

function isPromptShape(value: unknown): value is { prompt: string } {
  return typeof value === "object" && value !== null && "prompt" in value && typeof (value as Record<string, unknown>).prompt === "string";
}

async function printResult(title: string, value: Promise<unknown>, json: boolean): Promise<void> {
  try {
    const resolved = await value;
    if (json) {
      printJson(resolved);
    } else {
      printHuman(title, resolved);
    }
    if (shouldExitNonZero(resolved)) process.exitCode = 1;
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}

function shouldExitNonZero(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (value.workerFailed === true) return true;
  if (value.stopped === true && (value.mode === "autopilot" || value.mode === "orchestrate")) return true;
  return false;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function maybeAutoClarify(task: string, root: string, config: string | undefined, json: boolean): Promise<string> {
  if (json || !process.stdin.isTTY) return task;
  const assessment = detectVagueness(task);
  if (!assessment.vague) return task;
  try {
    const session = await clarifyCommand(task, { root, config, json: false });
    return session.refinedTask;
  } catch {
    return task;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await createProgram().parseAsync();
}
