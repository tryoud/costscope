// SPDX-License-Identifier: Apache-2.0

import { readFile, writeFile, mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const HISTORY_FILE = path.join(os.homedir(), ".costscope", "history");
const MAX_ENTRIES = 500;

export class ReplHistory {
  private entries: string[] = [];
  private index = -1;
  private current = "";

  static async load(): Promise<ReplHistory> {
    const h = new ReplHistory();
    try {
      const raw = await readFile(HISTORY_FILE, "utf8");
      h.entries = raw.split("\n").filter(Boolean).slice(-MAX_ENTRIES);
    } catch { /* first run */ }
    return h;
  }

  async push(entry: string): Promise<void> {
    const trimmed = entry.trim();
    if (!trimmed) return;
    // deduplicate: remove previous occurrence of same entry
    this.entries = this.entries.filter((e) => e !== trimmed);
    this.entries.push(trimmed);
    if (this.entries.length > MAX_ENTRIES) this.entries.shift();
    this.index = -1;
    try {
      await mkdir(path.dirname(HISTORY_FILE), { recursive: true });
      await writeFile(HISTORY_FILE, this.entries.join("\n") + "\n", "utf8");
    } catch { /* ignore */ }
  }

  startNavigation(current: string): void {
    this.current = current;
    this.index = this.entries.length;
  }

  previous(): string | null {
    if (this.index <= 0) return null;
    this.index--;
    return this.entries[this.index] ?? null;
  }

  next(): string | null {
    if (this.index >= this.entries.length - 1) {
      this.index = this.entries.length;
      return this.current;
    }
    this.index++;
    return this.entries[this.index] ?? null;
  }

  reset(): void {
    this.index = -1;
    this.current = "";
  }
}
