// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { uniquePaths, maybeExisting } from "../src/scope/pathMatchers.js";

describe("uniquePaths", () => {
  it("returns empty array for empty input", () => {
    expect(uniquePaths([])).toEqual([]);
  });

  it("removes duplicate paths", () => {
    const result = uniquePaths(["src/a.ts", "src/a.ts", "src/b.ts"]);
    expect(result).toEqual(["src/a.ts", "src/b.ts"]);
  });

  it("sorts paths alphabetically", () => {
    const result = uniquePaths(["src/z.ts", "src/a.ts", "src/m.ts"]);
    expect(result).toEqual(["src/a.ts", "src/m.ts", "src/z.ts"]);
  });

  it("filters out empty strings", () => {
    const result = uniquePaths(["", "src/a.ts", ""]);
    expect(result).toEqual(["src/a.ts"]);
  });

  it("deduplicates and sorts together", () => {
    const result = uniquePaths(["b.ts", "a.ts", "b.ts", "a.ts"]);
    expect(result).toEqual(["a.ts", "b.ts"]);
  });
});

describe("maybeExisting", () => {
  const projectFiles = ["src/index.ts", "src/utils.ts", "public/logo.svg"];

  it("returns only candidates present in projectFiles", () => {
    const result = maybeExisting(projectFiles, ["src/index.ts", "src/missing.ts"]);
    expect(result).toEqual(["src/index.ts"]);
  });

  it("returns empty array when no candidates match", () => {
    const result = maybeExisting(projectFiles, ["nonexistent.ts"]);
    expect(result).toEqual([]);
  });

  it("returns all candidates when all match", () => {
    const result = maybeExisting(projectFiles, ["src/index.ts", "src/utils.ts"]);
    expect(result).toEqual(["src/index.ts", "src/utils.ts"]);
  });

  it("returns empty array for empty candidates", () => {
    expect(maybeExisting(projectFiles, [])).toEqual([]);
  });

  it("returns empty array when projectFiles is empty", () => {
    expect(maybeExisting([], ["src/index.ts"])).toEqual([]);
  });
});
