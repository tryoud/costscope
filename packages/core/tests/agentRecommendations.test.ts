// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { recommendWorker, recommendReviewer } from "../src/route/agentRecommendations.js";
import { defaultConfig } from "../src/config/defaultConfig.js";
import type { CostScopeConfig } from "../src/types.js";

describe("recommendWorker", () => {
  it("recommends first cheap worker from default config", () => {
    expect(recommendWorker("cheap")).toBe(defaultConfig.tiers.cheap.workers[0]);
  });

  it("recommends first balanced worker from default config", () => {
    expect(recommendWorker("balanced")).toBe(defaultConfig.tiers.balanced.workers[0]);
  });

  it("recommends first premium worker from default config", () => {
    expect(recommendWorker("premium")).toBe(defaultConfig.tiers.premium.workers[0]);
  });

  it("recommends generic-custom-agent for custom tier", () => {
    expect(recommendWorker("custom")).toBe("generic-custom-agent");
  });

  it("uses override config for cheap tier", () => {
    const config: CostScopeConfig = {
      ...defaultConfig,
      tiers: { ...defaultConfig.tiers, cheap: { ...defaultConfig.tiers.cheap, workers: ["my-cheap-agent"] } }
    };
    expect(recommendWorker("cheap", config)).toBe("my-cheap-agent");
  });

  it("uses override config for premium tier", () => {
    const config: CostScopeConfig = {
      ...defaultConfig,
      tiers: { ...defaultConfig.tiers, premium: { ...defaultConfig.tiers.premium, workers: ["super-agent"] } }
    };
    expect(recommendWorker("premium", config)).toBe("super-agent");
  });
});

describe("recommendReviewer", () => {
  it("recommends cheap reviewer from default config", () => {
    expect(recommendReviewer("cheap")).toBe(defaultConfig.tiers.cheap.reviewer);
  });

  it("recommends balanced reviewer from default config", () => {
    expect(recommendReviewer("balanced")).toBe(defaultConfig.tiers.balanced.reviewer);
  });

  it("recommends premium reviewer from default config", () => {
    expect(recommendReviewer("premium")).toBe(defaultConfig.tiers.premium.reviewer);
  });

  it("recommends custom-reviewer for custom tier", () => {
    expect(recommendReviewer("custom")).toBe("custom-reviewer");
  });

  it("uses override config for balanced reviewer", () => {
    const config: CostScopeConfig = {
      ...defaultConfig,
      tiers: { ...defaultConfig.tiers, balanced: { ...defaultConfig.tiers.balanced, reviewer: "my-reviewer" } }
    };
    expect(recommendReviewer("balanced", config)).toBe("my-reviewer");
  });
});
