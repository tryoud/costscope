// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { formatNdjson, emitNdjson } from "../src/output/streaming.js";

describe("formatNdjson", () => {
  it("appends newline to JSON", () => {
    expect(formatNdjson({ type: "msg" })).toBe('{"type":"msg"}\n');
  });

  it("preserves all event fields", () => {
    expect(formatNdjson({ type: "tool_call", tool: "bash", args: { cmd: "ls" } })).toBe(
      '{"type":"tool_call","tool":"bash","args":{"cmd":"ls"}}\n'
    );
  });
});

describe("emitNdjson", () => {
  it("calls write with formatted line", () => {
    const captured: string[] = [];
    emitNdjson({ type: "x" }, (chunk) => captured.push(chunk));
    expect(captured).toEqual(['{"type":"x"}\n']);
  });
});
