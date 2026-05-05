// SPDX-License-Identifier: Apache-2.0

import { mkdir, readFile, writeFile, readdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

export type SessionRole = "user" | "assistant" | "tool" | "system";

export interface SessionEntry {
  timestamp: string;
  role: SessionRole;
  content: string;
  toolName?: string;
  toolArgs?: unknown;
  toolResult?: unknown;
}

export interface Session {
  id: string;
  createdAt: string;
  workdir: string;
  entries: SessionEntry[];
}

export function sessionDir(home: string = homedir()): string {
  return join(home, ".costscope", "sessions");
}

export function newSessionId(now: Date = new Date()): string {
  return `${now.toISOString().replace(/[:.]/g, "-")}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function createSession(workdir: string, home: string = homedir()): Promise<Session> {
  const id = newSessionId();
  const session: Session = {
    id,
    createdAt: new Date().toISOString(),
    workdir,
    entries: []
  };
  await saveSession(session, home);
  return session;
}

export async function saveSession(session: Session, home: string = homedir()): Promise<void> {
  const dir = join(sessionDir(home), session.id);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "transcript.json"), JSON.stringify(session, null, 2), "utf8");
}

export async function loadSession(id: string, home: string = homedir()): Promise<Session> {
  const path = join(sessionDir(home), id, "transcript.json");
  const raw = await readFile(path, "utf8");
  return JSON.parse(raw) as Session;
}

export async function listSessions(home: string = homedir()): Promise<string[]> {
  const dir = sessionDir(home);
  try {
    const entries = await readdir(dir);
    const filtered: string[] = [];
    for (const entry of entries) {
      const s = await stat(join(dir, entry));
      if (s.isDirectory()) filtered.push(entry);
    }
    return filtered.sort().reverse();
  } catch {
    return [];
  }
}

export async function appendEntry(session: Session, entry: Omit<SessionEntry, "timestamp">, home: string = homedir()): Promise<Session> {
  const updated: Session = {
    ...session,
    entries: [...session.entries, { ...entry, timestamp: new Date().toISOString() }]
  };
  await saveSession(updated, home);
  return updated;
}

export async function findLatestSession(home: string = homedir()): Promise<Session | undefined> {
  const ids = await listSessions(home);
  if (ids.length === 0) return undefined;
  const id = ids[0];
  if (!id) return undefined;
  return loadSession(id, home);
}
