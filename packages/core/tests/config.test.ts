// SPDX-License-Identifier: Apache-2.0

import { mkdir, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { defaultConfig } from "../src/config/defaultConfig.js";
import { loadConfig } from "../src/config/loadConfig.js";
import { validateConfig } from "../src/config/validateConfig.js";
import { writeConfig } from "../src/config/writeConfig.js";

describe("config", () => {
  it("validates default config", () => {
    expect(validateConfig(defaultConfig)).toEqual(defaultConfig);
  });

  it("loads default config when no file exists", async () => {
    const root = await tempProject();
    await expect(loadConfig(root)).resolves.toEqual(defaultConfig);
  });

  it("writes and loads config", async () => {
    const root = await tempProject();
    await writeConfig(root, defaultConfig);
    await expect(loadConfig(root)).resolves.toEqual(defaultConfig);
  });

  it("does not overwrite config without force", async () => {
    const root = await tempProject();
    await writeConfig(root, defaultConfig);
    await expect(writeConfig(root, defaultConfig)).rejects.toThrow();
  });
});

async function tempProject(): Promise<string> {
  const root = path.join(tmpdir(), `viberouter-config-${Date.now()}-${Math.random()}`);
  await mkdir(root, { recursive: true });
  return root;
}
