// SPDX-License-Identifier: Apache-2.0

export function uniquePaths(paths: string[]): string[] {
  return [...new Set(paths.filter(Boolean))].sort();
}

export function pathExistsInProject(projectFiles: string[], candidate: string): boolean {
  return projectFiles.includes(candidate);
}

export function maybeExisting(projectFiles: string[], candidates: string[]): string[] {
  return candidates.filter((candidate) => projectFiles.includes(candidate));
}
