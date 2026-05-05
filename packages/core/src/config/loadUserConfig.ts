// SPDX-License-Identifier: Apache-2.0

import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { CostScopeConfig } from "../types.js";

export interface PartialUserConfig {
  preset?: CostScopeConfig["preset"];
  providers?: CostScopeConfig["providers"];
  guardrails?: Partial<CostScopeConfig["guardrails"]>;
  tiers?: Partial<CostScopeConfig["tiers"]>;
}

export function userConfigPath(home: string = homedir()): string {
  return join(home, ".costscope", "config.json");
}

export async function loadUserConfig(home: string = homedir()): Promise<PartialUserConfig> {
  try {
    const raw = await readFile(userConfigPath(home), "utf8");
    return JSON.parse(raw) as PartialUserConfig;
  } catch {
    return {};
  }
}

export function mergeUserIntoProject(project: CostScopeConfig, user: PartialUserConfig): CostScopeConfig {
  return {
    ...project,
    preset: user.preset ?? project.preset,
    providers: { ...project.providers, ...(user.providers ?? {}) },
    guardrails: { ...project.guardrails, ...(user.guardrails ?? {}) },
    tiers: { ...project.tiers, ...(user.tiers ?? {}) }
  };
}
