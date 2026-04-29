// SPDX-License-Identifier: Apache-2.0

import path from "node:path";
import type { ProjectInfo, ProjectType } from "../types.js";
import { fileExists, readJsonFile } from "../utils/fs.js";
import { detectCommands } from "./detectCommands.js";
import { detectPackageManager } from "./detectPackageManager.js";
import { importantPathPresets } from "./frameworkPresets.js";
import { scanProjectTree } from "./scanProjectTree.js";

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
}

export async function detectProject(rootPath: string): Promise<ProjectInfo> {
  const packageJson = await readJsonFile<PackageJson>(path.join(rootPath, "package.json"));
  const deps = { ...(packageJson?.dependencies ?? {}), ...(packageJson?.devDependencies ?? {}) };
  const detectedFiles = await scanProjectTree(rootPath);
  const packageManager = await detectPackageManager(rootPath);
  const projectType = await inferProjectType(rootPath, deps, detectedFiles, Boolean(packageJson));
  const commands = detectCommands(packageJson, packageManager === "unknown" ? "pnpm" : packageManager);

  return {
    rootPath,
    projectType,
    packageManager,
    buildCommand: commands.buildCommand,
    lintCommand: commands.lintCommand,
    testCommand: commands.testCommand,
    importantPaths: importantPathPresets[projectType],
    detectedFiles
  };
}

async function inferProjectType(
  rootPath: string,
  deps: Record<string, string>,
  detectedFiles: string[],
  hasPackageJson: boolean
): Promise<ProjectType> {
  const has = (file: string) => detectedFiles.includes(file);
  const hasAnyConfig = async (prefix: string) =>
    detectedFiles.some((file) => file.startsWith(prefix)) || (await fileExists(path.join(rootPath, prefix)));

  if ((await hasAnyConfig("astro.config.")) || "astro" in deps) return "astro";
  if ((await hasAnyConfig("next.config.")) || "next" in deps || has("app") || has("pages")) return "nextjs";
  if (has("wp-content") || has("wp-config.php")) return "wordpress";
  if ((await hasAnyConfig("vite.config.")) || "vite" in deps) return "vite";
  if ("react" in deps) return "react";
  if (hasPackageJson) return "node";
  return "generic";
}
