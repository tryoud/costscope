// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { createProgram } from "../src/cli.js";

describe("createProgram", () => {
  it("registers phase 1-4 commands", () => {
    const commands = createProgram().commands.map((command) => command.name());
    expect(commands).toEqual(
      expect.arrayContaining(["init", "scan", "classify", "scope", "route", "prompt", "review-prompt", "check-diff", "cost"])
    );
  });
});
