// SPDX-License-Identifier: Apache-2.0

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  checkDiffScope,
  classifyTask,
  detectProject,
  generateWorkerPrompt,
  getChangedFiles,
  isGitRepository,
  loadConfig,
  planFileScope,
  resolveScopeWithLlm,
  routeTask,
  type DiffScopeResult,
  type CostScopeConfig
} from "@costscope/core";
import { CostScopeCliError } from "../errors.js";
import { runWithAider, type AiderProviderConfig, type ExecutorResult } from "../executors/aider.js";
import { runWithVibe, type VibeProviderConfig } from "../executors/vibe.js";

export interface RunOptions {
  root: string;
  config?: string;
  model?: string;
  dryRun?: boolean;
  yes?: boolean;
  noCheck?: boolean;
  allowDirty?: boolean;
}

export async function runCommand(task: string, options: RunOptions) {
  const [project, config] = await Promise.all([detectProject(options.root), loadConfig(options.root, options.config)]);
  const classification = classifyTask(task, project);
  const rawScope = planFileScope(task, project, config);
  const fileScope = rawScope.allowedFiles.length === 0
    ? await resolveScopeWithLlm(task, project, config, rawScope)
    : rawScope;
  const route = routeTask(classification, fileScope, config);
  const workerPrompt = generateWorkerPrompt(task, classification, fileScope, route, project);
  const provider = providerForRoute(resolveRouteProvider(config, route.tier), options.model);

  const plan = { classification, fileScope, route, provider: publicProvider(provider), workerPrompt };
  if (options.dryRun) {
    return { mode: "dry-run", ...plan };
  }

  if (!(await isGitRepository(options.root))) {
    throw new CostScopeCliError(`Not a git repository: ${options.root}. Run costscope run from a git repo root.`);
  }

  if (!route.autoRunAllowed && !options.yes) {
    throw new CostScopeCliError("Auto-run is not allowed for this route. Re-run with --yes after reviewing the generated scope.");
  }

  const beforeFiles = await getChangedFiles(options.root);
  if (beforeFiles.length > 0 && !options.allowDirty) {
    throw new CostScopeCliError(
      `Working tree is not clean: ${beforeFiles.join(", ")}. Commit/stash changes first or pass --allow-dirty.`
    );
  }

  let execution: ExecutorResult;
  if (provider.executor === "aider") {
    execution = await runWithAider(workerPrompt, fileScope, project, provider);
  } else if (provider.executor === "vibe") {
    execution = await runWithVibe(workerPrompt, fileScope, project, provider);
  } else {
    throw new CostScopeCliError(`Executor "${provider.executor}" is not implemented. Supported: aider, vibe.`);
  }
  const changedFiles = await getChangedFiles(options.root);
  const diffResult = execution.exitCode === 0 && !options.noCheck ? checkDiffScope(changedFiles, fileScope, route.tier) : undefined;

  if (execution.exitCode === 0 && (!diffResult || diffResult.verdict === "pass")) {
    await writeLastScope(options.root, { task, classification, fileScope, route });
  }

  return {
    mode: "run",
    classification,
    fileScope,
    route,
    provider: publicProvider(provider),
    execution,
    workerFailed: execution.exitCode !== 0,
    diffResult
  };
}

type RunnerProviderConfig = AiderProviderConfig | VibeProviderConfig;
type ConfigWithProviders = CostScopeConfig & {
  providers?: {
    cheap?: RunnerProviderConfig;
    balanced?: RunnerProviderConfig;
    premium?: RunnerProviderConfig;
    planner?: RunnerProviderConfig;
  };
};

function providerForRoute(provider: RunnerProviderConfig | undefined, modelOverride?: string): RunnerProviderConfig {
  if (!provider) {
    throw new CostScopeCliError("No provider configured for this route tier.");
  }
  return modelOverride ? { ...provider, model: modelOverride } : provider;
}

function resolveRouteProvider(config: CostScopeConfig, tier: string): RunnerProviderConfig | undefined {
  if (tier !== "cheap" && tier !== "balanced" && tier !== "premium") return undefined;
  return (config as ConfigWithProviders).providers?.[tier] ?? fallbackProviders[tier];
}

const fallbackProviders = {
  cheap: {
    executor: "vibe",
    model: "codestral-latest"
  },
  balanced: {
    executor: "aider",
    model: "anthropic/claude-haiku-4-5"
  },
  premium: {
    executor: "claude-code",
    model: "claude-sonnet-4-6"
  }
} satisfies Record<"cheap" | "balanced" | "premium", RunnerProviderConfig>;

function publicProvider(provider: RunnerProviderConfig): RunnerProviderConfig {
  const { apiKey: _apiKey, ...safeProvider } = provider;
  return safeProvider;
}

async function writeLastScope(root: string, value: unknown): Promise<void> {
  const dir = path.join(root, ".costscope");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "last-scope.json"), `${JSON.stringify(value, null, 2)}\n`);
}

export type RunCommandResult = Awaited<ReturnType<typeof runCommand>>;
export type RunDiffResult = DiffScopeResult;
export type RunExecutorResult = ExecutorResult;
