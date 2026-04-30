// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { listBlock, commandBlock } from "../src/prompt/templates.js";

describe("listBlock", () => {
  it("returns '- none' entry when values are empty", () => {
    const result = listBlock("Allowed files:", []);
    expect(result).toContain("- none");
    expect(result).toContain("Allowed files:");
  });

  it("prefixes each value with '- '", () => {
    const result = listBlock("Files:", ["src/index.ts", "src/utils.ts"]);
    expect(result).toContain("- src/index.ts");
    expect(result).toContain("- src/utils.ts");
  });

  it("includes the title", () => {
    const result = listBlock("My Title:", ["a"]);
    expect(result.startsWith("My Title:")).toBe(true);
  });

  it("places title on a line before values", () => {
    const result = listBlock("Header:", ["item"]);
    const lines = result.split("\n");
    expect(lines[0]).toBe("Header:");
    expect(lines[1]).toBe("- item");
  });
});

describe("commandBlock", () => {
  it("returns no-commands message when list is empty", () => {
    expect(commandBlock([])).toBe("- No project check commands detected.");
  });

  it("filters out null values", () => {
    const result = commandBlock([null, "npm test", null]);
    expect(result).toContain("- npm test");
    expect(result).not.toContain("null");
  });

  it("filters out undefined values", () => {
    const result = commandBlock([undefined, "pnpm build"]);
    expect(result).toContain("- pnpm build");
    expect(result.split("\n")).toHaveLength(1);
  });

  it("prefixes each command with '- '", () => {
    const result = commandBlock(["npm run build", "npm run lint"]);
    expect(result).toContain("- npm run build");
    expect(result).toContain("- npm run lint");
  });

  it("returns no-commands message when all values are null/undefined", () => {
    expect(commandBlock([null, undefined, null])).toBe("- No project check commands detected.");
  });
});
