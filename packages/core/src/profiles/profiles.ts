// SPDX-License-Identifier: Apache-2.0

import type { ToolName } from "../tools/types.js";

export type AgentProfile = "default" | "plan" | "accept-edits" | "auto-approve";
export type PermissionMode = "always" | "ask" | "never";
export type Permissions = Partial<Record<ToolName, PermissionMode>>;

export const profileDefaults: Record<AgentProfile, Permissions> = {
  default: {
    read_file: "always",
    grep: "always",
    write_file: "ask",
    search_replace: "ask",
    bash: "ask"
  },
  plan: {
    read_file: "always",
    grep: "always",
    write_file: "never",
    search_replace: "never",
    bash: "never"
  },
  "accept-edits": {
    read_file: "always",
    grep: "always",
    write_file: "always",
    search_replace: "always",
    bash: "ask"
  },
  "auto-approve": {
    read_file: "always",
    grep: "always",
    write_file: "always",
    search_replace: "always",
    bash: "always"
  }
};

export function permissionsFor(profile: AgentProfile, overrides: Permissions = {}): Permissions {
  return { ...profileDefaults[profile], ...overrides };
}
