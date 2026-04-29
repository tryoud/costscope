// SPDX-License-Identifier: Apache-2.0

import type { ProviderConfig } from "../types.js";

export interface LlmMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface LlmCallOptions {
  maxTokens?: number;
  temperature?: number;
}

export async function callLlm(
  provider: ProviderConfig,
  messages: LlmMessage[],
  opts: LlmCallOptions = {}
): Promise<string> {
  const apiKey = resolveApiKey(provider.apiKey);
  const maxTokens = opts.maxTokens ?? 512;
  const temperature = opts.temperature ?? 0;

  if (provider.executor === "openrouter") {
    return callOpenRouterCompatible(
      apiKey,
      provider.apiBase ?? "https://openrouter.ai/api/v1",
      provider.model,
      messages,
      maxTokens,
      temperature
    );
  }

  if (provider.executor === "anthropic-api") {
    return callAnthropicApi(apiKey, provider.model, messages, maxTokens);
  }

  if (provider.executor === "openai-api") {
    return callOpenRouterCompatible(
      apiKey,
      provider.apiBase ?? "https://api.openai.com/v1",
      provider.model,
      messages,
      maxTokens,
      temperature
    );
  }

  throw new Error(`Executor "${provider.executor}" does not support direct LLM calls.`);
}

async function callOpenRouterCompatible(
  apiKey: string | undefined,
  baseUrl: string,
  model: string,
  messages: LlmMessage[],
  maxTokens: number,
  temperature: number
): Promise<string> {
  if (!apiKey) throw new Error("API key required for OpenRouter/OpenAI call.");

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://github.com/tryoud/costscope",
      "X-Title": "CostScope"
    },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature })
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenRouter API error ${res.status}: ${body}`);
  }

  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("Empty response from OpenRouter API.");
  return text.trim();
}

async function callAnthropicApi(
  apiKey: string | undefined,
  model: string,
  messages: LlmMessage[],
  maxTokens: number
): Promise<string> {
  if (!apiKey) throw new Error("API key required for Anthropic API call.");

  const system = messages.find((m) => m.role === "system")?.content;
  const userMessages = messages.filter((m) => m.role !== "system");

  const body: Record<string, unknown> = {
    model,
    max_tokens: maxTokens,
    messages: userMessages
  };
  if (system) body["system"] = system;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${text}`);
  }

  const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
  const text = data.content?.find((b) => b.type === "text")?.text;
  if (!text) throw new Error("Empty response from Anthropic API.");
  return text.trim();
}

function resolveApiKey(raw: string | undefined, env: NodeJS.ProcessEnv = process.env): string | undefined {
  if (!raw) return undefined;
  const match = raw.match(/^\$\{([A-Z0-9_]+)\}$/);
  if (!match) return raw;
  const name = match[1];
  return name ? env[name] : undefined;
}
