// SPDX-License-Identifier: Apache-2.0

import { defaultConfig, detectProject, writeConfig } from "@viberouter/core";

export async function initCommand(options: { root: string; force?: boolean }) {
  const project = await detectProject(options.root);
  const config = {
    ...defaultConfig,
    project: {
      ...defaultConfig.project,
      type: project.projectType
    },
    commands: {
      ...defaultConfig.commands,
      build: project.buildCommand ?? null,
      lint: project.lintCommand ?? null,
      test: project.testCommand ?? null
    }
  };
  const path = await writeConfig(options.root, config, Boolean(options.force));
  return { path, config };
}
