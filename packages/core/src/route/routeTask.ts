// SPDX-License-Identifier: Apache-2.0

import type { FileScope, RouteDecision, TaskClassification, VibeRouterConfig } from "../types.js";
import { defaultConfig } from "../config/defaultConfig.js";
import { recommendReviewer, recommendWorker } from "./agentRecommendations.js";
import { decideTier, hasSensitiveFlags } from "./tierRules.js";

export function routeTask(
  classification: TaskClassification,
  fileScope: FileScope,
  config: VibeRouterConfig = defaultConfig
): RouteDecision {
  const decision = decideTier(classification, fileScope);
  const tier = decision.tier;
  const manualReviewRequired =
    tier === "premium" ||
    classification.risk === "critical" ||
    (config.guardrails.manualReviewForHighRisk && classification.risk === "high");
  const autoRunAllowed =
    tier === "cheap" &&
    fileScope.allowedFiles.length > 0 &&
    !manualReviewRequired &&
    !hasSensitiveFlags(classification);

  return {
    tier,
    recommendedWorker: recommendWorker(tier, config),
    recommendedReviewer: recommendReviewer(tier, config),
    autoRunAllowed,
    manualReviewRequired,
    reason: [
      ...decision.reason,
      autoRunAllowed ? "Auto-run is allowed because risk and scope are clear." : "Manual confirmation is required before worker execution."
    ]
  };
}
