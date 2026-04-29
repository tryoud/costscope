// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { classifyTask } from "../src/classify/classifyTask.js";

describe("classifyTask", () => {
  it("classifies FAQ section as low/cheap", () => {
    const result = classifyTask("Add FAQ section to homepage");
    expect(result.risk).toBe("low");
    expect(result.tier).toBe("cheap");
    expect(result.taskType).toBe("ui-section");
  });

  it("classifies Stripe checkout as high/premium", () => {
    const result = classifyTask("Add Stripe checkout");
    expect(result.risk).toBe("high");
    expect(result.tier).toBe("premium");
  });

  it("classifies Google OAuth login as high/premium", () => {
    const result = classifyTask("Add Google OAuth login");
    expect(result.risk).toBe("high");
    expect(result.tier).toBe("premium");
  });

  it("classifies contact form with email as medium/balanced", () => {
    const result = classifyTask("Add contact form with email notification");
    expect(result.risk).toBe("medium");
    expect(result.tier).toBe("balanced");
  });

  it("classifies README update as low/cheap", () => {
    const result = classifyTask("Update README quickstart docs");
    expect(result.risk).toBe("low");
    expect(result.tier).toBe("cheap");
  });

  it("classifies database migration as high/premium", () => {
    const result = classifyTask("Create database migration for users");
    expect(result.risk).toBe("high");
    expect(result.tier).toBe("premium");
  });
});
