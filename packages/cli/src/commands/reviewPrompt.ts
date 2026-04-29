// SPDX-License-Identifier: Apache-2.0

import { classifyTask, detectProject, generateReviewPrompt, getGitDiff, loadConfig, planFileScope, routeTask } from "@viberouter/core";

export async function reviewPromptCommand(task: string, options: { root: string; config?: string; diff?: boolean }) {
  const [project, config] = await Promise.all([detectProject(options.root), loadConfig(options.root, options.config)]);
  const classification = classifyTask(task, project);
  const fileScope = planFileScope(task, project, config);
  const route = routeTask(classification, fileScope, config);
  const diff = options.diff ? await getGitDiff(options.root) : "";
  return generateReviewPrompt(task, classification, fileScope, route, diff);
}
