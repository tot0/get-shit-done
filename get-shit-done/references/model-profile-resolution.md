# Model Profile Resolution

Resolve model profile once at the start of orchestration, then use it for all Task spawns.

## Resolution Flow

```
1. Check GSD_MODEL env var — if set, return it directly (overrides everything)
2. Read model_profile from .planning/config.json (default: "balanced")
3. Look up agent in MODEL_PROFILES[profile] → get abstract tier (reasoning/standard/fast)
4. Detect runtime via detectRuntime() — checks env vars to identify the AI provider
5. Look up PROVIDER_MODELS[runtime][tier] → get provider-specific model ID
6. Return model ID to caller
```

## Abstract Tiers

- **reasoning** — Highest capability. Architecture decisions, goal decomposition, complex analysis.
- **standard** — Solid capability. Code execution, research, verification, follows explicit instructions well.
- **fast** — Quick and efficient. Read-only tasks, pattern extraction, structured output.

Tier assignments per agent are defined in `model-profiles.md`.

## Provider Resolution

Abstract tiers map to different model IDs depending on which runtime is detected. The `detectRuntime()` function checks environment variables in priority order:

1. `GSD_RUNTIME` env var (explicit override, highest priority)
2. `OPENCODE=1` (OpenCode, defaults to Claude models via `opencode-claude`)
3. `GEMINI_API_KEY` or `GOOGLE_GENAI_USE_VERTEXAI` (Gemini CLI)
4. `CLAUDE_CODE_SSE_PORT` (Claude Code)
5. Fallback: `claude` (backward compatible)

The `PROVIDER_MODELS` table in `gsd-tools.js` is the source of truth for tier-to-model mappings. Examples:

| Tier | Claude Code | OpenCode (Claude) | Gemini CLI |
|------|-------------|-------------------|------------|
| reasoning | `opus` | `anthropic/claude-opus-4-6` | `gemini-2.5-pro` |
| standard | `sonnet` | `anthropic/claude-sonnet-4-5` | `gemini-2.5-flash` |
| fast | `haiku` | `anthropic/claude-haiku-4-5` | `gemini-2.5-flash-lite` |

Same tier name, provider-appropriate model. See `PROVIDER_MODELS` in `gsd-tools.js` for the complete mapping including Codex and GitHub Copilot runtimes.

## Override Mechanism

`GSD_MODEL` env var takes absolute precedence over the entire resolution flow. When set, the model ID is returned directly without profile lookup or provider detection.

```bash
GSD_MODEL=gpt-5.3-codex node gsd-tools.js resolve-model gsd-planner
# Returns: gpt-5.3-codex (regardless of profile or runtime)
```

## Usage

1. Resolve once at orchestration start
2. Store the profile value
3. Look up each agent's tier from the profile table when spawning
4. Resolve tier to model ID via provider detection
5. Pass model parameter to each Task call

```
Task(
  prompt="...",
  subagent_type="gsd-planner",
  model="{resolved_model}"  # e.g., "reasoning" tier → "opus" on Claude Code
)
```

## Backward Compatibility

Claude Code users see no change in behavior. The abstract tiers resolve to the same model shorthand names that Claude Code expects:

- reasoning → `opus`
- standard → `sonnet`
- fast → `haiku`

The tier abstraction is transparent — existing Claude Code workflows work identically.
