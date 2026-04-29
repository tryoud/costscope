// SPDX-License-Identifier: Apache-2.0

import { readFile } from "node:fs/promises";
import path from "node:path";
import { CONFIG_DIR, CONFIG_FILE } from "../constants.js";
import type { CostScopeConfig } from "../types.js";
import { defaultConfig } from "./defaultConfig.js";
import { applyPreset } from "./modelPresets.js";
import { validateConfig } from "./validateConfig.js";

export async function loadConfig(rootPath: string, configPath?: string): Promise<CostScopeConfig> {
  const finalPath = configPath ?? path.join(rootPath, CONFIG_DIR, CONFIG_FILE);
  try {
    const raw = await readFile(finalPath, "utf8");
    const config = validateConfig(JSON.parse(raw));
    return config.preset ? { ...config, providers: applyPreset(config.preset, config.providers) } : config;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return defaultConfig;
    }
    throw error;
  }
}
