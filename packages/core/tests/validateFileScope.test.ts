// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { validateFileScope } from "../src/scope/validateFileScope.js";
import type { FileScope } from "../src/types.js";

function scope(overrides: Partial<FileScope> = {}): FileScope {
  return {
    allowedFiles: [],
    maybeFiles: [],
    forbiddenFiles: [],
    reason: [],
    ...overrides
  };
}

describe("validateFileScope", () => {
  it("deduplicates allowedFiles", () => {
    const result = validateFileScope(scope({ allowedFiles: ["a.ts", "a.ts", "b.ts"] }));
    expect(result.allowedFiles).toEqual(["a.ts", "b.ts"]);
  });

  it("sorts allowedFiles alphabetically", () => {
    const result = validateFileScope(scope({ allowedFiles: ["z.ts", "a.ts"] }));
    expect(result.allowedFiles).toEqual(["a.ts", "z.ts"]);
  });

  it("deduplicates maybeFiles", () => {
    const result = validateFileScope(scope({ maybeFiles: ["x.ts", "x.ts"] }));
    expect(result.maybeFiles).toEqual(["x.ts"]);
  });

  it("deduplicates forbiddenFiles", () => {
    const result = validateFileScope(scope({ forbiddenFiles: [".env", ".env"] }));
    expect(result.forbiddenFiles).toEqual([".env"]);
  });

  it("passes reason array through unchanged", () => {
    const reasons = ["low risk task", "clear scope"];
    const result = validateFileScope(scope({ reason: reasons }));
    expect(result.reason).toEqual(reasons);
  });

  it("handles all-empty scope", () => {
    const result = validateFileScope(scope());
    expect(result.allowedFiles).toEqual([]);
    expect(result.maybeFiles).toEqual([]);
    expect(result.forbiddenFiles).toEqual([]);
  });
});
