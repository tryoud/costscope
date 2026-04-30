// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { resolveApiKey } from "../src/config/resolveApiKey.js";

describe("resolveApiKey", () => {
  it("returns undefined for undefined input", () => {
    expect(resolveApiKey(undefined)).toBeUndefined();
  });

  it("returns undefined for empty string", () => {
    expect(resolveApiKey("")).toBeUndefined();
  });

  it("returns a literal string unchanged", () => {
    expect(resolveApiKey("sk-literal-key")).toBe("sk-literal-key");
  });

  it("resolves ${VAR} syntax from custom env", () => {
    expect(resolveApiKey("${MY_API_KEY}", { MY_API_KEY: "resolved-value" })).toBe("resolved-value");
  });

  it("returns undefined when env var is not set", () => {
    expect(resolveApiKey("${MISSING_KEY}", {})).toBeUndefined();
  });

  it("does not resolve partial ${…} patterns — treats as literal", () => {
    expect(resolveApiKey("prefix-${VAR}", { VAR: "x" })).toBe("prefix-${VAR}");
  });

  it("resolves ${…} using process.env by default", () => {
    process.env["COSTSCOPE_TEST_KEY"] = "from-process-env";
    expect(resolveApiKey("${COSTSCOPE_TEST_KEY}")).toBe("from-process-env");
    delete process.env["COSTSCOPE_TEST_KEY"];
  });
});
