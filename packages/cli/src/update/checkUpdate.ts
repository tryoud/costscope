// SPDX-License-Identifier: Apache-2.0

import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import boxen from "boxen";
import { execa } from "execa";
import pc from "picocolors";

const PACKAGE_NAME = "@costscope/cli";
const CURRENT_VERSION = "0.3.0";
const REGISTRY_URL = `https://registry.npmjs.org/${PACKAGE_NAME}/latest`;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_DIR = path.join(os.homedir(), ".costscope");
const CACHE_FILE = path.join(CACHE_DIR, "update_cache.json");

interface UpdateCache {
  latestVersion: string;
  storedAt: number;
  notifiedVersion?: string;
}

/** Check for a newer version on npm and notify the user. Never throws. */
export async function checkUpdate(): Promise<void> {
  try {
    await _checkUpdate();
  } catch {
    // update errors are never surfaced to the user
  }
}

async function _checkUpdate(): Promise<void> {
  const current = parseVersion(CURRENT_VERSION);
  if (!current) return;

  const cache = await readCache();
  const now = Date.now();

  if (cache && now - cache.storedAt < CACHE_TTL_MS) {
    const latest = parseVersion(cache.latestVersion);
    if (!latest || latest <= current) return;
    if (cache.notifiedVersion === cache.latestVersion) return;
    await notifyAndCache(CURRENT_VERSION, cache.latestVersion);
    return;
  }

  const latestVersion = await fetchLatestVersion();
  if (!latestVersion) {
    if (cache) await writeCache({ ...cache, storedAt: now });
    return;
  }

  const latest = parseVersion(latestVersion);
  if (!latest || latest <= current) {
    await writeCache({ latestVersion, storedAt: now, notifiedVersion: cache?.notifiedVersion });
    return;
  }

  if (cache?.notifiedVersion === latestVersion) {
    await writeCache({ latestVersion, storedAt: now, notifiedVersion: latestVersion });
    return;
  }

  await notifyAndCache(CURRENT_VERSION, latestVersion);
}

async function notifyAndCache(current: string, latest: string): Promise<void> {
  const result = await tryAutoUpdate();
  printBox(current, latest, result);
  await writeCache({ latestVersion: latest, storedAt: Date.now(), notifiedVersion: latest });
}

async function tryAutoUpdate(): Promise<"success" | "failed"> {
  const commands: [string, string[]][] = [
    ["npm", ["install", "--global", `${PACKAGE_NAME}@latest`]],
    ["pnpm", ["add", "--global", `${PACKAGE_NAME}@latest`]]
  ];
  for (const [bin, args] of commands) {
    try {
      await execa(bin, args, { timeout: 30_000 });
      return "success";
    } catch {
      // try next package manager
    }
  }
  return "failed";
}

async function fetchLatestVersion(): Promise<string | null> {
  try {
    const res = await fetch(REGISTRY_URL, {
      signal: AbortSignal.timeout(3000),
      headers: { accept: "application/json" }
    });
    if (!res.ok) return null;
    const data = await res.json() as { version?: string };
    return data.version ?? null;
  } catch {
    return null;
  }
}

async function readCache(): Promise<UpdateCache | null> {
  try {
    const raw = await readFile(CACHE_FILE, "utf8");
    const data = JSON.parse(raw);
    if (typeof data.latestVersion !== "string" || typeof data.storedAt !== "number") return null;
    return data as UpdateCache;
  } catch {
    return null;
  }
}

async function writeCache(cache: UpdateCache): Promise<void> {
  try {
    await mkdir(CACHE_DIR, { recursive: true });
    await writeFile(CACHE_FILE, JSON.stringify(cache, null, 2), "utf8");
  } catch {
    // ignore write errors — update cache is best-effort
  }
}

function parseVersion(v: string): number | null {
  const parts = v.replace(/^v/, "").split(".").map(Number);
  if (parts.some(isNaN)) return null;
  const [maj = 0, min = 0, pat = 0] = parts;
  return maj * 1_000_000 + min * 1_000 + pat;
}

function printBox(current: string, latest: string, result: "success" | "failed"): void {
  const content =
    result === "success"
      ? [
          pc.green(pc.bold("Update successful")),
          "",
          `  ${pc.dim(current)}  →  ${pc.green(pc.bold(latest))}`,
          "",
          pc.dim("Please restart to use the new version.")
        ].join("\n")
      : [
          pc.bold("Update available"),
          "",
          `  ${pc.dim(current)}  →  ${pc.green(pc.bold(latest))}`,
          "",
          `  ${pc.cyan(`npm install -g ${PACKAGE_NAME}`)}`
        ].join("\n");

  console.error(
    "\n" +
      boxen(content, {
        padding: { top: 1, bottom: 1, left: 2, right: 2 },
        margin: { top: 0, bottom: 1, left: 0, right: 0 },
        borderStyle: "round",
        borderColor: result === "success" ? "green" : "cyan",
        textAlignment: "center"
      })
  );
}
