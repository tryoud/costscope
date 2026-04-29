// SPDX-License-Identifier: Apache-2.0

export function summarizeDiff(diff: string): { filesChanged: number; linesAdded: number; linesRemoved: number } {
  const files = new Set<string>();
  let linesAdded = 0;
  let linesRemoved = 0;

  for (const line of diff.split("\n")) {
    if (line.startsWith("diff --git ")) files.add(line);
    if (line.startsWith("+") && !line.startsWith("+++")) linesAdded += 1;
    if (line.startsWith("-") && !line.startsWith("---")) linesRemoved += 1;
  }

  return { filesChanged: files.size, linesAdded, linesRemoved };
}
