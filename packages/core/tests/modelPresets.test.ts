// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { applyPreset, MODEL_PRESETS } from "../src/config/modelPresets.js";

describe("MODEL_PRESETS", () => {
  it("default preset uses openrouter for balanced tier", () => {
    expect(MODEL_PRESETS.default.balanced?.executor).toBe("openrouter");
    expect(MODEL_PRESETS.default.balanced?.model).toContain("deepseek");
  });

  it("student preset uses qwen for balanced tier", () => {
    expect(MODEL_PRESETS.student.balanced?.model).toContain("qwen");
  });

  it("quality preset uses anthropic-api for balanced and premium tiers", () => {
    expect(MODEL_PRESETS.quality.balanced?.executor).toBe("anthropic-api");
    expect(MODEL_PRESETS.quality.premium?.executor).toBe("anthropic-api");
  });

  it("all presets use vibe for cheap tier", () => {
    expect(MODEL_PRESETS.default.cheap?.executor).toBe("vibe");
    expect(MODEL_PRESETS.student.cheap?.executor).toBe("vibe");
    expect(MODEL_PRESETS.quality.cheap?.executor).toBe("vibe");
  });
});

describe("applyPreset", () => {
  it("returns base preset when no explicit overrides given", () => {
    const result = applyPreset("student", undefined);
    expect(result).toEqual(MODEL_PRESETS.student);
  });

  it("explicit overrides win over preset values", () => {
    const override = { cheap: { executor: "aider" as const, model: "my-custom-model" } };
    const result = applyPreset("default", override);
    expect(result.cheap?.executor).toBe("aider");
    expect(result.cheap?.model).toBe("my-custom-model");
  });

  it("non-overridden keys stay from preset", () => {
    const override = { cheap: { executor: "aider" as const, model: "x" } };
    const result = applyPreset("quality", override);
    expect(result.premium?.executor).toBe("anthropic-api");
  });

  it("applies default preset correctly", () => {
    const result = applyPreset("default", undefined);
    expect(result.premium?.executor).toBe("anthropic-api");
  });
});
