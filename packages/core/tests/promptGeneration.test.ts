// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { generateReviewPrompt } from "../src/prompt/generateReviewPrompt.js";
import { generateWorkerPrompt } from "../src/prompt/generateWorkerPrompt.js";
import type { FileScope, ProjectInfo, RouteDecision, TaskClassification } from "../src/types.js";

describe("prompt generation", () => {
  it("generates strict worker prompt", () => {
    const result = generateWorkerPrompt("Add FAQ", classification(), scope(), route(), project());
    expect(result.agent).toBe("mistral-vibe");
    expect(result.prompt).toContain("Change only allowed files.");
    expect(result.prompt).toContain("Do not modify forbidden files.");
    expect(result.prompt).toContain("src/Faq.ts");
  });

  it("generates diff-only review prompt with verdict schema", () => {
    const result = generateReviewPrompt("Add FAQ", classification(), scope(), route(), "diff --git a/src/Faq.ts b/src/Faq.ts");
    expect(result.prompt).toContain("diff-only code reviewer");
    expect(result.prompt).toContain('"verdict": "merge" | "fix" | "reject"');
    expect(result.prompt).toContain("src/Faq.ts");
  });
});

function classification(): TaskClassification {
  return { taskType: "ui-section", risk: "low", tier: "cheap", confidence: 0.8, reason: [], flags: [] };
}

function scope(): FileScope {
  return { allowedFiles: ["src/Faq.ts"], maybeFiles: [], forbiddenFiles: [".env"], reason: [] };
}

function route(): RouteDecision {
  return {
    tier: "cheap",
    recommendedWorker: "mistral-vibe",
    recommendedReviewer: "gpt-5.5-diff-only",
    autoRunAllowed: true,
    manualReviewRequired: false,
    reason: []
  };
}

function project(): ProjectInfo {
  return {
    rootPath: "/tmp/project",
    projectType: "node",
    packageManager: "pnpm",
    buildCommand: "pnpm build",
    lintCommand: "pnpm lint",
    testCommand: "pnpm test",
    importantPaths: ["src"],
    detectedFiles: ["src/Faq.ts"]
  };
}
