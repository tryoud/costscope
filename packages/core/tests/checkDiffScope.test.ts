// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { checkDiffScope } from "../src/diff/checkDiffScope.js";
import type { FileScope } from "../src/types.js";

describe("checkDiffScope", () => {
  it("passes changed files inside allowed scope", () => {
    const result = checkDiffScope(["src/Foo.ts"], scope());
    expect(result.verdict).toBe("pass");
    expect(result.ok).toBe(true);
  });

  it("marks maybe files as needs-review", () => {
    const result = checkDiffScope(["src/global.css"], scope());
    expect(result.verdict).toBe("needs-review");
  });

  it("blocks forbidden .env changes", () => {
    const result = checkDiffScope([".env"], scope());
    expect(result.verdict).toBe("block");
    expect(result.forbiddenTouched).toContain(".env");
  });

  it("blocks package.json in cheap mode", () => {
    const result = checkDiffScope(["package.json"], scope(["package.json"]), "cheap");
    expect(result.verdict).toBe("block");
  });

  it("allows package.json outside cheap mode when explicitly allowed", () => {
    const result = checkDiffScope(["package.json"], scope(["package.json"]), "balanced");
    expect(result.verdict).toBe("pass");
  });

  it("blocks .pem files as high-risk regardless of scope", () => {
    const result = checkDiffScope(["certs/server.pem"], scope(["certs/server.pem"]));
    expect(result.verdict).toBe("block");
    expect(result.forbiddenTouched).toContain("certs/server.pem");
  });

  it("blocks next.config.mjs in cheap mode via .* glob pattern", () => {
    const result = checkDiffScope(["next.config.mjs"], scope(["src/Foo.ts"]), "cheap");
    expect(result.verdict).toBe("block");
  });

  it("blocks tsconfig.json in cheap mode", () => {
    const result = checkDiffScope(["tsconfig.json"], scope(["src/Foo.ts"]), "cheap");
    expect(result.verdict).toBe("block");
  });
});

function scope(allowedFiles = ["src/Foo.ts"]): FileScope {
  return {
    allowedFiles,
    maybeFiles: ["src/global.css"],
    forbiddenFiles: [".env", ".env.*", "**/*.pem", "**/*.key"],
    reason: []
  };
}
