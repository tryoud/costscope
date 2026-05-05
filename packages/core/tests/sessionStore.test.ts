// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createSession,
  saveSession,
  loadSession,
  listSessions,
  appendEntry,
  findLatestSession,
  newSessionId
} from "../src/session/sessionStore.js";

async function tempHome(): Promise<string> {
  return mkdtemp(join(tmpdir(), "costscope-home-"));
}

describe("sessionStore", () => {
  it("creates and loads a session", async () => {
    const home = await tempHome();
    const session = await createSession("/work/dir", home);
    const loaded = await loadSession(session.id, home);
    expect(loaded.id).toBe(session.id);
    expect(loaded.workdir).toBe("/work/dir");
    expect(loaded.entries).toEqual([]);
  });

  it("appendEntry adds an entry with timestamp", async () => {
    const home = await tempHome();
    const session = await createSession("/work", home);
    const updated = await appendEntry(session, { role: "user", content: "hello" }, home);
    expect(updated.entries).toHaveLength(1);
    expect(updated.entries[0]?.content).toBe("hello");
    expect(updated.entries[0]?.timestamp).toBeDefined();
  });

  it("listSessions returns all session ids sorted reverse-chronologically", async () => {
    const home = await tempHome();
    await createSession("/a", home);
    await new Promise((r) => setTimeout(r, 5));
    const second = await createSession("/b", home);
    const ids = await listSessions(home);
    expect(ids[0]).toBe(second.id);
  });

  it("listSessions returns empty array when no sessions exist", async () => {
    const home = await tempHome();
    expect(await listSessions(home)).toEqual([]);
  });

  it("findLatestSession returns most recent", async () => {
    const home = await tempHome();
    await createSession("/old", home);
    await new Promise((r) => setTimeout(r, 5));
    const newest = await createSession("/new", home);
    const latest = await findLatestSession(home);
    expect(latest?.id).toBe(newest.id);
  });

  it("findLatestSession returns undefined when no sessions exist", async () => {
    const home = await tempHome();
    expect(await findLatestSession(home)).toBeUndefined();
  });

  it("newSessionId returns unique values", () => {
    const a = newSessionId();
    const b = newSessionId();
    expect(a).not.toBe(b);
  });

  it("saveSession persists the session to disk", async () => {
    const home = await tempHome();
    const session = await createSession("/x", home);
    const updated = { ...session, entries: [{ timestamp: "now", role: "user" as const, content: "hi" }] };
    await saveSession(updated, home);
    const loaded = await loadSession(session.id, home);
    expect(loaded.entries).toHaveLength(1);
  });
});
