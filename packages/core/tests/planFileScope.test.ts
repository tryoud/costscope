// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import type { ProjectInfo, ProjectType } from "../src/types.js";
import { planFileScope } from "../src/scope/planFileScope.js";

describe("planFileScope", () => {
  it("plans Astro FAQ task with index and site content", () => {
    const scope = planFileScope("Add FAQ section to homepage", project("astro", [
      "src/pages/index.astro",
      "src/content/site.json",
      "src/styles/global.css"
    ]));
    expect(scope.allowedFiles).toContain("src/components/sections/FAQ.astro");
    expect(scope.allowedFiles).toContain("src/pages/index.astro");
    expect(scope.allowedFiles).toContain("src/content/site.json");
    expect(scope.maybeFiles).toContain("src/styles/global.css");
    expect(scope.forbiddenFiles).toContain(".env");
  });

  it("plans Astro pricing task", () => {
    const scope = planFileScope("Add pricing section", project("astro", ["src/pages/index.astro", "src/content/site.json"]));
    expect(scope.allowedFiles).toContain("src/components/sections/Pricing.astro");
    expect(scope.allowedFiles).toContain("src/pages/index.astro");
  });

  it("plans Next auth task conservatively", () => {
    const scope = planFileScope("Add Google OAuth login", project("nextjs", ["app", "middleware.ts"]));
    expect(scope.allowedFiles).toEqual([]);
    expect(scope.maybeFiles).toContain("app/api/auth/**");
    expect(scope.maybeFiles).toContain("middleware.ts");
    expect(scope.forbiddenFiles).toContain(".env");
  });

  it("plans WordPress shortcode task", () => {
    const scope = planFileScope("Add newsletter shortcode", project("wordpress", ["wp-content/plugins/newsletter/newsletter.php"]));
    expect(scope.allowedFiles).toContain("wp-content/plugins/newsletter/newsletter.php");
    expect(scope.forbiddenFiles).toContain("wp-config.php");
    expect(scope.forbiddenFiles).toContain(".htaccess");
  });

  it("falls back for generic unknown tasks", () => {
    const scope = planFileScope("Make the thing better", project("generic", ["docs/notes.md"]));
    expect(scope.allowedFiles).toEqual([]);
    expect(scope.maybeFiles.length).toBeGreaterThan(0);
  });
});

function project(projectType: ProjectType, detectedFiles: string[]): ProjectInfo {
  return {
    rootPath: "/tmp/project",
    projectType,
    packageManager: "pnpm",
    importantPaths: projectType === "astro" ? ["src/pages", "src/components", "src/content", "src/styles"] : ["src", "lib", "docs"],
    detectedFiles
  };
}
