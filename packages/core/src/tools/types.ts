// SPDX-License-Identifier: Apache-2.0

export type ToolName = "read_file" | "write_file" | "search_replace" | "bash" | "grep";

export interface ToolResult<T> {
  ok: boolean;
  output?: T;
  error?: string;
}

export interface ReadFileInput {
  path: string;
  offset?: number;
  limit?: number;
}

export interface ReadFileOutput {
  content: string;
  totalLines: number;
}

export interface WriteFileInput {
  path: string;
  content: string;
  createDirs?: boolean;
}

export interface WriteFileOutput {
  bytesWritten: number;
  created: boolean;
}

export interface SearchReplaceInput {
  path: string;
  oldString: string;
  newString: string;
  replaceAll?: boolean;
}

export interface SearchReplaceOutput {
  replacements: number;
}

export interface BashInput {
  command: string;
  cwd?: string;
  timeoutMs?: number;
}

export interface BashOutput {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface GrepInput {
  pattern: string;
  path?: string;
  glob?: string;
  caseInsensitive?: boolean;
}

export interface GrepMatch {
  file: string;
  line: number;
  text: string;
}

export interface GrepOutput {
  matches: GrepMatch[];
}
