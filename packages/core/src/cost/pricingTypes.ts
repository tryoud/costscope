// SPDX-License-Identifier: Apache-2.0

import type { Tier } from "../types.js";

export const roughTierCost: Record<Tier, { minUsd: number; estimatedTaskCostUsd: number; maxUsd: number }> = {
  cheap: { minUsd: 0.02, estimatedTaskCostUsd: 0.08, maxUsd: 0.25 },
  balanced: { minUsd: 0.15, estimatedTaskCostUsd: 0.45, maxUsd: 1 },
  premium: { minUsd: 0.75, estimatedTaskCostUsd: 2.5, maxUsd: 5 },
  custom: { minUsd: 0, estimatedTaskCostUsd: 0, maxUsd: 0 }
};
