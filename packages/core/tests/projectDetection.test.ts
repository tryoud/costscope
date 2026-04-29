// SPDX-License-Identifier: Apache-2.0

import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { detectCommands } from "../src/project/detectCommands.js";
import { detectPackageManager } from "../src/project/detectPackageManager.js";
import { detectProject } from "../src/project/detectProject.js";

describe("project detection", () => {
  it("detects pnpm package manager", async () => {
    const root = await tempProject();
    await writeFile(path.join(root, "pnpm-lock.yaml"), "");
    await expect(detectPackageManager(root)).resolves.toBe("pnpm");
  });

  it("detects npm package manager", async () => {
    const root = await tempProject();
    await writeFile(path.join(root, "package-lock.json"), "");
    await expect(detectPackageManager(root)).resolves.toBe("npm");
  });

  it("detects build/lint/test commands", () => {
    const commands = detectCommands({ scripts: { build: "tsup", lint: "tsc", test: "vitest" } }, "pnpm");
    expect(commands.buildCommand).toBe("pnpm run build");
    expect(commands.lintCommand).toBe("pnpm run lint");
    expect(commands.testCommand).toBe("pnpm run test");
  });

  it("detects Astro projects", async () => {
    const root = await tempProject();
    await writeFile(path.join(root, "package.json"), JSON.stringify({ dependencies: { astro: "latest" } }));
    await expect(detectProject(root)).resolves.toMatchObject({ projectType: "astro" });
  });

  it("detects generic Node projects", async () => {
    const root = await tempProject();
    await writeFile(path.join(root, "package.json"), JSON.stringify({ scripts: {} }));
    await expect(detectProject(root)).resolves.toMatchObject({ projectType: "node" });
  });

  it("detects WordPress projects", async () => {
    const root = await tempProject();
    await mkdir(path.join(root, "wp-content"));
    await expect(detectProject(root)).resolves.toMatchObject({ projectType: "wordpress" });
  });

  it("includes README files in detected files", async () => {
    const root = await tempProject();
    await writeFile(path.join(root, "package.json"), JSON.stringify({ scripts: {} }));
    await writeFile(path.join(root, "README.md"), "# Fixture\n");
    const project = await detectProject(root);
    expect(project.detectedFiles).toContain("README.md");
  });
});

async function tempProject(): Promise<string> {
  return mkdtemp(path.join(tmpdir(), "viberouter-"));
}
