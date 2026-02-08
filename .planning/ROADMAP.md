# Roadmap: GSD Multi-Runtime Compatibility

## Overview

Three phases take GSD from Claude-only to model-agnostic. First we fix the immediate breaking patterns (continuation loops that crash non-Claude models), then we rebuild the model resolution layer to speak abstract tiers instead of Claude names, then we neutralize all user-facing references so no model gets confused by seeing another model family's branding in its instructions.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Continuation Fixes** - Add explicit continuation cues to all implicit loops that break non-Claude models
- [ ] **Phase 2: Model Abstraction** - Replace Claude-specific model resolution with abstract tiers and provider mapping
- [ ] **Phase 3: Reference Neutralization** - Replace Claude model names with abstract tier language in all docs and help text

## Phase Details

### Phase 1: Continuation Fixes
**Goal**: Every workflow loop that requires the model to continue without ending its turn has explicit belt-and-suspenders continuation language, preventing the GPT-5.3-Codex breakage pattern seen in quick-001
**Depends on**: Nothing (first phase)
**Requirements**: CONT-01, CONT-02, CONT-03, CONT-04, CONT-05
**Success Criteria** (what must be TRUE):
  1. All 5 implicit continuation loops identified in the 002-AUDIT have explicit "MUST NOT end your turn" and "DO NOT end your turn here" language matching the quick-001 pattern
  2. The new-project.md questioning loop, roadmap approval loop, new-milestone.md approval loop, transition.md auto-continuation, and verify-work.md test loop all have explicit continuation cues
  3. No workflow contains an implicit "loop until" or "go to" pattern without an accompanying explicit continuation instruction
**Plans**: 1 plan

Plans:
- [ ] 01-01-PLAN.md — Add continuation cues to all 5 implicit loop patterns across 4 workflow files

### Phase 2: Model Abstraction
**Goal**: `gsd-tools.js resolve-model` returns provider-appropriate model identifiers via abstract capability tiers, with per-invocation override support
**Depends on**: Phase 1
**Requirements**: MODL-01, MODL-02, MODL-03, MODL-04, MODL-05, MODL-06
**Success Criteria** (what must be TRUE):
  1. `MODEL_PROFILES` table uses `reasoning`/`standard`/`fast` instead of `opus`/`sonnet`/`haiku`
  2. A `PROVIDER_MODELS` table maps abstract tiers to provider-specific model IDs for Claude Code, OpenCode, and Gemini
  3. Runtime is auto-detected from environment variables or process context
  4. `GSD_MODEL=gpt-5.3-codex node gsd-tools.js resolve-model gsd-planner` returns `gpt-5.3-codex` (override takes precedence)
  5. On Claude Code without override, `resolve-model gsd-planner` with quality profile returns `opus` (backward compatible)
**Plans**: TBD

Plans:
- [ ] 02-01: Abstract tiers, provider mapping, runtime detection, and GSD_MODEL override in gsd-tools.js

### Phase 3: Reference Neutralization
**Goal**: All user-facing documentation, help text, and workflow descriptions use abstract tier names instead of Claude model family names, so no model gets confused by seeing another family's branding
**Depends on**: Phase 2
**Requirements**: NEUT-01, NEUT-02, NEUT-03, NEUT-04, NEUT-05, NEUT-06, NEUT-07
**Success Criteria** (what must be TRUE):
  1. `model-profiles.md` describes profiles using `reasoning`/`standard`/`fast` tier names with provider-neutral rationale
  2. `model-profile-resolution.md` documents the full resolution flow: profile → tier → provider detection → model ID
  3. `settings.md`, `set-profile.md`, `help.md`, and `new-project.md` all use tier names in descriptions (e.g., "Reasoning tier for all agents" not "Opus everywhere")
  4. No workflow, reference, or template file contains "Opus", "Sonnet", or "Haiku" as a model quality descriptor (they may appear in the PROVIDER_MODELS mapping table as Claude-specific values)
**Plans**: TBD

Plans:
- [ ] 03-01: Update model-profiles.md and model-profile-resolution.md references
- [ ] 03-02: Update settings.md, set-profile.md, help.md, and new-project.md workflow descriptions

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Continuation Fixes | 0/1 | Not started | - |
| 2. Model Abstraction | 0/1 | Not started | - |
| 3. Reference Neutralization | 0/2 | Not started | - |
