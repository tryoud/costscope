#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0

import path from "node:path";
import { Command } from "commander";
import type { Tier } from "@costscope/core";
import { checkDiffCommand } from "./commands/checkDiff.js";
import { classifyCommand } from "./commands/classify.js";
import { costCommand } from "./commands/cost.js";
import { initCommand } from "./commands/init.js";
import { promptCommand } from "./commands/prompt.js";
import { reviewPromptCommand } from "./commands/reviewPrompt.js";
import { routeCommand } from "./commands/route.js";
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
    .version("0.1.0")
    .option("--root <path>", "Repository root", process.cwd())
    .option("--config <path>", "Config file path")
    .option("--json", "Print machine-readable JSON");

  program
    .command("init")
    .description("Create a local .costscope/config.json for this repository")
    .option("--force", "Overwrite an existing config")
    .action(async (options: { force?: boolean }) => {
      const global = normalizeGlobalOptions(program.opts<GlobalOptions>());
      await printResult("Initialized CostScope config", initCommand({ root: global.root, force: options.force }), global.json);
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
    .command("prompt")
    .description("Generate a strict copy-paste worker prompt")
    .argument("<task>", "Task to prompt")
    .option("--agent <agent>", "Override recommended worker agent")
    .action(async (task: string, options: { agent?: string }) => {
      const global = normalizeGlobalOptions(program.opts<GlobalOptions>());
      await printResult("Worker prompt", promptCommand(task, { root: global.root, config: global.config, agent: options.agent }), global.json);
    });

  program
    .command("review-prompt")
    .description("Generate a diff-only review prompt for a stronger model")
    .argument("<task>", "Task to review")
    .option("--diff", "Include current git diff")
    .action(async (task: string, options: { diff?: boolean }) => {
      const global = normalizeGlobalOptions(program.opts<GlobalOptions>());
      await printResult("Review prompt", reviewPromptCommand(task, { root: global.root, config: global.config, diff: options.diff }), global.json);
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
    .command("cost")
    .description("Estimate rough local task cost by routed tier")
    .argument("<task>", "Task to estimate")
    .action(async (task: string) => {
      const global = normalizeGlobalOptions(program.opts<GlobalOptions>());
      await printResult("Cost estimate", costCommand(task, { root: global.root, config: global.config }), global.json);
    });

  return program;
}

function normalizeGlobalOptions(options: GlobalOptions): { root: string; config?: string; json: boolean } {
  return {
    root: path.resolve(options.root ?? process.cwd()),
    config: options.config ? path.resolve(options.config) : undefined,
    json: Boolean(options.json)
  };
}

async function printResult(title: string, value: Promise<unknown>, json: boolean): Promise<void> {
  try {
    const resolved = await value;
    if (json) {
      printJson(resolved);
    } else {
      printHuman(title, resolved);
    }
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await createProgram().parseAsync();
}
