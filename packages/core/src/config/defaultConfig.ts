// SPDX-License-Identifier: Apache-2.0

import type { VibeRouterConfig } from "../types.js";

export const defaultConfig: VibeRouterConfig = {
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
  }
};
