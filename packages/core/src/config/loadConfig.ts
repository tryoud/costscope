// SPDX-License-Identifier: Apache-2.0

import { readFile } from "node:fs/promises";
import path from "node:path";
import { CONFIG_DIR, CONFIG_FILE } from "../constants.js";
import type { VibeRouterConfig } from "../types.js";
import { defaultConfig } from "./defaultConfig.js";
import { validateConfig } from "./validateConfig.js";

export async function loadConfig(rootPath: string, configPath?: string): Promise<VibeRouterConfig> {
  const finalPath = configPath ?? path.join(rootPath, CONFIG_DIR, CONFIG_FILE);
  try {
    const raw = await readFile(finalPath, "utf8");
    return validateConfig(JSON.parse(raw));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return defaultConfig;
    }
    throw error;
  }
}
