// SPDX-License-Identifier: Apache-2.0

import type { CostScopeConfig, ProjectInfo, ProviderConfig } from "../types.js";
import type { LlmMessage } from "../llm/call.js";
import { callLlm } from "../llm/call.js";
import { resolveProvider } from "../config/resolveProvider.js";
import type { ClarifyQuestion } from "./types.js";
import { parseClarifyResponse } from "./parseClarifyResponse.js";

export type LlmCaller = (provider: ProviderConfig, messages: LlmMessage[]) => Promise<string>;

export interface GenerateQuestionsOptions {
  task: string;
  config: CostScopeConfig;
  projectInfo?: ProjectInfo;
  llmCaller?: LlmCaller;
}

const SYSTEM_PROMPT = `You are a senior software engineer scoping ambiguous coding tasks before passing them to a coding agent.
Your only job is to ask clarifying multiple-choice questions that change WHICH FILES the agent should touch or WHAT RISK applies.

Return STRICT JSON in this exact shape:
{
  "questions": [
    {
      "id": "short-id",
      "question": "Question text?",
      "options": [
        { "label": "first option", "recommended": true },
        { "label": "second option" },
        { "label": "third option" }
      ]
    }
  ]
}

Rules:
- 3 to 10 questions total. Default to 4-6 unless the task is unusually broad.
- Each question MUST have EXACTLY 3 options.
- Mark exactly ONE option as "recommended": true — the safest, most common choice.
- Skip cosmetic preferences (colors, copy). Focus on architecture, scope, integrations, data sources, target audience.
- Each question must be answerable without writing code.
- No prose outside the JSON. No markdown fences.`;

function buildUserPrompt(task: string, projectInfo?: ProjectInfo): string {
  const lines = [`Task from user: ${task}`];
  if (projectInfo) {
    lines.push(`Project type: ${projectInfo.projectType}`);
    if (projectInfo.importantPaths.length > 0) {
      lines.push(`Important paths: ${projectInfo.importantPaths.slice(0, 8).join(", ")}`);
    }
  }
  lines.push("", "Generate clarifying questions now.");
  return lines.join("\n");
}

export async function generateQuestions(options: GenerateQuestionsOptions): Promise<ClarifyQuestion[]> {
  const provider =
    resolveProvider(options.config, "balanced") ??
    resolveProvider(options.config, "premium") ??
    resolveProvider(options.config, "cheap");
  if (!provider) {
    throw new Error("No provider configured for clarify questions. Run `costscope init` first.");
  }
  const caller = options.llmCaller ?? callLlm;
  const text = await caller(provider, [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: buildUserPrompt(options.task, options.projectInfo) }
  ]);
  return parseClarifyResponse(text);
}

export const _testing = { SYSTEM_PROMPT, buildUserPrompt };
