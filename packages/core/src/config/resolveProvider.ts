// SPDX-License-Identifier: Apache-2.0

import type { CostScopeConfig, ProviderConfig, Tier } from "../types.js";
import { defaultConfig } from "./defaultConfig.js";

export function resolveProvider(config: CostScopeConfig, tier: Tier): ProviderConfig | undefined {
  if (tier === "custom") return undefined;
  return config.providers?.[tier] ?? defaultConfig.providers?.[tier];
}

