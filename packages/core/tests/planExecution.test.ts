// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { planExecution } from "../src/plan/planExecution.js";
import type { ProjectInfo } from "../src/types.js";

describe("planExecution", () => {
  it("splits landing page section work into mini-tasks with an integration dependency", () => {
    const plan = planExecution("Build landing page with hero, pricing and FAQ", astroProject());

    expect(plan.tasks.map((task) => task.task)).toEqual([
      "Add or update hero section",
      "Add or update FAQ section",
      "Add or update pricing section",
      "Wire updated sections into the page composition"
    ]);
    expect(plan.tasks.at(-1)?.dependsOn).toEqual(plan.tasks.slice(0, 3).map((task) => task.id));
    expect(plan.parallelGroups.some((group) => group.canRunInParallel)).toBe(true);
  });

  it("keeps narrow work as one scoped task", () => {
    const plan = planExecution("Update README docs", astroProject());

    expect(plan.tasks).toHaveLength(1);
    expect(plan.tasks[0]?.task).toBe("Update README docs");
  });
});

function astroProject(): ProjectInfo {
  return {
    rootPath: "/repo",
    projectType: "astro",
    packageManager: "pnpm",
    buildCommand: "pnpm build",
    lintCommand: undefined,
    testCommand: undefined,
    importantPaths: ["src/pages", "src/components"],
    detectedFiles: [
      "src/pages/index.astro",
      "src/components/sections/Hero.astro",
      "src/components/sections/FAQ.astro",
      "src/components/sections/Pricing.astro",
      "src/content/site.json",
      "src/styles/global.css"
    ]
  };
}

