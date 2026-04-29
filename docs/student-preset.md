# Student Preset

The `student` preset maximises cost-efficiency for individual developers and students by avoiding expensive API providers wherever possible.

## Mistral le Chat Pro — ~53 % student discount

Mistral offers approximately **53 % off le Chat Pro** for students with a valid institutional email address.

- **What you get:** full le Chat Pro subscription including access to the Codestral API
- **Where to redeem:** [help.mistral.ai — student discount](https://help.mistral.ai/en/articles/347553-as-a-student-am-i-eligible-for-a-discount-on-le-chat-pro)
- **Renewal:** annual, requires re-verification of student status

> This discount applies to the **subscription**, not to pay-per-token API usage.

## How vibe relates to the student discount

The `vibe` CLI (installed via `uv tool install mistral-vibe`) uses a **Codestral API key**, which is separate from a standard Mistral API key.

With le Chat Pro you can generate a Codestral key at:
**Studio › Codestral › API keys**

Set it in your environment:

```sh
export MISTRAL_API_KEY="<your-codestral-key>"
```

CostScope's `cheap` tier executor (`vibe`) picks this up automatically.
The model running inside vibe is **Devstral 2**, Mistral's dedicated coding agent.

## Activating the student preset

Add one line to your `.costscope.json`:

```json
{
  "preset": "student"
}
```

Or run `costscope init` and choose `student` when prompted.

## Model assignments

| Role | Model | Provider | Why |
|---|---|---|---|
| scope-resolver | `google/gemini-2.0-flash-lite` | OpenRouter | Cheapest viable LLM for file-scope lookup (~$0.075/M tokens) |
| cheap worker | Devstral 2 (via vibe CLI) | Mistral Codestral key | Included in le Chat Pro; best value for repetitive code edits |
| balanced worker | `qwen/qwen-2.5-coder-32b-instruct` | OpenRouter | Strong code understanding at ~$0.07/M tokens |
| planner | `qwen/qwen-2.5-coder-32b-instruct` | OpenRouter | Task decomposition does not need a premium reasoning model |
| premium | `deepseek/deepseek-r1` | OpenRouter | Comparable reasoning to Claude Sonnet at ~$0.50/M tokens |

## Required API keys

```sh
# From Mistral Studio → Codestral → API keys (le Chat Pro)
export MISTRAL_API_KEY="..."

# From openrouter.ai (free tier available, pay-as-you-go)
export OPENROUTER_API_KEY="..."
```

No Anthropic key needed for the student preset.

## Overriding individual roles

The preset is a baseline. Any role can be overridden in `.costscope.json`:

```json
{
  "preset": "student",
  "providers": {
    "premium": {
      "executor": "anthropic-api",
      "model": "claude-haiku-4-5",
      "apiKey": "${ANTHROPIC_API_KEY}"
    }
  }
}
```

## Time-limited deal: DeepSeek V4 Pro (until 31 May 2026)

DeepSeek V4 Pro is available on OpenRouter at **75 % off** until 31 May 2026 UTC
(`deepseek/deepseek-v4-pro`, $0.44/$0.87 per 1M input/output tokens during the promotion).

It outperforms DeepSeek V3 on coding benchmarks (comparable to GPT-5.4) and is slightly
cheaper than DeepSeek R1 during this window. After the discount it reverts to $1.74/M input
— more expensive than both V3 and R1 — so it is not baked into the permanent preset.

To use it temporarily for `balanced` and `premium`:

```json
{
  "preset": "student",
  "providers": {
    "balanced": {
      "executor": "openrouter",
      "model": "deepseek/deepseek-v4-pro",
      "apiKey": "${OPENROUTER_API_KEY}"
    },
    "premium": {
      "executor": "openrouter",
      "model": "deepseek/deepseek-v4-pro",
      "apiKey": "${OPENROUTER_API_KEY}"
    }
  }
}
```

Keep `planner` on DeepSeek R1 — it is better at multi-step reasoning than V4 Pro.
