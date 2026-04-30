// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { profileDefaults, permissionsFor } from "../src/profiles/profiles.js";

describe("profileDefaults", () => {
  it("plan profile blocks all writes and bash", () => {
    expect(profileDefaults.plan.write_file).toBe("never");
    expect(profileDefaults.plan.search_replace).toBe("never");
    expect(profileDefaults.plan.bash).toBe("never");
  });

  it("plan profile allows reads", () => {
    expect(profileDefaults.plan.read_file).toBe("always");
    expect(profileDefaults.plan.grep).toBe("always");
  });

  it("auto-approve allows everything", () => {
    expect(Object.values(profileDefaults["auto-approve"])).toEqual(
      Array(5).fill("always")
    );
  });

  it("accept-edits auto-approves writes but asks for bash", () => {
    expect(profileDefaults["accept-edits"].write_file).toBe("always");
    expect(profileDefaults["accept-edits"].bash).toBe("ask");
  });

  it("default asks for writes and bash", () => {
    expect(profileDefaults.default.write_file).toBe("ask");
    expect(profileDefaults.default.bash).toBe("ask");
  });
});

describe("permissionsFor", () => {
  it("returns base profile when no overrides", () => {
    expect(permissionsFor("plan")).toEqual(profileDefaults.plan);
  });

  it("merges overrides on top of profile", () => {
    const result = permissionsFor("plan", { bash: "ask" });
    expect(result.bash).toBe("ask");
    expect(result.write_file).toBe("never");
  });

  it("override wins over profile default", () => {
    const result = permissionsFor("auto-approve", { bash: "never" });
    expect(result.bash).toBe("never");
  });
});
