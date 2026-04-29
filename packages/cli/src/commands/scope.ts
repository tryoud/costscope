// SPDX-License-Identifier: Apache-2.0

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { classifyTask, detectProject, loadConfig, planFileScope, routeTask } from "@costscope/core";

export async function scopeCommand(task: string, options: { root: string; config?: string }) {
  const [project, config] = await Promise.all([detectProject(options.root), loadConfig(options.root, options.config)]);
  const classification = classifyTask(task, project);
  const fileScope = planFileScope(task, project, config);
  const route = routeTask(classification, fileScope, config);
  await writeLastScope(options.root, { task, classification, fileScope, route });
  return { classification, fileScope, route };
}

async function writeLastScope(root: string, value: unknown): Promise<void> {
  const dir = path.join(root, ".costscope");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "last-scope.json"), `${JSON.stringify(value, null, 2)}\n`);
}
