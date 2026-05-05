// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { decideTier, hasSensitiveFlags } from "../src/route/tierRules.js";
import type { FileScope, TaskClassification } from "../src/types.js";

function classification(overrides: Partial<TaskClassification> = {}): TaskClassification {
  return {
    taskType: "general",
    risk: "low",
    tier: "cheap",
    confidence: 0.9,
    flags: [],
    reason: [],
    ...overrides
  };
}

function scope(allowed: string[] = ["src/components/Hero.astro"], forbidden: string[] = []): FileScope {
  return { allowedFiles: allowed, maybeFiles: [], forbiddenFiles: forbidden, reason: [] };
}

describe("decideTier", () => {
  it("routes critical risk to premium", () => {
    const { tier } = decideTier(classification({ risk: "critical" }), scope());
    expect(tier).toBe("premium");
  });

  it("routes high risk to premium", () => {
    const { tier } = decideTier(classification({ risk: "high" }), scope());
    expect(tier).toBe("premium");
  });

  it("routes low confidence to premium", () => {
    const { tier } = decideTier(classification({ confidence: 0.4 }), scope());
    expect(tier).toBe("premium");
  });

  it("routes empty allowed files + low risk to cheap", () => {
    const { tier } = decideTier(classification({ risk: "low" }), scope([]));
    expect(tier).toBe("cheap");
  });

  it("routes empty allowed files + medium risk to premium", () => {
    const { tier } = decideTier(classification({ risk: "medium" }), scope([]));
    expect(tier).toBe("premium");
  });

  it("routes medium risk with clear scope to balanced", () => {
    const { tier } = decideTier(classification({ risk: "medium" }), scope());
    expect(tier).toBe("balanced");
  });

  it("routes low risk with clear scope to cheap", () => {
    const { tier } = decideTier(classification({ risk: "low" }), scope());
    expect(tier).toBe("cheap");
  });

  it("includes a reason in the result", () => {
    const { reason } = decideTier(classification({ risk: "low" }), scope());
    expect(reason.length).toBeGreaterThan(0);
  });
});

describe("hasSensitiveFlags", () => {
  it("returns true for auth flag", () => {
    expect(hasSensitiveFlags(classification({ flags: ["auth"] }))).toBe(true);
  });

  it("returns true for stripe flag", () => {
    expect(hasSensitiveFlags(classification({ flags: ["stripe"] }))).toBe(true);
  });

  it("returns true for deploy flag", () => {
    expect(hasSensitiveFlags(classification({ flags: ["deploy"] }))).toBe(true);
  });

  it("returns true for database flag", () => {
    expect(hasSensitiveFlags(classification({ flags: ["database"] }))).toBe(true);
  });

  it("returns false for unknown flags", () => {
    expect(hasSensitiveFlags(classification({ flags: ["faq", "hero"] }))).toBe(false);
  });

  it("returns false for empty flags", () => {
    expect(hasSensitiveFlags(classification({ flags: [] }))).toBe(false);
  });

  it("returns true when sensitive flag is mixed with other flags", () => {
    expect(hasSensitiveFlags(classification({ flags: ["ui", "migration", "layout"] }))).toBe(true);
  });
});
