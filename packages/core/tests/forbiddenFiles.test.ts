// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { defaultForbiddenFiles, cheapModeForbiddenFiles } from "../src/scope/forbiddenFiles.js";

describe("defaultForbiddenFiles", () => {
  it("includes .env", () => {
    expect(defaultForbiddenFiles).toContain(".env");
  });

  it("includes .env.* glob", () => {
    expect(defaultForbiddenFiles).toContain(".env.*");
  });

  it("includes pem glob pattern", () => {
    expect(defaultForbiddenFiles).toContain("**/*.pem");
  });

  it("includes key glob pattern", () => {
    expect(defaultForbiddenFiles).toContain("**/*.key");
  });

  it("includes id_rsa", () => {
    expect(defaultForbiddenFiles).toContain("**/id_rsa");
  });

  it("includes id_ed25519", () => {
    expect(defaultForbiddenFiles).toContain("**/id_ed25519");
  });

  it("includes common lock files", () => {
    expect(defaultForbiddenFiles).toContain("package-lock.json");
    expect(defaultForbiddenFiles).toContain("pnpm-lock.yaml");
    expect(defaultForbiddenFiles).toContain("yarn.lock");
    expect(defaultForbiddenFiles).toContain("bun.lockb");
  });

  it("includes wp-config.php", () => {
    expect(defaultForbiddenFiles).toContain("wp-config.php");
  });
});

describe("cheapModeForbiddenFiles", () => {
  it("includes package.json", () => {
    expect(cheapModeForbiddenFiles).toContain("package.json");
  });

  it("includes tsconfig.json", () => {
    expect(cheapModeForbiddenFiles).toContain("tsconfig.json");
  });

  it("includes framework config globs", () => {
    expect(cheapModeForbiddenFiles).toContain("astro.config.*");
    expect(cheapModeForbiddenFiles).toContain("next.config.*");
    expect(cheapModeForbiddenFiles).toContain("vite.config.*");
  });

  it("includes turbo.json", () => {
    expect(cheapModeForbiddenFiles).toContain("turbo.json");
  });

  it("does not include .env (that's in defaultForbiddenFiles)", () => {
    expect(cheapModeForbiddenFiles).not.toContain(".env");
  });
});
