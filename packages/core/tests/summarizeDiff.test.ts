// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { summarizeDiff } from "../src/diff/summarizeDiff.js";

const SIMPLE_DIFF = `diff --git a/src/index.ts b/src/index.ts
index abc..def 100644
--- a/src/index.ts
+++ b/src/index.ts
@@ -1,3 +1,4 @@
 const x = 1;
-const y = 2;
+const y = 3;
+const z = 4;`;

const TWO_FILE_DIFF = `diff --git a/src/a.ts b/src/a.ts
index abc..def 100644
--- a/src/a.ts
+++ b/src/a.ts
@@ -1,2 +1,2 @@
-old line
+new line
diff --git a/src/b.ts b/src/b.ts
index 111..222 100644
--- a/src/b.ts
+++ b/src/b.ts
@@ -1,1 +1,2 @@
 unchanged
+added line`;

describe("summarizeDiff", () => {
  it("returns zeros for empty string", () => {
    expect(summarizeDiff("")).toEqual({ filesChanged: 0, linesAdded: 0, linesRemoved: 0 });
  });

  it("counts files from diff --git headers", () => {
    expect(summarizeDiff(SIMPLE_DIFF).filesChanged).toBe(1);
  });

  it("counts added lines (+ prefix, not +++)", () => {
    expect(summarizeDiff(SIMPLE_DIFF).linesAdded).toBe(2);
  });

  it("counts removed lines (- prefix, not ---)", () => {
    expect(summarizeDiff(SIMPLE_DIFF).linesRemoved).toBe(1);
  });

  it("does not count +++ lines as added", () => {
    const { linesAdded } = summarizeDiff(SIMPLE_DIFF);
    expect(linesAdded).toBe(2);
  });

  it("does not count --- lines as removed", () => {
    const { linesRemoved } = summarizeDiff(SIMPLE_DIFF);
    expect(linesRemoved).toBe(1);
  });

  it("counts multiple files correctly", () => {
    expect(summarizeDiff(TWO_FILE_DIFF).filesChanged).toBe(2);
  });

  it("counts additions across multiple files", () => {
    expect(summarizeDiff(TWO_FILE_DIFF).linesAdded).toBe(2);
  });

  it("counts removals across multiple files", () => {
    expect(summarizeDiff(TWO_FILE_DIFF).linesRemoved).toBe(1);
  });
});
