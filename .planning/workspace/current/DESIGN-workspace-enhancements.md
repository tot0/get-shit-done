# Design: Workspace Enhancements (Phase 4+)

**Date:** 2026-03-04
**Scope:** File formats, resolver internals, migration behavior, and parallel-team feedback primitives for hierarchical `.planning/`.
**Status:** Design only (no implementation)

## Grounding From Current GSD Patterns

- `gsd-tools.cjs` delegates most behavior to `bin/lib/*.cjs` modules and exposes deterministic commands (`init`, `roadmap analyze`, `state-snapshot`, `summary-extract`).
- Current internals are path-coupled to flat layout (`.planning/PROJECT.md`, `.planning/ROADMAP.md`, `.planning/STATE.md`, `.planning/phases/*`) across `core.cjs`, `init.cjs`, and workflows.
- Existing workflow architecture already favors "resolver-like" behavior: `init` commands return paths and existence booleans for orchestrators.
- Existing markdown artifacts are structured and parse-friendly (frontmatter + explicit section headings), so proposed formats should follow that style.

---

## 1) Path Resolver Internals

### 1.1 Detection Heuristics for `resolveLayout(cwd)`

`resolveLayout(cwd)` returns:

```json
{
  "mode": "flat|hierarchical|none|ambiguous",
  "confidence": 0.0,
  "paths": { "...": "..." },
  "signals": {
    "hierarchical": ["..."],
    "flat": ["..."],
    "conflicts": ["..."]
  }
}
```

Signal model:

- **Hierarchical-strong signals**
  - `.planning/project/PROJECT.md`
  - `.planning/workspace/current/ROADMAP.md`
  - `.planning/workspace/current/STATE.md`
  - `.planning/workspace/current/phases/`
  - `.planning/archive/milestones/`
- **Hierarchical-weak signals**
  - `.planning/project/` exists but missing one or more canonical files
  - `.planning/workspace/current/` exists with partial milestone files
- **Flat-strong signals**
  - `.planning/PROJECT.md`
  - `.planning/ROADMAP.md`
  - `.planning/STATE.md`
  - `.planning/phases/`
- **Flat-weak signals**
  - `.planning/` exists with only one or two root docs

Mode selection:

- `none`: `.planning/` missing
- `hierarchical`: hierarchical score > flat score by threshold
- `flat`: flat score > hierarchical score by threshold
- `ambiguous`: mixed/partial where neither dominates (partial migration or manual edits)

Confidence meaning:

- `>= 0.9`: unambiguous canonical layout
- `0.6 - 0.89`: likely layout, but partial/missing files
- `< 0.6`: ambiguous; caller should use explicit fallback policy and emit warning

### 1.2 Partial Migration Handling

Resolver policy for mixed states:

- Prefer **hierarchical read paths** when canonical hierarchical file exists.
- Fall back to **flat file** only when corresponding hierarchical artifact is absent.
- Never auto-delete or overwrite during resolution.
- Return `signals.conflicts` when both locations exist for same artifact.

Example conflict:

- Both `.planning/ROADMAP.md` and `.planning/workspace/current/ROADMAP.md` exist.
- Resolver reads hierarchical, reports conflict so migration tooling can reconcile.

### 1.3 Manifest vs Convention

Decision: **Hybrid approach**.

- Convention-based detection remains default for backward compatibility.
- Optional manifest `.planning/layout.json` is written by migration/new-project in hierarchical mode.
- Manifest is advisory, not required.

`layout.json` shape:

```json
{
  "version": 1,
  "mode": "hierarchical",
  "active_workspace": "workspace/current",
  "created_by": "gsd-tools migrate-layout",
  "created_at": "2026-03-04T00:00:00Z"
}
```

Rules:

- If manifest says `hierarchical` but canonical dirs missing, downgrade confidence and report drift.
- Flat users are never required to create manifest.

### 1.4 Error Cases

- **No `.planning/`**: `mode=none`, confidence `1.0`, paths unresolved.
- **Empty `.planning/`**: `mode=ambiguous`, low confidence; suggest `/gsd:new-project` or `/gsd:migrate-layout`.
- **Mixed roots**: `mode=ambiguous` with conflict list.
- **Corrupt manifest JSON**: ignore manifest, continue convention detection, emit warning signal.

### 1.5 Resolver Pseudocode

```text
function resolveLayout(cwd):
  if !exists(.planning):
    return {mode:"none", confidence:1.0, paths:null, signals:{...}}

  signals = collectSignals(cwd)
  flatScore = weight(signals.flat)
  hierScore = weight(signals.hierarchical)

  manifest = tryReadJson(.planning/layout.json)
  if manifest.mode == "hierarchical":
    hierScore += 2
  if manifest invalid:
    signals.conflicts.push("layout_manifest_invalid")

  if abs(flatScore - hierScore) < threshold:
    mode = "ambiguous"
  else:
    mode = hierScore > flatScore ? "hierarchical" : "flat"

  paths = buildResolvedPaths(mode, cwd)

  for each artifact in artifactEnum:
    if mode == hierarchical and !exists(paths[artifact]):
      flatCandidate = buildFlatPath(artifact)
      if exists(flatCandidate):
        paths[artifact] = flatCandidate
        signals.conflicts.push("fallback:" + artifact)

  confidence = computeConfidence(mode, flatScore, hierScore, signals.conflicts)
  return {mode, confidence, paths, signals}
```

---

## 2) DECISIONS.md (ADR-lite Queue Primitive)

Location: `.planning/project/DECISIONS.md`

Goals:

- assumption register during execution
- queue for human decisions (`pending`, `decided`, `revisit`)
- spec feedback channel when implementation reveals mismatch

### 2.1 File Format

```markdown
---
version: 1
project: GSD Workspace Enhancements
last_updated: 2026-03-04
entry_count: 3
pending_count: 1
revisit_count: 1
---

# Decisions Queue

## Index

| ID | Status | Type | Summary | Source | Updated |
|----|--------|------|---------|--------|---------|
| DEC-20260304-001 | pending | product | Archive namespace naming | Phase 4 / 04-01 | 2026-03-04 |
| DEC-20260304-002 | decided | technical | Resolver fallback precedence | Phase 4 / 04-01 | 2026-03-04 |

## Entries

### DEC-20260304-001 - Archive namespace naming

```yaml
status: pending
type: product
opened_at: 2026-03-04
opened_by: agent
owners: [human]
source:
  phase: "4"
  plan: "04-01"
  requirement_ids: [LIFE-04, WORK-02]
  artifacts:
    - .planning/workspace/current/ROADMAP.md
context:
  assumption: "Use .planning/archive/milestones as canonical archive root"
  why_now: "Avoid collision with upstream .planning/milestones/vX.Y-* convention"
options:
  - id: A
    title: "Keep .planning/milestones for archive"
    pros: ["upstream familiarity"]
    cons: ["semantic collision with active milestone concept"]
  - id: B
    title: "Use .planning/archive/milestones"
    pros: ["explicit semantics", "future-safe"]
    cons: ["new path migration"]
decision:
  selected: null
  rationale: null
impact:
  requirements_to_update: [LIFE-01, LIFE-04]
  roadmap_impact: "Phase 6 naming and docs update"
  execution_impact: "blocks milestone-complete path finalization"
propagation:
  status: pending
  targets: []
```

#### Human Resolution Notes

- _empty until decided_

#### Propagation Log

- _empty until propagated_
```

### 2.2 Semantics

- `status=pending`: requires human decision; agent may continue non-blocked work.
- `status=decided`: decision made; propagation can be done.
- `status=revisit`: previously decided but needs reconsideration due to new evidence.

### 2.3 Propagation Back to Specs

Decision: **agent-assisted, human-approved**.

- Agent prepares `proposed_patch` text in decision entry (requirements/roadmap/project snippets).
- Human approves decision and propagation.
- Agent applies updates to canonical specs, then marks `propagation.status=applied` with file refs.

This prevents silent spec drift while keeping humans in control.

---

## 3) Spec Delta Protocol

Purpose: capture implementation-learned changes before they are lost.

### 3.1 Triggers

- End of each plan execution (`*-SUMMARY.md` creation)
- End of phase completion
- Optional PR open/update event (if repo workflow supports it)

### 3.2 Location and Lifecycle

- Per-event delta files in `.planning/workspace/current/spec-deltas/`
- Naming: `YYYY-MM-DDTHHMM-{scope}.md`
  - example: `2026-03-04T2310-phase-04.md`
- Milestone completion aggregates unresolved deltas into archive summary, then marks them resolved/deferred.

### 3.3 Delta File Format

```markdown
---
id: DELTA-20260304-2310
scope: phase
phase: "4"
plan: "04-02"
status: open
linked_decisions: [DEC-20260304-003]
created_at: 2026-03-04T23:10:00Z
---

# Spec Delta: Phase 4 / Plan 04-02

## Assumptions Changed

- Assumed archived milestones lived under `.planning/milestones/`; actual upstream usage conflicts with active milestone semantics.

## Proposed Requirement Amendments

- **WORK-02** (amend):
  - Current: "gsd-tools.js resolves paths..."
  - Proposed: "gsd-tools resolver supports flat + hierarchical with conflict signaling and confidence score."

## New Requirements Discovered

- **OBS-01**: Resolver must return conflict metadata for mixed layout repos.

## Roadmap Impact

- Phase 5 must include workflow path migration lint/check to prevent new hardcoded flat paths.

## Suggested Actions

1. Add `OBS-01` to REQUIREMENTS.md (pending approval)
2. Create follow-up plan in Phase 5 for path-lint migration check
```

### 3.4 Review Flow

- Progress/report commands surface open deltas count.
- Humans review open deltas with pending/revisit decisions.
- Accepted deltas become explicit updates in `PROJECT.md`, `REQUIREMENTS.md`, `ROADMAP.md`.

---

## 4) Contract Files for Parallel Work

Goal: enable multiple devs/agents to work independently with stable integration boundaries.

### 4.1 Location

- Persistent contracts: `.planning/project/contracts/`
- Milestone-local contract notes (optional): `.planning/workspace/current/contracts/`

Default rule:

- If contract should survive milestone boundary, place in `project/contracts`.
- If purely temporary to active milestone, place in `workspace/current/contracts`.

### 4.2 Contract File Format

File: `.planning/project/contracts/CONTRACT-layout-resolver.md`

```markdown
---
id: CONTRACT-layout-resolver
version: 1
status: active
owners: ["platform"]
consumers: ["init", "progress", "plan-phase", "verify-work"]
last_updated: 2026-03-04
---

# Contract: Layout Resolver API

## Boundary

Resolver is the single source of truth for planning artifact paths.

## Interfaces

| Interface | Input | Output | Guarantees |
|-----------|-------|--------|------------|
| resolveLayout | cwd | mode/confidence/paths/signals | no mutation |
| resolvePath | cwd, artifact | absolute + repo-relative path | fallback metadata |
| migrateLayout | cwd, targetMode | report | idempotent |

## Invariants

- Flat layout remains readable without migration.
- Hierarchical preferred when both exist.
- Resolver never deletes files.

## Compatibility Rules

- Backward compatible additions allowed.
- Breaking output shape requires contract version bump.

## Verification Hooks

- `verify contract CONTRACT-layout-resolver`
- `validate health` checks invariant conformance.

## Known Consumers

- `init.cjs`
- `core.cjs` phase discovery
- workflow path references
```

### 4.3 Generation + Violation Detection

- Generated during planning when multiple plans touch shared interfaces.
- Can also be manually authored for pre-existing boundaries.
- Verification checks:
  - contract file exists for declared shared boundary
  - referenced interface names appear in plans/verification artifacts
  - breaking change requires version bump and explicit migration note

---

## 5) Milestone Summary Format

### 5.1 Preserve vs Discard

Preserve in archive:

- milestone summary (`vX.Y-SUMMARY.md`)
- milestone roadmap snapshot (`vX.Y-ROADMAP.md`)
- milestone requirements snapshot (`vX.Y-REQUIREMENTS.md`)
- unresolved decision/delta references

Discard from active workspace after completion:

- `.planning/workspace/current/phases/`
- `.planning/workspace/current/ROADMAP.md`
- `.planning/workspace/current/REQUIREMENTS.md`
- `.planning/workspace/current/research/` (unless explicitly promoted)

Keep persistent:

- `.planning/project/PROJECT.md`
- `.planning/project/DECISIONS.md`
- `.planning/project/contracts/`
- `.planning/todos/`

### 5.2 Archive Summary File

File: `.planning/archive/milestones/v2.0-SUMMARY.md`

```markdown
---
milestone: v2.0
name: Personal Dev Workspace
completed_on: 2026-04-02
phase_range: "4-6"
phase_count: 3
plan_count: 11
decision_count: 14
revisit_count: 2
requirement_delivery:
  delivered: 15
  deferred: 1
---

# Milestone v2.0 Summary

## Outcome

One-paragraph narrative of what changed and why it matters.

## Delivered Requirements

- HIER-01 ...
- WORK-04 ...

## Key Decisions

- DEC-...: [decision + rationale + impact]

## Open Follow-ups

- Deferred requirements
- Revisit decisions
- Unresolved spec deltas

## Lessons

- What improved delivery
- What caused friction

## References

- Roadmap snapshot: `v2.0-ROADMAP.md`
- Requirements snapshot: `v2.0-REQUIREMENTS.md`
- Decision log: `.planning/project/DECISIONS.md`
```

### 5.3 Milestone Index

Maintain `.planning/project/MILESTONES.md` as browsable index with one-line entries linking each archive summary.

---

## API Surface Proposal (Resolver)

```text
resolveLayout(cwd) -> { mode, confidence, paths, signals }

resolvePath(cwd, artifact, opts?) -> {
  artifact,
  absolute_path,
  relative_path,
  source_mode,
  fallback_used,
  conflicts
}

listPhaseDirs(cwd, opts?) -> [
  { phase_number, phase_name, relative_path, mode, archived }
]

findPhaseDir(cwd, phaseNum, opts?) -> {
  found,
  phase_number,
  phase_name,
  relative_path,
  mode,
  archived
}

getMilestoneContext(cwd) -> {
  active_milestone: { version, name, path },
  archive_root,
  mode,
  confidence
}

migrateLayout(cwd, targetMode, opts?) -> {
  changed,
  mode_before,
  mode_after,
  operations: [ {action, from, to, status} ],
  conflicts,
  warnings
}
```

---

## Dogfood: Pending Design Decisions (Using Proposed DECISIONS Format)

### DEC-20260304-101 - Source of truth when both flat and hierarchical artifact exist

```yaml
status: pending
type: technical
source:
  phase: "4"
  requirement_ids: [MIGR-02, WORK-02, WORK-04]
context:
  assumption: "Hierarchical should win by default"
options:
  - id: A
    title: "Always hierarchical-first"
  - id: B
    title: "Use newest mtime"
  - id: C
    title: "Require explicit user choice"
impact:
  execution_impact: "affects all read-path migration behavior"
```

### DEC-20260304-102 - Should `layout.json` be committed by default

```yaml
status: pending
type: product
source:
  phase: "4"
  requirement_ids: [MIGR-01, MIGR-02]
options:
  - id: A
    title: "Always commit"
  - id: B
    title: "Write but gitignore by default"
  - id: C
    title: "Only for hierarchical mode"
impact:
  roadmap_impact: "migration UX and drift diagnostics"
```

### DEC-20260304-103 - Spec delta strictness gate

```yaml
status: pending
type: process
source:
  phase: "5"
  requirement_ids: [WORK-01]
options:
  - id: A
    title: "Warn-only"
  - id: B
    title: "Block phase completion if unresolved deltas"
  - id: C
    title: "Block milestone completion only"
impact:
  execution_impact: "developer velocity vs governance"
```

---

## Rollout Mapping to Existing 6-Step Plan

1. **Resolver + detection only**
   - implement APIs + conflict signals; no workflow changes yet.
2. **Migrate read paths**
   - `init.cjs`, roadmap/state snapshot path sourcing through resolver.
3. **Migrate write paths**
   - discuss/plan/execute/verify writes via `resolvePath`.
4. **Migration + health**
   - add `migrateLayout`; extend `validate health` to report mixed/conflict states.
5. **Archive lifecycle**
   - milestone complete/new-milestone use `workspace/current` + archive roots.
6. **Remove hardcoded paths**
   - workflow path lint pass; replace remaining `.planning/...` literals with resolver outputs.

---

## Success Criteria for This Design

- Flat users continue unchanged with no required migration.
- Hierarchical mode enables long-lived project memory + milestone-scoped execution.
- Human decision load is concentrated into one queue (`DECISIONS.md`) instead of ad-hoc blockers.
- Spec drift is captured as explicit deltas and routed back into canonical artifacts.
- Parallel teams can coordinate around explicit, versioned contract files.
