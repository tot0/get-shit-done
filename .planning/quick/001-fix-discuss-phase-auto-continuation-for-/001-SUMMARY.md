---
phase: quick-001
plan: 01
subsystem: discuss-phase workflow
tags: [cross-model-compatibility, workflow-fix, continuation-loop]
dependency_graph:
  requires: []
  provides: [cross-model-discuss-phase-continuation]
  affects: [get-shit-done/workflows/discuss-phase.md, commands/gsd/discuss-phase.md]
tech_stack:
  added: []
  patterns: [explicit-continuation-instructions, loop-boundary-markers]
key_files:
  modified:
    - get-shit-done/workflows/discuss-phase.md
    - commands/gsd/discuss-phase.md
decisions: []
metrics:
  duration: ~1 minute
  completed: 2026-02-07
---

# Quick 001: Fix discuss-phase auto-continuation for non-Opus models Summary

**One-liner:** Added explicit "MUST NOT end your turn" continuation instructions to the discuss-phase loop so non-Opus models don't stop mid-discussion

## What Was Done

Added explicit continuation language to both the workflow definition and command definition for the discuss-phase discussion loop. Non-Opus models (e.g. GPT-5.3-Codex) were ending their turn after receiving a "Next area" tool response instead of continuing to the next discussion area. The fix adds three types of explicit instruction:

1. **Top-of-step CRITICAL warning** — Declares the step is a loop and the model MUST NOT end its turn until all areas are discussed
2. **Post-"Next area" enforcement** — Explicit "DO NOT end your turn here" after the Next area transition point
3. **Only-natural-pause clarification** — Marks the after-all-areas-complete point as the ONLY place where the loop naturally pauses

## Commits

| # | Hash | Type | Description |
|---|------|------|-------------|
| 1 | `1711b4b` | fix | Add explicit continuation instructions to discuss_areas step in workflow |
| 2 | `d3c4af9` | fix | Add continuation language to command definition probing depth section |

## Deviations from Plan

None — plan executed exactly as written.

## Task Details

### Task 1: Add explicit continuation instructions to the discuss_areas step in the workflow
- **File:** `get-shit-done/workflows/discuss-phase.md`
- **Changes:** Added CRITICAL loop continuation warning at top of step, "DO NOT end your turn" after Next area handling, clarified only-natural-pause-point after all areas complete
- **Commit:** `1711b4b`

### Task 2: Add matching continuation language to the command definition
- **File:** `commands/gsd/discuss-phase.md`
- **Changes:** Updated probing depth header with "(CRITICAL — do not end turn mid-loop)", added "immediately continue" instruction for next area, clarified after-ALL-areas as only stopping point
- **Commit:** `d3c4af9`

## Verification

- Both files read end-to-end after changes — no content lost or corrupted
- Continuation language is prominent: CRITICAL warnings, bold text, explicit DO NOT / MUST NOT language
- Original workflow logic (4 questions → check → next area loop → final question) completely preserved
- Both files contain matching continuation instructions reinforcing the same behavior

## Self-Check: PASSED

- [x] `get-shit-done/workflows/discuss-phase.md` exists
- [x] `commands/gsd/discuss-phase.md` exists
- [x] Commit `1711b4b` exists
- [x] Commit `d3c4af9` exists
- [x] Workflow contains "MUST NOT end your turn"
- [x] Command contains "CRITICAL — do not end turn mid-loop"
