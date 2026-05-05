// SPDX-License-Identifier: Apache-2.0

import type { ToolName } from "../tools/types.js";
import type { AgentProfile, Permissions, PermissionMode } from "../profiles/profiles.js";
import { permissionsFor } from "../profiles/profiles.js";

export type PermissionDecision = "allow" | "deny" | "ask";

export interface PermissionCheckInput {
  tool: ToolName;
  args?: Record<string, unknown>;
}

export class PermissionManager {
  private permissions: Permissions;

  constructor(profile: AgentProfile = "default", overrides: Permissions = {}) {
    this.permissions = permissionsFor(profile, overrides);
  }

  modeFor(tool: ToolName): PermissionMode {
    return this.permissions[tool] ?? "ask";
  }

  check({ tool }: PermissionCheckInput): PermissionDecision {
    const mode = this.modeFor(tool);
    if (mode === "always") return "allow";
    if (mode === "never") return "deny";
    return "ask";
  }

  override(tool: ToolName, mode: PermissionMode): void {
    this.permissions[tool] = mode;
  }

  snapshot(): Permissions {
    return { ...this.permissions };
  }
}
