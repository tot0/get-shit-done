---
phase: 02-model-abstraction
plan: 01
subsystem: model-resolution
tags: [model-profiles, provider-mapping, runtime-detection, multi-runtime]

# Dependency graph
requires:
  - phase: 01-continuation-fixes
    provides: Explicit continuation cues in all workflow loops
provides:
  - Abstract tier MODEL_PROFILES (reasoning/standard/fast)
  - PROVIDER_MODELS mapping table for 6 provider variants
  - detectRuntime() function for automatic runtime identification
  - GSD_MODEL env var override in cmdResolveModel()
  - runtime and tier fields in JSON resolve-model output
affects: [03-reference-neutralization, workflows, agent-spawning]

# Tech tracking
tech-stack:
  added: []
  patterns: [abstract-tier-resolution, provider-model-mapping, env-var-runtime-detection]

key-files:
  created: []
  modified:
    - get-shit-done/bin/gsd-tools.js

key-decisions:
  - "Six provider entries (claude, opencode-claude, opencode-codex, opencode-copilot-claude, opencode-copilot-codex, gemini) cover all runtime+provider combos"
  - "OpenCode defaults to opencode-claude; users switch via GSD_RUNTIME=opencode-codex"
  - "GSD_MODEL override short-circuits all profile and provider logic"
  - "Unknown agent fallback uses provider-equivalent of standard tier, not hardcoded sonnet"

patterns-established:
  - "Tier resolution chain: GSD_MODEL override → profile lookup → tier → detectRuntime() → PROVIDER_MODELS → model ID"
  - "OPENCODE=1 checked before CLAUDE_CODE_SSE_PORT to prevent OpenCode misdetection as Claude Code"

# Metrics
duration: 2min
completed: 2026-02-08
---

# Phase 2 Plan 1: Model Abstraction Summary

**Abstract capability tiers (reasoning/standard/fast) with 6-provider mapping table and GSD_MODEL override for runtime-agnostic model resolution**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-08T01:38:33Z
- **Completed:** 2026-02-08T01:40:33Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- MODEL_PROFILES now uses abstract tiers (reasoning/standard/fast) instead of Claude-specific names (opus/sonnet/haiku)
- PROVIDER_MODELS table maps tiers to 6 provider variants: claude→opus/sonnet/haiku, opencode-claude→anthropic/claude-*, opencode-codex→openai/gpt-5.3-codex, opencode-copilot-claude→github-copilot/claude-*, opencode-copilot-codex→github-copilot/gpt-5.2-codex, gemini→gemini-2.5-*
- detectRuntime() auto-detects runtime from environment (GSD_RUNTIME > OPENCODE=1 > GEMINI_API_KEY > CLAUDE_CODE_SSE_PORT > claude fallback)
- GSD_MODEL env var override takes absolute precedence, enabling per-invocation model switching
- Full backward compatibility: Claude Code still resolves to opus/sonnet/haiku

## Task Commits

Each task was committed atomically:

1. **Task 1: Add abstract tier tables and runtime detection** - `6a865ec` (feat)
2. **Task 2: Update cmdResolveModel to use abstract tiers and provider mapping** - `9d3a094` (feat)

## Files Created/Modified
- `get-shit-done/bin/gsd-tools.js` - Abstract tier MODEL_PROFILES, PROVIDER_MODELS mapping, detectRuntime(), updated cmdResolveModel()

## Decisions Made
- Six provider entries cover all runtime+provider combos rather than 3 (claude/opencode/gemini) — OpenCode supports multiple backend providers (native Anthropic, native OpenAI, GitHub Copilot Claude, GitHub Copilot Codex)
- OpenCode auto-detection defaults to opencode-claude (Claude models via Anthropic API); users switch to other variants via GSD_RUNTIME
- GSD_MODEL override returns the exact string as model ID with profile='override' and runtime='override'
- Unknown agent fallback dynamically resolves provider's standard tier instead of hardcoding 'sonnet'

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 2 complete (single plan), ready for transition to Phase 3 (Reference Neutralization)
- All docs/references still use Claude model names (opus/sonnet/haiku) — Phase 3 will neutralize these
- No blockers

## Self-Check

Verifying claims:

- `get-shit-done/bin/gsd-tools.js` exists and contains PROVIDER_MODELS: VERIFIED
- Commit `6a865ec` exists: VERIFIED
- Commit `9d3a094` exists: VERIFIED
- `GSD_MODEL=test node gsd-tools.js resolve-model gsd-planner --raw` returns `test`: VERIFIED
- `GSD_RUNTIME=claude node gsd-tools.js resolve-model gsd-planner --raw` returns `opus`: VERIFIED
- `GSD_RUNTIME=gemini node gsd-tools.js resolve-model gsd-planner --raw` returns `gemini-2.5-pro`: VERIFIED

## Self-Check: PASSED

---
*Phase: 02-model-abstraction*
*Completed: 2026-02-08*
