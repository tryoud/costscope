// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import type { FileScope, TaskClassification } from "../src/types.js";
import { routeTask } from "../src/route/routeTask.js";

describe("routeTask", () => {
  it("routes low risk with clear scope to cheap", () => {
    const route = routeTask(classification("low", "cheap", 0.8), scope(["src/A.ts"]));
    expect(route.tier).toBe("cheap");
    expect(route.autoRunAllowed).toBe(true);
  });

  it("routes medium risk to balanced", () => {
    const route = routeTask(classification("medium", "balanced", 0.8), scope(["src/api.ts"]));
    expect(route.tier).toBe("balanced");
    expect(route.autoRunAllowed).toBe(false);
  });

  it("routes high risk to premium", () => {
    const route = routeTask(classification("high", "premium", 0.9, ["stripe"]), scope(["src/payments.ts"]));
    expect(route.tier).toBe("premium");
    expect(route.manualReviewRequired).toBe(true);
  });

  it("routes low confidence to premium", () => {
    const route = routeTask(classification("medium", "balanced", 0.4), scope(["src/thing.ts"]));
    expect(route.tier).toBe("premium");
  });

  it("keeps low-risk at cheap tier even with unclear file scope", () => {
    const route = routeTask(classification("low", "cheap", 0.8), scope([]));
    expect(route.tier).toBe("cheap");
    expect(route.autoRunAllowed).toBe(false);
  });
});

function classification(risk: TaskClassification["risk"], tier: TaskClassification["tier"], confidence: number, flags: string[] = []): TaskClassification {
  return { taskType: "general", risk, tier, confidence, reason: [], flags };
}

function scope(allowedFiles: string[]): FileScope {
  return { allowedFiles, maybeFiles: [], forbiddenFiles: [".env"], reason: [] };
}
