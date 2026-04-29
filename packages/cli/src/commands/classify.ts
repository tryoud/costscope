// SPDX-License-Identifier: Apache-2.0

import { classifyTask, detectProject } from "@costscope/core";

export async function classifyCommand(task: string, options: { root: string }) {
  const project = await detectProject(options.root);
  return classifyTask(task, project);
}
