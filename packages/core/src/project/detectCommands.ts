// SPDX-License-Identifier: Apache-2.0

export interface PackageJsonLike {
  scripts?: Record<string, string>;
}

export function detectCommands(packageJson: PackageJsonLike | null, packageManager = "pnpm") {
  const scripts = packageJson?.scripts ?? {};
  const run = packageManager === "npm" ? "npm run" : `${packageManager} run`;
  return {
    buildCommand: scripts.build ? `${run} build` : undefined,
    lintCommand: scripts.lint ? `${run} lint` : undefined,
    testCommand: scripts.test ? `${run} test` : undefined,
    typecheckCommand: scripts.typecheck ? `${run} typecheck` : undefined
  };
}
