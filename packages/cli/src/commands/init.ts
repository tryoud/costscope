// SPDX-License-Identifier: Apache-2.0

import { defaultConfig, detectProject, writeConfig } from "@costscope/core";
import { setupWizard } from "./setup.js";

export interface InitOptions {
  root: string;
  force?: boolean;
  interactive?: boolean;
}

export async function initCommand(options: InitOptions) {
  const useWizard = options.interactive ?? process.stdin.isTTY;
  if (useWizard) {
    return setupWizard({ root: options.root, force: options.force });
  }
  return initSilent(options);
}

async function initSilent(options: InitOptions) {
  const project = await detectProject(options.root);
  const config = {
    ...defaultConfig,
    project: { ...defaultConfig.project, type: project.projectType },
    commands: {
      ...defaultConfig.commands,
      build: project.buildCommand ?? null,
      lint: project.lintCommand ?? null,
      test: project.testCommand ?? null
    }
  };
  const configPath = await writeConfig(options.root, config, Boolean(options.force));
  return { path: configPath, config };
}
