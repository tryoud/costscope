// SPDX-License-Identifier: Apache-2.0

import path from "node:path";
import type { PackageManager } from "../types.js";
import { fileExists } from "../utils/fs.js";

export async function detectPackageManager(rootPath: string): Promise<PackageManager> {
  if (await fileExists(path.join(rootPath, "pnpm-lock.yaml"))) return "pnpm";
  if (await fileExists(path.join(rootPath, "package-lock.json"))) return "npm";
  if (await fileExists(path.join(rootPath, "yarn.lock"))) return "yarn";
  if (await fileExists(path.join(rootPath, "bun.lockb"))) return "bun";
  return "unknown";
}
