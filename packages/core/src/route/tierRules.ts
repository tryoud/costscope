// SPDX-License-Identifier: Apache-2.0

import type { FileScope, TaskClassification, Tier } from "../types.js";

export function decideTier(classification: TaskClassification, fileScope: FileScope): { tier: Tier; reason: string[] } {
  const reason: string[] = [];

  if (classification.risk === "critical" || classification.risk === "high") {
    reason.push(`${classification.risk} risk requires premium routing.`);
    return { tier: "premium", reason };
  }

  if (classification.confidence < 0.5) {
    reason.push("Low classification confidence requires premium review.");
    return { tier: "premium", reason };
  }

  if (fileScope.allowedFiles.length === 0) {
    const tier = classification.risk === "low" ? "cheap" : "premium";
    reason.push("No clear allowed file scope was found; manual confirmation required.");
    return { tier, reason };
  }

  if (classification.risk === "medium") {
    reason.push("Medium risk tasks use balanced routing.");
    return { tier: "balanced", reason };
  }

  reason.push("Low risk task with clear file scope can use cheap routing.");
  return { tier: "cheap", reason };
}

export function hasSensitiveFlags(classification: TaskClassification): boolean {
  return classification.flags.some((flag) =>
    ["auth", "oauth", "login", "permission", "role", "stripe", "payment", "database", "migration", "security", "secret", "env", "deploy", "production"].includes(flag)
  );
}
