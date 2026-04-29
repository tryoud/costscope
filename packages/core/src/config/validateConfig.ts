// SPDX-License-Identifier: Apache-2.0

import { z } from "zod";
import type { CostScopeConfig } from "../types.js";

const tierConfigSchema = z.object({
  workers: z.array(z.string()).min(1),
  reviewer: z.string(),
  maxTaskCostUsd: z.number().nonnegative()
});

export const configSchema = z.object({
  version: z.literal(1),
  project: z.object({
    type: z.union([
      z.literal("auto"),
      z.literal("astro"),
      z.literal("nextjs"),
      z.literal("vite"),
      z.literal("react"),
      z.literal("wordpress"),
      z.literal("node"),
      z.literal("generic")
    ]),
    defaultBranch: z.string()
  }),
  tiers: z.object({
    cheap: tierConfigSchema,
    balanced: tierConfigSchema,
    premium: tierConfigSchema
  }),
  guardrails: z.object({
    forbiddenFiles: z.array(z.string()),
    blockPackageJsonInCheapMode: z.boolean(),
    blockLockfilesInCheapMode: z.boolean(),
    maxDiffLinesCheap: z.number().int().positive(),
    manualReviewForHighRisk: z.boolean()
  }),
  commands: z.object({
    build: z.string().nullable(),
    lint: z.string().nullable(),
    test: z.string().nullable(),
    typecheck: z.string().nullable()
  })
});

export function validateConfig(config: unknown): CostScopeConfig {
  return configSchema.parse(config);
}
