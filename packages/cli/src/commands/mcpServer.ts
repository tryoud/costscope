// SPDX-License-Identifier: Apache-2.0

import { createInterface } from "node:readline";
import {
  classifyTask,
  planFileScope,
  routeTask,
  estimateCost,
  detectProject,
  checkDiffScope,
  getChangedFiles,
  validateFileScope
} from "@costscope/core";

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: number | string | null;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: number | string | null;
  result?: unknown;
  error?: { code: number; message: string };
}

const TOOLS = [
  {
    name: "costscope_classify",
    description: "Classify a coding task by risk and recommended cost tier",
    inputSchema: {
      type: "object",
      properties: { task: { type: "string" } },
      required: ["task"]
    }
  },
  {
    name: "costscope_scope",
    description: "Plan allowed/maybe/forbidden files for a task",
    inputSchema: {
      type: "object",
      properties: { task: { type: "string" }, root: { type: "string" } },
      required: ["task"]
    }
  },
  {
    name: "costscope_route",
    description: "Full routing decision (classify + scope + tier + recommended worker)",
    inputSchema: {
      type: "object",
      properties: { task: { type: "string" }, root: { type: "string" } },
      required: ["task"]
    }
  },
  {
    name: "costscope_check_diff",
    description: "Validate current git diff against a scope",
    inputSchema: {
      type: "object",
      properties: { root: { type: "string" } },
      required: []
    }
  },
  {
    name: "costscope_cost",
    description: "Estimate rough cost for a tier",
    inputSchema: {
      type: "object",
      properties: { tier: { type: "string", enum: ["cheap", "balanced", "premium"] } },
      required: ["tier"]
    }
  }
];

export async function callMcpTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  const root = (args.root as string) ?? process.cwd();
  switch (name) {
    case "costscope_classify": {
      const task = String(args.task);
      const project = await detectProject(root).catch(() => undefined);
      return classifyTask(task, project);
    }
    case "costscope_scope": {
      const task = String(args.task);
      const project = await detectProject(root);
      return validateFileScope(planFileScope(task, project));
    }
    case "costscope_route": {
      const task = String(args.task);
      const project = await detectProject(root);
      const classification = classifyTask(task, project);
      const scope = validateFileScope(planFileScope(task, project));
      const route = routeTask(classification, scope);
      return { classification, scope, route };
    }
    case "costscope_check_diff": {
      const project = await detectProject(root);
      const changed = await getChangedFiles(root);
      const emptyScope = { allowedFiles: [], maybeFiles: [], forbiddenFiles: [], reason: [] };
      return checkDiffScope(changed, emptyScope, "cheap");
    }
    case "costscope_cost": {
      return estimateCost((args.tier as "cheap" | "balanced" | "premium") ?? "cheap");
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

export async function mcpServerCommand(): Promise<void> {
  const rl = createInterface({ input: process.stdin });
  const reply = (resp: JsonRpcResponse): void => {
    process.stdout.write(JSON.stringify(resp) + "\n");
  };

  rl.on("line", async (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    let req: JsonRpcRequest;
    try {
      req = JSON.parse(trimmed) as JsonRpcRequest;
    } catch (err) {
      reply({ jsonrpc: "2.0", id: null, error: { code: -32700, message: `Parse error: ${err instanceof Error ? err.message : String(err)}` } });
      return;
    }

    try {
      if (req.method === "initialize") {
        reply({
          jsonrpc: "2.0",
          id: req.id,
          result: {
            protocolVersion: "2024-11-05",
            capabilities: { tools: {} },
            serverInfo: { name: "costscope", version: "0.2.0" }
          }
        });
      } else if (req.method === "tools/list") {
        reply({ jsonrpc: "2.0", id: req.id, result: { tools: TOOLS } });
      } else if (req.method === "tools/call") {
        const params = req.params as { name: string; arguments?: Record<string, unknown> };
        const result = await callMcpTool(params.name, params.arguments ?? {});
        reply({
          jsonrpc: "2.0",
          id: req.id,
          result: { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] }
        });
      } else if (req.method === "notifications/initialized") {
        // no response needed for notifications
      } else {
        reply({ jsonrpc: "2.0", id: req.id, error: { code: -32601, message: `Method not found: ${req.method}` } });
      }
    } catch (err) {
      reply({
        jsonrpc: "2.0",
        id: req.id,
        error: { code: -32603, message: err instanceof Error ? err.message : String(err) }
      });
    }
  });
}

export const _testing = { TOOLS };
