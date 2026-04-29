// SPDX-License-Identifier: Apache-2.0

import { detectProject, loadConfig, planExecution } from "@costscope/core";

export async function planCommand(goal: string, options: { root: string; config?: string }) {
  const [project, config] = await Promise.all([detectProject(options.root), loadConfig(options.root, options.config)]);
  return planExecution(goal, project, config);
}

