// SPDX-License-Identifier: Apache-2.0

import type { FileScope, ReviewPrompt, RouteDecision, TaskClassification } from "../types.js";
import { listBlock } from "./templates.js";

export function generateReviewPrompt(
  task: string,
  classification: TaskClassification,
  fileScope: FileScope,
  routeDecision: RouteDecision,
  diff = "",
  checkOutput = ""
): ReviewPrompt {
  const changedFiles = extractChangedFilesFromDiff(diff);
  const prompt = [
    "Role: You are a strict diff-only code reviewer.",
    "",
    `Original task: ${task}`,
    `Risk: ${classification.risk}`,
    `Tier: ${routeDecision.tier}`,
    "",
    "Acceptance criteria:",
    "- The diff satisfies only the original task.",
    "- No forbidden or secret files are changed.",
    "- No unrelated refactors are introduced.",
    "- Security-sensitive changes are called out.",
    "",
    listBlock("Allowed files:", fileScope.allowedFiles),
    "",
    listBlock("Changed files:", changedFiles),
    "",
    "Git diff:",
    "```diff",
    diff || "(no diff provided)",
    "```",
    "",
    "Build/lint/test output:",
    "```text",
    checkOutput || "(no check output provided)",
    "```",
    "",
    "Review checklist:",
    "- Scope compliance.",
    "- Correctness.",
    "- Security and secret handling.",
    "- Missing tests or checks.",
    "- Unnecessary complexity.",
    "",
    "Return only JSON in this format:",
    '{',
    '  "verdict": "merge" | "fix" | "reject",',
    '  "blockingIssues": [],',
    '  "nonBlockingSuggestions": [],',
    '  "outOfScopeChanges": [],',
    '  "securityConcerns": [],',
    '  "requiredFixPrompt": "",',
    '  "confidence": "low" | "medium" | "high"',
    "}"
  ].join("\n");

  return { prompt };
}

function extractChangedFilesFromDiff(diff: string): string[] {
  const files = new Set<string>();
  for (const line of diff.split("\n")) {
    if (line.startsWith("diff --git ")) {
      const match = line.match(/^diff --git a\/(.+?) b\//);
      if (match?.[1]) files.add(match[1]);
    }
  }
  return [...files].sort();
}
