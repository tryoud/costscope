// SPDX-License-Identifier: Apache-2.0

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { CONFIG_DIR, CONFIG_FILE } from "../constants.js";
import type { CostScopeConfig } from "../types.js";
import { defaultConfig } from "./defaultConfig.js";

export async function writeConfig(rootPath: string, config: CostScopeConfig = defaultConfig, force = false): Promise<string> {
  const dir = path.join(rootPath, CONFIG_DIR);
  const file = path.join(dir, CONFIG_FILE);
  await mkdir(dir, { recursive: true });
  await writeFile(file, `${JSON.stringify(config, null, 2)}\n`, { flag: force ? "w" : "wx" });
  return file;
}
