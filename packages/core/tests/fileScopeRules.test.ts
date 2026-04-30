// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { likelyDirectories, keywordTokens } from "../src/scope/fileScopeRules.js";
import type { ProjectInfo } from "../src/types.js";

function projectInfo(importantPaths: string[]): ProjectInfo {
  return {
    type: "generic",
    packageManager: "npm",
    importantPaths,
    detectedFiles: [],
    commands: { build: null, linter: null, test: null, typecheck: null }
  };
}

describe("likelyDirectories", () => {
  it("appends /** to paths without trailing slash", () => {
    const result = likelyDirectories(projectInfo(["src", "public"]));
    expect(result).toContain("src/**");
    expect(result).toContain("public/**");
  });

  it("keeps paths with trailing slash as-is (no ** appended)", () => {
    const result = likelyDirectories(projectInfo(["src/"]));
    expect(result).toContain("src/");
    expect(result).not.toContain("src/**");
  });

  it("returns empty array for empty importantPaths", () => {
    expect(likelyDirectories(projectInfo([]))).toEqual([]);
  });

  it("produces one glob entry per path", () => {
    const result = likelyDirectories(projectInfo(["a", "b", "c"]));
    expect(result).toHaveLength(3);
  });
});

describe("keywordTokens", () => {
  it("lowercases all tokens", () => {
    const result = keywordTokens("Add FAQ Section");
    expect(result).toContain("faq");
    expect(result).toContain("section");
  });

  it("splits on non-alphanumeric characters", () => {
    const result = keywordTokens("hero-section_layout");
    expect(result).toContain("hero");
    expect(result).toContain("section");
    expect(result).toContain("layout");
  });

  it("filters tokens shorter than 3 characters", () => {
    const result = keywordTokens("add an ui section");
    expect(result).not.toContain("an");
    expect(result).not.toContain("ui");
    expect(result).toContain("section");
  });

  it("removes stopwords: add, the, and, with, for, from", () => {
    const result = keywordTokens("add the pricing section and update it from the admin with form");
    expect(result).not.toContain("add");
    expect(result).not.toContain("the");
    expect(result).not.toContain("and");
    expect(result).not.toContain("with");
    expect(result).not.toContain("for");
    expect(result).not.toContain("from");
    expect(result).toContain("pricing");
    expect(result).toContain("section");
    expect(result).toContain("update");
    expect(result).toContain("admin");
    expect(result).toContain("form");
  });

  it("returns empty array for empty string", () => {
    expect(keywordTokens("")).toEqual([]);
  });
});
