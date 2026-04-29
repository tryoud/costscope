// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { estimateCost } from "../src/cost/estimateCost.js";

describe("estimateCost", () => {
  it("estimates cheap cost under balanced cost", () => {
    expect(estimateCost("cheap").estimatedTaskCostUsd).toBeLessThan(estimateCost("balanced").estimatedTaskCostUsd);
  });
});
