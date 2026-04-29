// SPDX-License-Identifier: Apache-2.0

import type { FileScope, ProjectInfo, RouteDecision, TaskClassification, WorkerPrompt } from "../types.js";
import { commandBlock, listBlock } from "./templates.js";

export function generateWorkerPrompt(
  task: string,
  classification: TaskClassification,
  fileScope: FileScope,
  routeDecision: RouteDecision,
  projectInfo: ProjectInfo
): WorkerPrompt {
  const prompt = [
    `Role: You are a careful implementation worker for ${projectInfo.projectType} projects.`,
    "",
    `Task: ${task}`,
    "",
    "Project stack:",
    `- project type: ${projectInfo.projectType}`,
    `- package manager: ${projectInfo.packageManager}`,
    "",
    `Routing: ${routeDecision.tier}`,
    `Risk: ${classification.risk}`,
    "",
    listBlock("Allowed files:", fileScope.allowedFiles),
    "",
    listBlock("Maybe files:", fileScope.maybeFiles),
    "",
    listBlock("Forbidden files:", fileScope.forbiddenFiles),
    "",
    "Implementation rules:",
    "- Change only allowed files.",
    "- Do not modify forbidden files.",
    "- If another file is required, stop and explain why.",
    "- Do not install dependencies unless explicitly allowed.",
    "- Do not refactor unrelated code.",
    "- Preserve existing style.",
    "- Never read or print .env contents.",
    "",
    "Acceptance criteria:",
    "- The requested task is implemented.",
    "- Changes stay inside the allowed file scope.",
    "- Existing behavior outside the task is preserved.",
    "",
    "Check commands:",
    commandBlock([projectInfo.buildCommand, projectInfo.lintCommand, projectInfo.testCommand]),
    "",
    "Output format:",
    "- Summary of changed files.",
    "- Checks run and results.",
    "- Any requested file outside scope, if blocked."
  ].join("\n");

  return { agent: routeDecision.recommendedWorker, prompt };
}
