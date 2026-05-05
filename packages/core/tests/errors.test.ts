// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { CostScopeError } from "../src/errors.js";

describe("CostScopeError", () => {
  it("has name 'CostScopeError'", () => {
    const err = new CostScopeError("something went wrong");
    expect(err.name).toBe("CostScopeError");
  });

  it("is an instance of Error", () => {
    expect(new CostScopeError("msg")).toBeInstanceOf(Error);
  });

  it("sets the message correctly", () => {
    const err = new CostScopeError("test message");
    expect(err.message).toBe("test message");
  });

  it("can be caught as Error", () => {
    expect(() => {
      throw new CostScopeError("thrown");
    }).toThrow(Error);
  });

  it("can be caught with the exact message", () => {
    expect(() => {
      throw new CostScopeError("exact message");
    }).toThrow("exact message");
  });
});
