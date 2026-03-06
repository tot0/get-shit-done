# Roadmap: GSD Personal Dev Workspace (v2)

## Overview

Restructure `.planning/` from a flat layout into a workspace hierarchy with persistent project memory and milestone-scoped execution:

- `.planning/project/` (persistent context)
- `.planning/workspace/current/` (active milestone)
- `.planning/archive/milestones/` (completed milestones)
- `.planning/todos/` (cross-milestone capture)

Includes resolver-first path compatibility, migration from flat layout, workflow integration, decision/spec-feedback primitives, and milestone lifecycle closure.

**Phases:** 3 (numbered 4–6, continuing from v1)
**Depth:** Quick
**Coverage:** 21/21 v2 requirements mapped

## Phases

### Phase 4: Hierarchy & Layout Detection

**Goal:** Establish resolver-backed layout foundation so GSD can operate correctly across both flat and hierarchical workspaces, including mixed/partial migration states.

**Dependencies:** None (foundation phase)

**Requirements:** HIER-01, HIER-02, HIER-03, HIER-04, MIGR-02, WORK-02, WORK-04

**Plans:** 3 plans

Plans:
- [ ] 04-01-PLAN.md — Build resolver-first layout detection and artifact path core
- [ ] 04-02-PLAN.md — Migrate init/progress read paths to resolver with legacy contract compatibility
- [ ] 04-03-PLAN.md — Migrate roadmap/phase lookup reads to resolver-driven roots

**Success Criteria:**
1. Resolver detects `flat`, `hierarchical`, `ambiguous`, and `none` layouts with confidence and conflict signals
2. Canonical hierarchical paths exist for `project/`, `workspace/current/`, `archive/milestones/`, and `todos/`
3. Read-path commands (`init`, `progress`, roadmap/phase lookup) use resolver outputs instead of hardcoded flat paths
4. Mixed/partial layout repos continue working via hierarchical-preferred, flat-fallback resolution
5. Flat-layout repos continue working unchanged with no required migration

### Phase 5: Migration & Workflow Integration

**Goal:** Complete migration and workflow write-path integration, and introduce decision/spec-feedback/contract primitives for parallel multi-agent work.

**Dependencies:** Phase 4 (hierarchy must exist, layout detection must work)

**Requirements:** MIGR-01, MIGR-03, WORK-01, WORK-03, DEC-01, DEC-02, DELTA-01, DELTA-02, CONT-01, CONT-02

**Success Criteria:**
1. User can run an idempotent migration command that maps flat artifacts into `project/` and `workspace/current/` while preserving todos
2. Write-path workflows (discuss/plan/execute/verify/new-project/new-milestone/complete-milestone) use resolver-driven artifact paths
3. `.planning/project/DECISIONS.md` supports pending/decided/revisit queue entries linked to phase/plan/requirements
4. Spec delta files are generated under `.planning/workspace/current/spec-deltas/` and support propagation into canonical specs
5. Contract files under `.planning/project/contracts/` can be authored and referenced in planning/verification
6. pr-branch filtering still removes planning artifacts under nested hierarchical paths

### Phase 6: Milestone Lifecycle

**Goal:** Complete milestone lifecycle with high-signal archival, carry-forward context, and governance closure for decisions/spec deltas.

**Dependencies:** Phase 5 (workflows must use hierarchical paths, migration path exists)

**Requirements:** LIFE-01, LIFE-02, LIFE-03, LIFE-04

**Success Criteria:**
1. New milestone creation initializes fresh `.planning/workspace/current/` artifacts while preserving `.planning/project/` context
2. Milestone completion writes archive artifacts to `.planning/archive/milestones/` including summary, roadmap snapshot, and requirements snapshot
3. Open decisions/spec-deltas are reconciled at milestone close (resolved, deferred, or carried forward) and recorded in archive summary
4. `.planning/project/MILESTONES.md` maintains a browsable index of completed milestones with links to archive summaries
5. Ephemeral milestone artifacts are cleared from `workspace/current/` after archival; persistent project artifacts remain intact

## Progress

| Phase | Name | Requirements | Status |
|-------|------|--------------|--------|
| 4 | Hierarchy & Layout Detection | 7 | Not Started |
| 5 | Migration & Workflow Integration | 10 | Not Started |
| 6 | Milestone Lifecycle | 4 | Not Started |

---
*Roadmap created: 2026-02-15*
*Last updated: 2026-03-04 — phases 5-6 rewritten for workspace/current + decisions/spec-deltas/contracts lifecycle*
*Milestone: v2 Personal Dev Workspace*
