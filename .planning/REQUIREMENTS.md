# Requirements: GSD Personal Dev Workspace

**Defined:** 2026-02-15
**Core Value:** Developers can use GSD planning freely without PR pollution while enabling long-lived, multi-milestone, human-guided agent execution.

## v2 Requirements

Requirements for the workspace-enhancement milestone. Layout contract is:

- `.planning/project/` (persistent)
- `.planning/workspace/current/` (active milestone)
- `.planning/archive/milestones/` (completed milestones)
- `.planning/todos/` (cross-milestone)

### Layout + Resolver

- [ ] **HIER-01**: User can initialize hierarchical workspace directories: `project/`, `workspace/current/`, `archive/milestones/`, `todos/`
- [ ] **HIER-02**: Project-level artifacts (PROJECT.md, DECISIONS.md, contracts, codebase maps) persist under `.planning/project/` across milestone boundaries
- [ ] **HIER-03**: Active milestone artifacts (ROADMAP.md, STATE.md, REQUIREMENTS.md, phases, research, spec-deltas) are scoped to `.planning/workspace/current/`
- [ ] **HIER-04**: Todos remain cross-milestone in `.planning/todos/`
- [ ] **MIGR-02**: GSD auto-detects layout (`flat`, `hierarchical`, `ambiguous`, `none`) with confidence + conflict signals
- [ ] **WORK-02**: Resolver APIs provide canonical artifact paths with hierarchical-preferred, flat-fallback behavior
- [ ] **WORK-04**: Existing flat `.planning/` projects continue working unchanged without forced migration

### Migration + Workflow Integration

- [ ] **MIGR-01**: User can run a single migration command to move flat layout into hierarchical structure
- [ ] **MIGR-03**: Migration maps files correctly (PROJECT.md -> `project/`; ROADMAP.md/STATE.md/REQUIREMENTS.md/phases/research -> `workspace/current/`; todos remain)
- [ ] **WORK-01**: Core workflows (new-project, new-milestone, discuss-phase, plan-phase, execute-phase, verify-work, progress, complete-milestone) use resolver-driven paths
- [ ] **WORK-03**: pr-branch filtering includes nested planning paths under the new hierarchy

### Decision + Feedback Loop Primitives

- [ ] **DEC-01**: `.planning/project/DECISIONS.md` exists as machine-parseable queue with statuses (`pending`, `decided`, `revisit`)
- [ ] **DEC-02**: Decision entries link to source phase/plan/requirements and capture options, rationale, and downstream impact
- [ ] **DELTA-01**: Spec delta artifacts are generated for completed plans/phases in `.planning/workspace/current/spec-deltas/`
- [ ] **DELTA-02**: Accepted spec deltas propagate into canonical specs (PROJECT.md, REQUIREMENTS.md, ROADMAP.md) with audit trail

### Parallel Contract Primitives

- [ ] **CONT-01**: Shared interface contract files can be defined under `.planning/project/contracts/` with owner, consumers, invariants, and version
- [ ] **CONT-02**: Planning and verification can reference contracts and detect contract violations/breaking changes

### Milestone Lifecycle

- [ ] **LIFE-01**: New milestone creation initializes fresh `.planning/workspace/current/` artifacts while preserving `.planning/project/`
- [ ] **LIFE-02**: Completing a milestone writes summary artifacts to `.planning/archive/milestones/` and updates `.planning/project/MILESTONES.md`
- [ ] **LIFE-03**: Milestone completion reconciles open decisions/spec-deltas (resolved, deferred, or carried forward)
- [ ] **LIFE-04**: Archive summaries preserve key outcomes, delivered requirements, decisions, and follow-ups for future milestone reference

## Future Requirements

Deferred beyond current roadmap.

- **CONF-01**: Configurable tier placement rules per artifact type
- **CONF-02**: Per-file visibility controls (persistent vs milestone-scoped vs local-only)
- **MIGR-04**: Migration dry-run and conflict resolution preview mode
- **LIFE-05**: Milestone comparison tooling across archived summaries

## Out of Scope

| Feature | Reason |
|---------|--------|
| Git-level externalization of planning (separate repo/submodule/worktree-only) | Higher operational complexity than needed for this milestone |
| Interactive migration wizard | Migration should be deterministic and automatable |
| Organization-wide portfolio planning across multiple repos | Separate product layer above repo-local workflow |
| Upstream fork-sync automation | Tracked separately from workspace architecture |
| jj stacked bookmark workflow | Separate milestone dependent on stable workspace model |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| HIER-01 | Phase 4 | Pending |
| HIER-02 | Phase 4 | Pending |
| HIER-03 | Phase 4 | Pending |
| HIER-04 | Phase 4 | Pending |
| MIGR-02 | Phase 4 | Pending |
| WORK-02 | Phase 4 | Pending |
| WORK-04 | Phase 4 | Pending |
| MIGR-01 | Phase 5 | Pending |
| MIGR-03 | Phase 5 | Pending |
| WORK-01 | Phase 5 | Pending |
| WORK-03 | Phase 5 | Pending |
| DEC-01 | Phase 5 | Pending |
| DEC-02 | Phase 5 | Pending |
| DELTA-01 | Phase 5 | Pending |
| DELTA-02 | Phase 5 | Pending |
| CONT-01 | Phase 5 | Pending |
| CONT-02 | Phase 5 | Pending |
| LIFE-01 | Phase 6 | Pending |
| LIFE-02 | Phase 6 | Pending |
| LIFE-03 | Phase 6 | Pending |
| LIFE-04 | Phase 6 | Pending |

**Coverage:**
- v2 requirements: 21 total
- Mapped to phases: 21
- Unmapped: 0

---
*Requirements defined: 2026-02-15*
*Last updated: 2026-03-04 — aligned with workspace/current + resolver + decisions/deltas/contracts design*
