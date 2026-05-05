// SPDX-License-Identifier: Apache-2.0

import type { CostScopeConfig } from "../types.js";

export const defaultConfig: CostScopeConfig = {
  version: 1,
  project: {
    type: "auto",
    defaultBranch: "main"
  },
  tiers: {
    cheap: {
      workers: ["mistral-vibe", "aider"],
      reviewer: "gpt-5.5-diff-only",
      maxTaskCostUsd: 0.25
    },
    balanced: {
      workers: ["codex", "aider"],
      reviewer: "gpt-5.5",
      maxTaskCostUsd: 1
    },
    premium: {
      workers: ["claude-code", "codex"],
      reviewer: "gpt-5.5+manual",
      maxTaskCostUsd: 5
    }
  },
  guardrails: {
    forbiddenFiles: [".env", ".env.*", "**/*.pem", "**/*.key", "**/id_rsa", "**/id_ed25519", "wp-config.php"],
    blockPackageJsonInCheapMode: true,
    blockLockfilesInCheapMode: true,
    maxDiffLinesCheap: 300,
    manualReviewForHighRisk: true
  },
  commands: {
    build: null,
    lint: null,
    test: null,
    typecheck: null
  },
  preset: "default",
  providers: {
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
  },
  handoff: {
    easyModel: "codestral-latest",
    balancedModel: "deepseek/deepseek-chat"
  }
};
