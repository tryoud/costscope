// SPDX-License-Identifier: Apache-2.0

/**
 * Direct Mistral API executor - no external CLI dependency.
 * Uses the Mistral REST API directly via fetch.
 */

import type { FileScope, ProjectInfo, WorkerPrompt } from "@costscope/core";
import { CostScopeCliError } from "../errors.js";

export interface MistralProviderConfig {
  executor: "mistral-api";
  model: string;
  apiKey?: string;
  apiBase?: string;
}

interface MistralRequestBody {
  model: string;
  messages: Array<{
    role: "user" | "assistant" | "system";
    content: string;
  }>;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

interface MistralResponse {
  output?: {
    choices: Array<{
      message: { content: string };
      finish_reason: string;
    }>;
  };
  error?: {
    message: string;
    type: string;
  };
}

const MISTRAL_API_BASE = "https://api.mistral.ai/v1";
const CODESTRAL_LATEST = "codestral-latest";

/**
 * Resolve API key from config or environment.
 * Supports ${ENV_VAR} syntax in config.
 */
function resolveApiKey(raw: string | undefined, env: NodeJS.ProcessEnv = process.env): string | undefined {
  if (!raw) return undefined;
  const match = raw.match(/^\$\{([A-Z0-9_]+)\}$/);
  if (match) {
    const varName = match[1];
    return env[varName];
  }
  return raw;
}

/**
 * Get the API base URL from config or use default.
 */
function getApiBase(config: MistralProviderConfig): string {
  return config.apiBase ?? MISTRAL_API_BASE;
}

/**
 * Get API key from config or environment.
 * Tries MISTRAL_API_KEY first, then config.
 */
function getApiKey(config: MistralProviderConfig): string {
  const fromConfig = resolveApiKey(config.apiKey);
  const fromEnv = process.env["MISTRAL_API_KEY"];
  
  if (fromConfig) return fromConfig;
  if (fromEnv) return fromEnv;
  
  throw new CostScopeCliError(
    "Mistral API key required. Set MISTRAL_API_KEY environment variable " +
    "or configure apiKey in your CostScope config."
  );
}

/**
 * Build system prompt with file scope constraints.
 */
function buildSystemPrompt(fileScope: FileScope): string {
  if (fileScope.allowedFiles.length === 0) {
    return "You are a helpful coding assistant. Follow the user's instructions carefully.";
  }
  
  const fileList = fileScope.allowedFiles.join(", ");
  return (
    `You are a helpful coding assistant. Follow the user's instructions carefully.\n` +
    `\n` +
    `IMPORTANT: You MUST only modify these files:\n` +
    `${fileScope.allowedFiles.map((f) => `  - ${f}`).join("\n")}\n` +
    `\n` +
    `Do NOT modify any other files. Do NOT add new files unless explicitly requested.\n` +
    `If the task cannot be completed within these constraints, explain why.\n`
  );
}

/**
 * Execute a task using the Mistral REST API directly.
 * This is the preferred approach over calling the vibe CLI.
 */
export async function runWithMistralApi(
  workerPrompt: WorkerPrompt,
  fileScope: FileScope,
  projectInfo: ProjectInfo,
  provider: MistralProviderConfig,
  timeoutMs = 120_000
): Promise<{ exitCode: number; output: string }> {
  const apiKey = getApiKey(provider);
  const apiBase = getApiBase(provider);
  const model = provider.model || CODESTRAL_LATEST;
  
  const systemPrompt = buildSystemPrompt(fileScope);
  
  const requestBody: MistralRequestBody = {
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: workerPrompt.prompt }
    ],
    temperature: 0.7,
    max_tokens: 4096
  };
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    const response = await fetch(`${apiBase}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text();
      let errorMsg = `Mistral API error: ${response.status} ${response.statusText}`;
      try {
        const errorData = JSON.parse(errorText);
        errorMsg = `Mistral API error: ${errorData.message || errorMsg}`;
      } catch {
        // Not JSON, use raw text
      }
      throw new CostScopeCliError(errorMsg);
    }
    
    const data: MistralResponse = await response.json();
    
    if (data.error) {
      throw new CostScopeCliError(`Mistral API error: ${data.error.message} (${data.error.type})`);
    }
    
    if (!data.output?.choices?.[0]) {
      throw new CostScopeCliError("Mistral API returned no output choices");
    }
    
    const content = data.output.choices[0].message.content;
    const finishReason = data.output.choices[0].finish_reason;
    
    // Check for errors in the response
    if (finishReason === "error" || finishReason === "length") {
      return { exitCode: 1, output: `Mistral API finished with reason: ${finishReason}` };
    }
    
    return { exitCode: 0, output: content };
    
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new CostScopeCliError(`Mistral API request timed out after ${timeoutMs}ms`);
    }
    if (error instanceof CostScopeCliError) {
      throw error;
    }
    throw new CostScopeCliError(`Mistral API request failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Check if the Mistral API is accessible with current configuration.
 */
export async function checkMistralApiAccess(provider: MistralProviderConfig): Promise<boolean> {
  try {
    const apiKey = getApiKey(provider);
    const apiBase = getApiBase(provider);
    
    const response = await fetch(`${apiBase}/models`, {
      headers: { "Authorization": `Bearer ${apiKey}` }
    });
    
    return response.ok;
  } catch {
    return false;
  }
}
