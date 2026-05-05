// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { resolveProvider } from "../src/config/resolveProvider.js";
import { defaultConfig } from "../src/config/defaultConfig.js";
import type { CostScopeConfig } from "../src/types.js";

describe("resolveProvider", () => {
  it("returns undefined for custom tier", () => {
    expect(resolveProvider(defaultConfig, "custom")).toBeUndefined();
  });

  it("returns cheap provider from config", () => {
    const result = resolveProvider(defaultConfig, "cheap");
    expect(result).toBeDefined();
    expect(result?.executor).toBe("vibe");
  });

  it("returns balanced provider from config", () => {
    const result = resolveProvider(defaultConfig, "balanced");
    expect(result).toBeDefined();
    expect(result?.executor).toBe("openrouter");
  });

  it("returns premium provider from config", () => {
    const result = resolveProvider(defaultConfig, "premium");
    expect(result).toBeDefined();
    expect(result?.executor).toBe("anthropic-api");
  });

  it("falls back to defaultConfig when config has no providers", () => {
    const configWithoutProviders: CostScopeConfig = { ...defaultConfig, providers: undefined };
    const result = resolveProvider(configWithoutProviders, "premium");
    expect(result).toBeDefined();
    expect(result?.executor).toBe("anthropic-api");
  });

  it("uses explicit config providers over defaultConfig", () => {
    const customConfig: CostScopeConfig = {
      ...defaultConfig,
      providers: {
        ...defaultConfig.providers,
        cheap: { executor: "aider", model: "custom-model" }
      }
    };
    const result = resolveProvider(customConfig, "cheap");
    expect(result?.executor).toBe("aider");
    expect(result?.model).toBe("custom-model");
  });
});
