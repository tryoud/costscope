// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { tierForRisk, rankRisk } from "../src/classify/riskRules.js";

describe("tierForRisk", () => {
  it("maps low risk to cheap tier", () => {
    expect(tierForRisk("low")).toBe("cheap");
  });

  it("maps medium risk to balanced tier", () => {
    expect(tierForRisk("medium")).toBe("balanced");
  });

  it("maps high risk to premium tier", () => {
    expect(tierForRisk("high")).toBe("premium");
  });

  it("maps critical risk to premium tier", () => {
    expect(tierForRisk("critical")).toBe("premium");
  });
});

describe("rankRisk", () => {
  it("low has rank 1", () => {
    expect(rankRisk("low")).toBe(1);
  });

  it("medium has rank 2", () => {
    expect(rankRisk("medium")).toBe(2);
  });

  it("high has rank 3", () => {
    expect(rankRisk("high")).toBe(3);
  });

  it("critical has rank 4", () => {
    expect(rankRisk("critical")).toBe(4);
  });

  it("critical ranks above high", () => {
    expect(rankRisk("critical")).toBeGreaterThan(rankRisk("high"));
  });

  it("high ranks above medium", () => {
    expect(rankRisk("high")).toBeGreaterThan(rankRisk("medium"));
  });

  it("medium ranks above low", () => {
    expect(rankRisk("medium")).toBeGreaterThan(rankRisk("low"));
  });
});
