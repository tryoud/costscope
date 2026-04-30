// SPDX-License-Identifier: Apache-2.0

/**
 * Session management for REPL.
 * Handles chat history, session persistence, and multiline input.
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

export interface SessionMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  tokenCount?: number;
  model?: string;
  tier?: string;
  status?: "done" | "stopped" | "failed" | "running";
}

export interface ReplSession {
  id: string;
  createdAt: number;
  updatedAt: number;
  messages: SessionMessage[];
  theme: string;
  modelPreset: string;
  tokenCount: number;
}

const SESSION_DIR = path.join(os.homedir(), ".costscope", "sessions");
const ACTIVE_SESSION_FILE = path.join(SESSION_DIR, "active.json");

// Ensure session directory exists
async function ensureSessionDir(): Promise<void> {
  await mkdir(SESSION_DIR, { recursive: true });
}

/**
 * Generate a unique ID for messages/sessions.
 */
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

/**
 * Create a new session.
 */
export async function createSession(): Promise<ReplSession> {
  await ensureSessionDir();
  
  const session: ReplSession = {
    id: generateId(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messages: [],
    theme: "dark",
    modelPreset: "default",
    tokenCount: 0
  };
  
  await saveSession(session);
  await setActiveSession(session.id);
  
  return session;
}

/**
 * Load the active session or create a new one.
 */
export async function loadActiveSession(): Promise<ReplSession> {
  await ensureSessionDir();
  
  try {
    const activeId = await readActiveSessionId();
    if (activeId) {
      const session = await loadSession(activeId);
      if (session) return session;
    }
  } catch {
    // No active session or error loading
  }
  
  // Create new session
  return createSession();
}

/**
 * Save a session to disk.
 */
async function saveSession(session: ReplSession): Promise<void> {
  const filePath = path.join(SESSION_DIR, `${session.id}.json`);
  await writeFile(filePath, JSON.stringify(session, null, 2), "utf8");
}

/**
 * Load a session from disk.
 */
async function loadSession(id: string): Promise<ReplSession | null> {
  const filePath = path.join(SESSION_DIR, `${id}.json`);
  try {
    const raw = await readFile(filePath, "utf8");
    const session = JSON.parse(raw) as ReplSession;
    return session;
  } catch {
    return null;
  }
}

/**
 * Read the active session ID.
 */
async function readActiveSessionId(): Promise<string | null> {
  try {
    const raw = await readFile(ACTIVE_SESSION_FILE, "utf8");
    return JSON.parse(raw).id ?? null;
  } catch {
    return null;
  }
}

/**
 * Set the active session ID.
 */
async function setActiveSession(id: string): Promise<void> {
  await writeFile(ACTIVE_SESSION_FILE, JSON.stringify({ id }), "utf8");
}

/**
 * Add a message to the current session.
 */
export async function addMessage(session: ReplSession, message: Omit<SessionMessage, "id" | "timestamp">): Promise<ReplSession> {
  const newMessage: SessionMessage = {
    id: generateId(),
    timestamp: Date.now(),
    ...message
  };
  
  session.messages.push(newMessage);
  session.updatedAt = Date.now();
  session.tokenCount += message.tokenCount ?? 0;
  
  await saveSession(session);
  
  return session;
}

/**
 * Get all previous messages from the session (for context).
 */
export function getSessionContext(session: ReplSession, maxTokens: number = 4096): string {
  const messages = [...session.messages];
  
  // Calculate which messages fit in the token budget
  let totalTokens = 0;
  const contextMessages: SessionMessage[] = [];
  
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    const msgTokens = msg.tokenCount ?? Math.ceil(msg.content.length / 4);
    
    if (totalTokens + msgTokens > maxTokens) break;
    
    contextMessages.unshift(msg);
    totalTokens += msgTokens;
  }
  
  // Format as chat messages
  return contextMessages
    .map((msg) => {
      const roleLabel = msg.role === "user" ? "User" : msg.role === "assistant" ? "Assistant" : "System";
      return `[${roleLabel}] ${msg.content}`;
    })
    .join("\n");
}

/**
 * Clear the current session's messages.
 */
export async function clearSession(session: ReplSession): Promise<ReplSession> {
  session.messages = [];
  session.updatedAt = Date.now();
  session.tokenCount = 0;
  
  await saveSession(session);
  
  return session;
}

/**
 * List all available sessions.
 */
export async function listSessions(): Promise<{ id: string; createdAt: number; messageCount: number; tokenCount: number }[]> {
  await ensureSessionDir();
  
  const files = await readdir(SESSION_DIR);
  const sessions: ReplSession[] = [];
  
  for (const file of files) {
    if (file.endsWith(".json") && file !== "active.json") {
      const session = await loadSession(file.replace(".json", ""));
      if (session) sessions.push(session);
    }
  }
  
  return sessions
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .map((s) => ({
      id: s.id,
      createdAt: s.createdAt,
      messageCount: s.messages.length,
      tokenCount: s.tokenCount
    }));
}

/**
 * Switch to a different session.
 */
export async function switchSession(id: string): Promise<ReplSession | null> {
  const session = await loadSession(id);
  if (session) {
    await setActiveSession(session.id);
    return session;
  }
  return null;
}

/**
 * Delete a session.
 */
export async function deleteSession(id: string): Promise<boolean> {
  const filePath = path.join(SESSION_DIR, `${id}.json`);
  try {
    await unlink(filePath);
    return true;
  } catch {
    return false;
  }
}

// Node.js fs/promises imports
import { readdir, unlink } from "node:fs/promises";

/**
 * Maximum context tokens to send to LLM ( Leave room for new user input )
 */
export const MAX_CONTEXT_TOKENS = 16384;

/**
 * Reserved tokens for the new user message + system prompt
 */
export const RESERVED_TOKENS = 4096;

/**
 * Get context messages that fit within the token budget.
 * Returns messages in chronological order (oldest first) that fit.
 */
export function getContextMessages(
  session: ReplSession,
  maxTokens: number = MAX_CONTEXT_TOKENS
): SessionMessage[] {
  const reserved = RESERVED_TOKENS;
  const budget = maxTokens - reserved;

  if (budget <= 0) return [];

  let totalTokens = 0;
  const contextMessages: SessionMessage[] = [];

  // Start from the beginning and add messages until we hit the budget
  for (const msg of session.messages) {
    const msgTokens = msg.tokenCount ?? estimateMessageTokens(msg.content);
    
    if (totalTokens + msgTokens > budget) break;
    
    contextMessages.push(msg);
    totalTokens += msgTokens;
  }

  return contextMessages;
}

/**
 * Format context messages as a conversation for the LLM.
 * Uses a standard chat format that most LLMs understand.
 */
export function formatContextForLLM(
  session: ReplSession,
  maxTokens: number = MAX_CONTEXT_TOKENS
): string {
  const messages = getContextMessages(session, maxTokens);
  
  if (messages.length === 0) return "";
  
  // Format as a conversation
  const formatted = messages
    .map((msg) => {
      const roleLabel = msg.role === "user" ? "User" : msg.role === "assistant" ? "Assistant" : "System";
      const modelInfo = msg.model ? ` (${msg.model})` : "";
      const tierInfo = msg.tier ? ` [${msg.tier}]` : "";
      return `[${roleLabel}${modelInfo}${tierInfo}]:\n${msg.content}`;
    })
    .join("\n\n");

  return formatted;
}

/**
 * Estimate token count for a message.
 */
function estimateMessageTokens(content: string): number {
  // Simple estimation: ~4 characters per token
  return Math.ceil(content.length / 4);
}

/**
 * Add a user message to the session.
 */
export async function addUserMessage(
  session: ReplSession,
  content: string,
  tokenCount: number = Math.ceil(content.length / 4)
): Promise<ReplSession> {
  return addMessage(session, {
    role: "user",
    content,
    tokenCount
  });
}

/**
 * Add an assistant message to the session.
 */
export async function addAssistantMessage(
  session: ReplSession,
  content: string,
  model?: string,
  tier?: string,
  tokenCount: number = Math.ceil(content.length / 4)
): Promise<ReplSession> {
  return addMessage(session, {
    role: "assistant",
    content,
    model,
    tier,
    tokenCount
  });
}

/**
 * Add a system message to the session.
 */
export async function addSystemMessage(
  session: ReplSession,
  content: string,
  tokenCount: number = Math.ceil(content.length / 4)
): Promise<ReplSession> {
  return addMessage(session, {
    role: "system",
    content,
    tokenCount
  });
}

/**
 * Get the number of tokens in the current session.
 */
export function getSessionTokenCount(session: ReplSession): number {
  return session.tokenCount;
}

/**
 * Clear all messages from the session.
 */
export async function clearSessionMessages(session: ReplSession): Promise<ReplSession> {
  return clearSession(session);
}

/**
 * Get a summary of the current session.
 */
export function getSessionSummary(session: ReplSession): {
  messageCount: number;
  tokenCount: number;
  modelsUsed: Set<string>;
  tiersUsed: Set<string>;
} {
  const modelsUsed = new Set<string>();
  const tiersUsed = new Set<string>();

  for (const msg of session.messages) {
    if (msg.model) modelsUsed.add(msg.model);
    if (msg.tier) tiersUsed.add(msg.tier);
  }

  return {
    messageCount: session.messages.length,
    tokenCount: session.tokenCount,
    modelsUsed,
    tiersUsed
  };
}
