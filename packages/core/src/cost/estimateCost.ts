// SPDX-License-Identifier: Apache-2.0

import type { CostEstimate, Tier } from "../types.js";
import { roughTierCost } from "./pricingTypes.js";

export function estimateCost(tier: Tier): CostEstimate {
  const estimate = roughTierCost[tier];
  return {
    tier,
    ...estimate,
    reason: [`Rough local estimate for ${tier} tier. No provider API calls are made.`]
  };
}
