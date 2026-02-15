# Roadmap: GSD Personal Dev Workspace (v2)

## Overview

Restructure `.planning/` from a flat layout into a three-tier hierarchy (`project/`, `milestones/<name>/`, `todos/`) so project context persists across milestones while milestone planning stays ephemeral. Includes migration from flat layout, milestone lifecycle management, and backward-compatible tooling updates.

**Phases:** 3 (numbered 4–6, continuing from v1)
**Depth:** Quick
**Coverage:** 15/15 v2 requirements mapped

## Phases

### Phase 4: Hierarchy & Layout Detection

**Goal:** Users can initialize and work within a three-tier `.planning/` structure, and all GSD tooling resolves paths correctly in both flat and hierarchical layouts.

**Dependencies:** None (foundation phase)

**Requirements:** HIER-01, HIER-02, HIER-03, HIER-04, MIGR-02, WORK-02, WORK-04

**Success Criteria:**
1. User can run a GSD command that creates `.planning/project/`, `.planning/milestones/<name>/`, and `.planning/todos/` directories with correct initial files in each tier
2. User's PROJECT.md and codebase context live in `.planning/project/` and are never deleted when a milestone completes
3. User's ROADMAP.md, STATE.md, and phase artifacts live in `.planning/milestones/<name>/` scoped to the active milestone
4. gsd-tools.js correctly resolves `.planning/` paths in both flat and hierarchical layouts — hierarchical preferred, flat fallback — without user intervention
5. Existing projects using flat `.planning/` layout continue to work identically without running any migration

### Phase 5: Migration & Workflow Integration

**Goal:** Users with existing flat `.planning/` projects can migrate to the new hierarchy, and all GSD workflow files + pr-branch use hierarchical paths.

**Dependencies:** Phase 4 (hierarchy must exist, layout detection must work)

**Requirements:** MIGR-01, MIGR-03, WORK-01, WORK-03

**Success Criteria:**
1. User can run a single migration command that moves flat `.planning/` files into the correct tiers (PROJECT.md → `project/`, ROADMAP.md/STATE.md → `milestones/v1/`, todos/ stays)
2. After migration, all GSD workflow files (new-project, new-milestone, plan-phase, execute-phase) read/write to hierarchical paths
3. pr-branch correctly filters all planning files under the new hierarchy (nested `milestones/<name>/` paths, `project/`, `todos/`)

### Phase 6: Milestone Lifecycle

**Goal:** Users can create new milestones, complete them with a summary, and maintain a persistent history of all milestones.

**Dependencies:** Phase 5 (workflows must use hierarchical paths, migration path exists)

**Requirements:** LIFE-01, LIFE-02, LIFE-03, LIFE-04

**Success Criteria:**
1. User can create a new milestone that initializes `.planning/milestones/<name>/` with scoped ROADMAP.md, STATE.md, and phase directories
2. User can complete a milestone, which generates a summary of key outcomes, decisions, and stats into `.planning/project/MILESTONES.md`
3. After completion, the milestone's directory (`.planning/milestones/<name>/`) is removed — only the summary persists
4. MILESTONES.md accumulates entries across milestones, providing a browsable history of all completed work

## Progress

| Phase | Name | Requirements | Status |
|-------|------|--------------|--------|
| 4 | Hierarchy & Layout Detection | 7 | Not Started |
| 5 | Migration & Workflow Integration | 4 | Not Started |
| 6 | Milestone Lifecycle | 4 | Not Started |

---
*Roadmap created: 2026-02-15*
*Milestone: v2 Personal Dev Workspace*
