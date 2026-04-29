// SPDX-License-Identifier: Apache-2.0

export type ProjectType = "astro" | "nextjs" | "vite" | "react" | "wordpress" | "node" | "generic";
export type PackageManager = "pnpm" | "npm" | "yarn" | "bun" | "unknown";
export type RiskLevel = "low" | "medium" | "high" | "critical";
export type Tier = "cheap" | "balanced" | "premium" | "custom";

export interface ProjectInfo {
  rootPath: string;
  projectType: ProjectType;
  packageManager: PackageManager;
  buildCommand?: string;
  lintCommand?: string;
  testCommand?: string;
  importantPaths: string[];
  detectedFiles: string[];
}

export interface TaskInput {
  task: string;
  projectInfo?: ProjectInfo;
  userHints?: string[];
  desiredTier?: Tier;
}

export interface FileScope {
  allowedFiles: string[];
  maybeFiles: string[];
  forbiddenFiles: string[];
  reason: string[];
}

export interface TaskClassification {
  taskType: string;
  risk: RiskLevel;
  tier: Tier;
  confidence: number;
  reason: string[];
  flags: string[];
}

export interface RouteDecision {
  tier: Tier;
  recommendedWorker: string;
  recommendedReviewer: string;
  autoRunAllowed: boolean;
  manualReviewRequired: boolean;
  reason: string[];
}

export interface WorkerPrompt {
  agent: string;
  prompt: string;
}

export interface ReviewPrompt {
  prompt: string;
}

export interface DiffScopeResult {
  ok: boolean;
  changedFiles: string[];
  allowedFiles: string[];
  outOfScopeFiles: string[];
  forbiddenTouched: string[];
  verdict: "pass" | "block" | "needs-review";
  reason: string[];
}

export interface CostEstimate {
  tier: Tier;
  estimatedTaskCostUsd: number;
  minUsd: number;
  maxUsd: number;
  reason: string[];
}

export interface CostScopeConfig {
  version: 1;
  project: {
    type: "auto" | ProjectType;
    defaultBranch: string;
  };
  tiers: {
    cheap: TierConfig;
    balanced: TierConfig;
    premium: TierConfig;
  };
  guardrails: {
    forbiddenFiles: string[];
    blockPackageJsonInCheapMode: boolean;
    blockLockfilesInCheapMode: boolean;
    maxDiffLinesCheap: number;
    manualReviewForHighRisk: boolean;
  };
  commands: {
    build: string | null;
    lint: string | null;
    test: string | null;
    typecheck: string | null;
  };
}

export interface TierConfig {
  workers: string[];
  reviewer: string;
  maxTaskCostUsd: number;
}
