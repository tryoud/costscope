// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { estimateCost } from "../src/cost/estimateCost.js";

describe("estimateCost", () => {
  it("estimates cheap cost under balanced cost", () => {
    expect(estimateCost("cheap").estimatedTaskCostUsd).toBeLessThan(estimateCost("balanced").estimatedTaskCostUsd);
  });

  it("estimates balanced cost under premium cost", () => {
    expect(estimateCost("balanced").estimatedTaskCostUsd).toBeLessThan(estimateCost("premium").estimatedTaskCostUsd);
  });

  it("cheap estimated cost is within cheap min/max range", () => {
    const cheap = estimateCost("cheap");
    expect(cheap.estimatedTaskCostUsd).toBeGreaterThanOrEqual(cheap.minUsd);
    expect(cheap.estimatedTaskCostUsd).toBeLessThanOrEqual(cheap.maxUsd);
  });

  it("premium estimated cost is at least 1 USD", () => {
    expect(estimateCost("premium").estimatedTaskCostUsd).toBeGreaterThanOrEqual(1);
  });

  it("returns the correct tier in the result", () => {
    expect(estimateCost("cheap").tier).toBe("cheap");
    expect(estimateCost("balanced").tier).toBe("balanced");
    expect(estimateCost("premium").tier).toBe("premium");
  });

  it("includes a reason array", () => {
    const result = estimateCost("cheap");
    expect(Array.isArray(result.reason)).toBe(true);
    expect(result.reason.length).toBeGreaterThan(0);
  });
});
