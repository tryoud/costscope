// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadUserConfig, mergeUserIntoProject } from "../src/config/loadUserConfig.js";
import { defaultConfig } from "../src/config/defaultConfig.js";

async function tempHome(): Promise<string> {
  return mkdtemp(join(tmpdir(), "costscope-userconfig-"));
}

async function writeUserConfig(home: string, content: object): Promise<void> {
  const dir = join(home, ".costscope");
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "config.json"), JSON.stringify(content), "utf8");
}

describe("loadUserConfig", () => {
  it("returns empty object when no user config exists", async () => {
    const home = await tempHome();
    expect(await loadUserConfig(home)).toEqual({});
  });

  it("loads partial user config", async () => {
    const home = await tempHome();
    await writeUserConfig(home, { preset: "quality" });
    const result = await loadUserConfig(home);
    expect(result.preset).toBe("quality");
  });

  it("loads guardrails overrides", async () => {
    const home = await tempHome();
    await writeUserConfig(home, { guardrails: { maxDiffLinesCheap: 500 } });
    const result = await loadUserConfig(home);
    expect(result.guardrails?.maxDiffLinesCheap).toBe(500);
  });
});

describe("mergeUserIntoProject", () => {
  it("user preset overrides project preset", () => {
    const project = { ...defaultConfig, preset: "default" as const };
    const merged = mergeUserIntoProject(project, { preset: "quality" });
    expect(merged.preset).toBe("quality");
  });

  it("project preset preserved when user has none", () => {
    const project = { ...defaultConfig, preset: "default" as const };
    const merged = mergeUserIntoProject(project, {});
    expect(merged.preset).toBe("default");
  });

  it("user guardrail overrides merge in", () => {
    const merged = mergeUserIntoProject(defaultConfig, { guardrails: { maxDiffLinesCheap: 999 } });
    expect(merged.guardrails.maxDiffLinesCheap).toBe(999);
    expect(merged.guardrails.manualReviewForHighRisk).toBe(defaultConfig.guardrails.manualReviewForHighRisk);
  });

  it("user providers extend project providers", () => {
    const merged = mergeUserIntoProject(defaultConfig, {
      providers: { cheap: { executor: "aider", model: "x" } }
    });
    expect(merged.providers?.cheap?.executor).toBe("aider");
    expect(merged.providers?.premium).toBeDefined();
  });
});
