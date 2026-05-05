// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { createProgram } from "../src/cli.js";

describe("createProgram", () => {
  it("registers phase 1-4 commands", () => {
    const commands = createProgram().commands.map((command) => command.name());
    expect(commands).toEqual(
      expect.arrayContaining([
        "autopilot",
        "init",
        "scan",
        "classify",
        "scope",
        "route",
        "plan",
        "prompt",
        "review-prompt",
        "check-diff",
        "guard",
        "run",
        "orchestrate",
        "cost",
        "chat",
        "mcp-server",
        "clarify"
      ])
    );
  });

  it("registers clarify command with --force and --output", () => {
    const c = createProgram().commands.find((c) => c.name() === "clarify");
    expect(c).toBeDefined();
    const flags = c?.options.map((o) => o.long);
    expect(flags).toContain("--force");
    expect(flags).toContain("--output");
  });

  it("registers chat command with profile/continue/resume options", () => {
    const program = createProgram();
    const chat = program.commands.find((c) => c.name() === "chat");
    expect(chat).toBeDefined();
    const optionFlags = chat?.options.map((o) => o.long);
    expect(optionFlags).toContain("--profile");
    expect(optionFlags).toContain("--continue");
    expect(optionFlags).toContain("--resume");
  });

  it("registers mcp-server command", () => {
    const mcp = createProgram().commands.find((c) => c.name() === "mcp-server");
    expect(mcp).toBeDefined();
  });
});
