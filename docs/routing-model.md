# Routing Model

The MVP maps deterministic risk classification plus file-scope clarity to cheap, balanced, and premium tiers.

- Low risk with clear allowed files: cheap.
- Medium risk: balanced.
- High or critical risk: premium with manual review.
- Low confidence or unclear scope: balanced or premium, depending on risk.

Default workers:

- Cheap: `mistral-vibe`, then `aider`.
- Balanced: `codex`, then `aider`.
- Premium: `claude-code`, then `codex`.

Auto-run is only allowed for cheap tasks with clear allowed files and no sensitive flags. Premium and critical paths always require manual review.
