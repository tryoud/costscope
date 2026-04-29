// SPDX-License-Identifier: Apache-2.0

import { mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execa } from "execa";
import type { FileScope, ProjectInfo, WorkerPrompt } from "@costscope/core";
import { CostScopeCliError } from "../errors.js";

export interface ExecutorResult {
  exitCode: number;
  output: string;
}

export interface AiderProviderConfig {
  executor: string;
  model: string;
  apiKey?: string;
  apiBase?: string;
}

export async function runWithAider(
  workerPrompt: WorkerPrompt,
  fileScope: FileScope,
  projectInfo: ProjectInfo,
  provider: AiderProviderConfig,
  timeoutMs = 120_000
): Promise<ExecutorResult> {
  await ensureAiderInstalled(projectInfo.rootPath);
  const stateDir = path.join(os.tmpdir(), "costscope-aider");
  await mkdir(stateDir, { recursive: true });

  const args = [
    "--model",
    provider.model,
    "--message",
    workerPrompt.prompt,
    "--yes-always",
    "--no-stream",
    "--no-auto-commits",
    "--no-dirty-commits",
    "--no-gitignore",
    "--no-add-gitignore-files",
    "--no-restore-chat-history",
    "--no-analytics",
    "--map-tokens",
    "0",
    "--input-history-file",
    path.join(stateDir, "input.history"),
    "--chat-history-file",
    path.join(stateDir, "chat.history.md"),
    "--llm-history-file",
    path.join(stateDir, "llm.history"),
    ...fileScope.allowedFiles.flatMap((file) => ["--file", file])
  ];

  const result = await execa("aider", args, {
    cwd: projectInfo.rootPath,
    env: envForProvider(provider),
    reject: false,
    timeout: timeoutMs,
    all: true
  });

  const output = result.all?.trim() ?? [result.stdout, result.stderr].filter(Boolean).join("\n").trim();

  return {
    exitCode: failedProviderCall(output) ? 1 : result.exitCode ?? 1,
    output
  };
}

async function ensureAiderInstalled(cwd: string): Promise<void> {
  const result = await execa("aider", ["--version"], { cwd, reject: false });
  if (result.exitCode !== 0) {
    throw new CostScopeCliError("Aider is not installed or not on PATH. Install it with: pip install aider-chat");
  }
}

function envForProvider(provider: AiderProviderConfig): NodeJS.ProcessEnv {
  const apiKey = resolveApiKey(provider.apiKey);
  if (!apiKey) return process.env;

  const prefix = provider.model.includes("/") ? provider.model.split("/")[0] : "";
  if (prefix === "mistral") return { ...process.env, MISTRAL_API_KEY: apiKey };
  if (prefix === "anthropic") return { ...process.env, ANTHROPIC_API_KEY: apiKey };
  if (prefix === "openai") return { ...process.env, OPENAI_API_KEY: apiKey };
  return process.env;
}

function resolveApiKey(raw: string | undefined, env: NodeJS.ProcessEnv = process.env): string | undefined {
  if (!raw) return undefined;
  const match = raw.match(/^\$\{([A-Z0-9_]+)\}$/);
  if (!match) return raw;
  const name = match[1];
  return name ? env[name] : undefined;
}

function failedProviderCall(output: string): boolean {
  return [
    "APIError:",
    "AuthenticationError",
    "RateLimitError",
    "MistralException",
    "OpenAIError",
    "AnthropicError"
  ].some((marker) => output.includes(marker));
}
