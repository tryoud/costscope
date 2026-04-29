// SPDX-License-Identifier: Apache-2.0

import type { Tier, VibeRouterConfig } from "../types.js";
import { defaultConfig } from "../config/defaultConfig.js";

export function recommendWorker(tier: Tier, config: VibeRouterConfig = defaultConfig): string {
  if (tier === "cheap") return config.tiers.cheap.workers[0] ?? "mistral-vibe";
  if (tier === "balanced") return config.tiers.balanced.workers[0] ?? "codex";
  if (tier === "custom") return "generic-custom-agent";
  return config.tiers.premium.workers[0] ?? "claude-code";
}

export function recommendReviewer(tier: Tier, config: VibeRouterConfig = defaultConfig): string {
  if (tier === "cheap") return config.tiers.cheap.reviewer;
  if (tier === "balanced") return config.tiers.balanced.reviewer;
  if (tier === "custom") return "custom-reviewer";
  return config.tiers.premium.reviewer;
}
