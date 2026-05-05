// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  trustFolder,
  isTrusted,
  untrustFolder,
  loadTrustStore
} from "../src/trust/trustFolders.js";

async function tempHome(): Promise<string> {
  return mkdtemp(join(tmpdir(), "costscope-trust-"));
}

describe("trustFolders", () => {
  it("isTrusted returns false for untrusted folder", async () => {
    const home = await tempHome();
    expect(await isTrusted("/some/path", home)).toBe(false);
  });

  it("trustFolder + isTrusted round-trip", async () => {
    const home = await tempHome();
    const folder = await mkdtemp(join(tmpdir(), "trusted-"));
    await trustFolder(folder, home);
    expect(await isTrusted(folder, home)).toBe(true);
  });

  it("isTrusted returns true for subfolders of trusted folder", async () => {
    const home = await tempHome();
    const folder = await mkdtemp(join(tmpdir(), "trusted-"));
    await trustFolder(folder, home);
    expect(await isTrusted(join(folder, "subdir"), home)).toBe(true);
  });

  it("untrustFolder removes the entry", async () => {
    const home = await tempHome();
    const folder = await mkdtemp(join(tmpdir(), "trusted-"));
    await trustFolder(folder, home);
    await untrustFolder(folder, home);
    expect(await isTrusted(folder, home)).toBe(false);
  });

  it("trustFolder is idempotent", async () => {
    const home = await tempHome();
    const folder = await mkdtemp(join(tmpdir(), "trusted-"));
    await trustFolder(folder, home);
    await trustFolder(folder, home);
    const store = await loadTrustStore(home);
    expect(store.trustedFolders).toHaveLength(1);
  });

  it("loadTrustStore returns empty list when no file exists", async () => {
    const home = await tempHome();
    const store = await loadTrustStore(home);
    expect(store.trustedFolders).toEqual([]);
  });
});
