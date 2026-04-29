# Routing Model

CostScope maps deterministic risk classification plus file-scope clarity to three tiers: cheap, balanced, and premium.

## Tier assignment rules

| Condition | Tier |
|---|---|
| Low risk + clear allowed files | cheap |
| Medium risk | balanced |
| High or critical risk | premium + manual review |
| Low confidence (< 0.5) or empty allowed files | balanced or premium |

Auto-run is only allowed for cheap tasks with clear allowed files and no sensitive flags (auth, payment, secrets, deploy). Premium and critical paths always require manual review.

## File-scope resolution

When keyword rules return no allowed files, CostScope calls the `scope-resolver` provider (a fast LLM) to identify relevant files from the project tree. This avoids unnecessary escalation to premium routing for tasks the rule-based system simply doesn't recognise.

If the LLM call fails or returns no valid files, the system falls back to the rule-based empty scope and routes conservatively.

## Provider roles

Each tier and pipeline step has an independently configurable provider:

| Role | Purpose |
|---|---|
| `scope-resolver` | LLM call to identify files when rules return empty scope |
| `cheap` | Code execution worker for low-risk tasks |
| `balanced` | Code execution worker for medium-risk tasks |
| `premium` | Code execution worker for high-risk tasks |
| `planner` | LLM call for goal decomposition in `plan`/`orchestrate`/`autopilot` |

## Default model assignments (`preset: "default"`)

| Role | Executor | Model |
|---|---|---|
| scope-resolver | openrouter | google/gemini-2.0-flash-lite |
| cheap | vibe | Devstral 2 (via Codestral key) |
| balanced | openrouter | deepseek/deepseek-chat |
| planner | openrouter | deepseek/deepseek-r1 |
| premium | anthropic-api | claude-sonnet-4-6 |

## Presets

Three built-in presets cover the most common setups. Set `"preset"` in `.costscope.json`:

- **`default`** — balanced quality/cost; uses OpenRouter for non-premium roles, Anthropic for premium
- **`student`** — avoids Anthropic billing entirely; uses Mistral vibe (le Chat Pro ~53 % student discount) for cheap work, Qwen and DeepSeek via OpenRouter for the rest. See [docs/student-preset.md](./student-preset.md).
- **`quality`** — Anthropic-only; maximum reliability at higher cost

Any role can be overridden in `.costscope.json` regardless of preset.
