// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { PermissionManager } from "../src/permissions/permissionManager.js";

describe("PermissionManager", () => {
  it("allows tools set to 'always'", () => {
    const pm = new PermissionManager("auto-approve");
    expect(pm.check({ tool: "bash" })).toBe("allow");
  });

  it("denies tools set to 'never'", () => {
    const pm = new PermissionManager("plan");
    expect(pm.check({ tool: "write_file" })).toBe("deny");
  });

  it("asks for tools set to 'ask'", () => {
    const pm = new PermissionManager("default");
    expect(pm.check({ tool: "bash" })).toBe("ask");
  });

  it("modeFor returns the configured mode", () => {
    const pm = new PermissionManager("plan");
    expect(pm.modeFor("read_file")).toBe("always");
    expect(pm.modeFor("write_file")).toBe("never");
  });

  it("override changes the mode at runtime", () => {
    const pm = new PermissionManager("default");
    expect(pm.check({ tool: "bash" })).toBe("ask");
    pm.override("bash", "always");
    expect(pm.check({ tool: "bash" })).toBe("allow");
  });

  it("constructor overrides win over profile", () => {
    const pm = new PermissionManager("plan", { write_file: "always" });
    expect(pm.check({ tool: "write_file" })).toBe("allow");
  });

  it("snapshot returns a copy of permissions", () => {
    const pm = new PermissionManager("default");
    const snap = pm.snapshot();
    pm.override("bash", "always");
    expect(snap.bash).toBe("ask");
  });
});
