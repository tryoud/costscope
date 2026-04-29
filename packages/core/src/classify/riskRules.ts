// SPDX-License-Identifier: Apache-2.0

import type { RiskLevel, Tier } from "../types.js";

export function tierForRisk(risk: RiskLevel): Tier {
  if (risk === "low") return "cheap";
  if (risk === "medium") return "balanced";
  return "premium";
}

export function rankRisk(risk: RiskLevel): number {
  return { low: 1, medium: 2, high: 3, critical: 4 }[risk];
}
