// SPDX-License-Identifier: Apache-2.0

import type { CostScopeConfig, ModelPreset } from "../types.js";

type Providers = NonNullable<CostScopeConfig["providers"]>;

// default — balanced quality/cost, OpenRouter for everything except premium
const defaultProviders: Providers = {
  "scope-resolver": {
    executor: "openrouter",
    model: "google/gemini-2.0-flash-lite",
    apiKey: "${OPENROUTER_API_KEY}"
  },
  cheap: {
    executor: "vibe",
    model: "codestral-latest"
  },
  balanced: {
    executor: "openrouter",
    model: "deepseek/deepseek-chat",
    apiKey: "${OPENROUTER_API_KEY}"
  },
  premium: {
    executor: "anthropic-api",
    model: "claude-sonnet-4-6",
    apiKey: "${ANTHROPIC_API_KEY}"
  },
  planner: {
    executor: "openrouter",
    model: "deepseek/deepseek-r1",
    apiKey: "${OPENROUTER_API_KEY}"
  }
};

// student — maximum value for students with Mistral le Chat Pro (~53 % off subscription).
// cheap tier uses vibe (Devstral 2) via a Codestral API key from Studio → Codestral → API keys.
// See docs/student-preset.md for setup instructions.
const studentProviders: Providers = {
  "scope-resolver": {
    executor: "openrouter",
    model: "google/gemini-2.0-flash-lite",
    apiKey: "${OPENROUTER_API_KEY}"
  },
  // vibe uses MISTRAL_API_KEY (Codestral key from le Chat Pro); model is Devstral 2 inside the CLI
  cheap: {
    executor: "vibe",
    model: "codestral-latest"
  },
  balanced: {
    executor: "openrouter",
    model: "qwen/qwen-2.5-coder-32b-instruct",
    apiKey: "${OPENROUTER_API_KEY}"
  },
  premium: {
    executor: "openrouter",
    model: "deepseek/deepseek-r1",
    apiKey: "${OPENROUTER_API_KEY}"
  },
  planner: {
    executor: "openrouter",
    model: "qwen/qwen-2.5-coder-32b-instruct",
    apiKey: "${OPENROUTER_API_KEY}"
  }
};

// quality — highest reliability, Anthropic-only
const qualityProviders: Providers = {
  "scope-resolver": {
    executor: "anthropic-api",
    model: "claude-haiku-4-5",
    apiKey: "${ANTHROPIC_API_KEY}"
  },
  cheap: {
    executor: "vibe",
    model: "codestral-latest"
  },
  balanced: {
    executor: "anthropic-api",
    model: "claude-haiku-4-5",
    apiKey: "${ANTHROPIC_API_KEY}"
  },
  premium: {
    executor: "anthropic-api",
    model: "claude-sonnet-4-6",
    apiKey: "${ANTHROPIC_API_KEY}"
  },
  planner: {
    executor: "anthropic-api",
    model: "claude-sonnet-4-6",
    apiKey: "${ANTHROPIC_API_KEY}"
  }
};

export const MODEL_PRESETS: Record<ModelPreset, Providers> = {
  default: defaultProviders,
  student: studentProviders,
  quality: qualityProviders
};

export function applyPreset(preset: ModelPreset, explicit: Providers | undefined): Providers {
  const base = MODEL_PRESETS[preset];
  if (!explicit) return base;
  // explicit provider overrides win over preset
  return { ...base, ...explicit };
}
