// SPDX-License-Identifier: Apache-2.0

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";

export interface TrustStore {
  trustedFolders: string[];
}

export function trustStorePath(home: string = homedir()): string {
  return join(home, ".costscope", "trusted_folders.json");
}

export async function loadTrustStore(home: string = homedir()): Promise<TrustStore> {
  try {
    const raw = await readFile(trustStorePath(home), "utf8");
    const parsed = JSON.parse(raw) as TrustStore;
    return { trustedFolders: Array.isArray(parsed.trustedFolders) ? parsed.trustedFolders : [] };
  } catch {
    return { trustedFolders: [] };
  }
}

export async function saveTrustStore(store: TrustStore, home: string = homedir()): Promise<void> {
  const path = trustStorePath(home);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(store, null, 2), "utf8");
}

export async function trustFolder(folder: string, home: string = homedir()): Promise<void> {
  const store = await loadTrustStore(home);
  const absolute = resolve(folder);
  if (!store.trustedFolders.includes(absolute)) {
    store.trustedFolders.push(absolute);
    await saveTrustStore(store, home);
  }
}

export async function isTrusted(folder: string, home: string = homedir()): Promise<boolean> {
  const store = await loadTrustStore(home);
  const absolute = resolve(folder);
  return store.trustedFolders.some((trusted) => absolute === trusted || absolute.startsWith(trusted + "/"));
}

export async function untrustFolder(folder: string, home: string = homedir()): Promise<void> {
  const store = await loadTrustStore(home);
  const absolute = resolve(folder);
  store.trustedFolders = store.trustedFolders.filter((trusted) => trusted !== absolute);
  await saveTrustStore(store, home);
}
