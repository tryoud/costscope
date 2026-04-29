// SPDX-License-Identifier: Apache-2.0

import { execa } from "execa";
import type { FileScope, ProjectInfo, WorkerPrompt } from "@costscope/core";
import { CostScopeCliError } from "../errors.js";

export interface VibeProviderConfig {
  executor: string;
  model: string;
  apiKey?: string;
  apiBase?: string;
}

const VIBE_BINARY = process.env["VIBE_BIN"] ?? "vibe";

export async function runWithVibe(
  workerPrompt: WorkerPrompt,
  fileScope: FileScope,
  projectInfo: ProjectInfo,
  provider: VibeProviderConfig,
  timeoutMs = 120_000
): Promise<{ exitCode: number; output: string }> {
  await ensureVibeInstalled(projectInfo.rootPath);

  const prompt = buildPrompt(workerPrompt.prompt, fileScope);
  const args = [
    "-p", prompt,
    "--output", "text",
    "--workdir", projectInfo.rootPath
  ];

  const result = await execa(VIBE_BINARY, args, {
    cwd: projectInfo.rootPath,
    env: envForProvider(provider),
    reject: false,
    timeout: timeoutMs,
    all: true
  });

  const output = result.all?.trim() ?? [result.stdout, result.stderr].filter(Boolean).join("\n").trim();

  if (isVibeKeyError(output)) {
    throw new CostScopeCliError(
      `Mistral API key error (APIKeyScope.vibe): the key lacks vibe scope. ` +
        `Generate a vibe-scoped key at console.mistral.ai and set MISTRAL_API_KEY.`
    );
  }

  return {
    exitCode: hasProviderError(output) ? 1 : (result.exitCode ?? 1),
    output
  };
}

async function ensureVibeInstalled(cwd: string): Promise<void> {
  const result = await execa(VIBE_BINARY, ["--version"], { cwd, reject: false });
  if (result.exitCode !== 0) {
    throw new CostScopeCliError(
      `vibe CLI not found (tried: ${VIBE_BINARY}). Install: uv tool install mistral-vibe. ` +
        `Or set VIBE_BIN to the full path.`
    );
  }
}

function buildPrompt(task: string, fileScope: FileScope): string {
  if (fileScope.allowedFiles.length === 0) return task;
  const fileList = fileScope.allowedFiles.join(", ");
  return `${task}\n\nScope: only modify these files — ${fileList}. Do not touch any other files.`;
}

function envForProvider(provider: VibeProviderConfig): NodeJS.ProcessEnv {
  const apiKey = resolveApiKey(provider.apiKey) ?? process.env["MISTRAL_API_KEY"];
  if (!apiKey) return process.env;
  return { ...process.env, MISTRAL_API_KEY: apiKey };
}

function resolveApiKey(raw: string | undefined, env: NodeJS.ProcessEnv = process.env): string | undefined {
  if (!raw) return undefined;
  const match = raw.match(/^\$\{([A-Z0-9_]+)\}$/);
  if (!match) return raw;
  const name = match[1];
  return name ? env[name] : undefined;
}

function isVibeKeyError(output: string): boolean {
  return ["APIKeyScope.vibe", "VibeKeyError", "vibe scope", "invalid_api_key_scope"].some((m) =>
    output.includes(m)
  );
}

function hasProviderError(output: string): boolean {
  return ["APIError:", "AuthenticationError", "RateLimitError", "MistralException"].some((m) =>
    output.includes(m)
  );
}
