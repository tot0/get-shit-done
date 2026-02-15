# Requirements: GSD Personal Dev Workspace

**Defined:** 2026-02-15
**Core Value:** Developers can use GSD planning freely without worrying about PR pollution — one command produces a clean branch for review.

## v2 Requirements

Requirements for the Personal Dev Workspace milestone. Each maps to roadmap phases.

### Hierarchy

- [ ] **HIER-01**: User can initialize a project with three-tier `.planning/` structure (`project/`, `milestones/<name>/`, `todos/`)
- [ ] **HIER-02**: User's project-level context (PROJECT.md, codebase maps, notes) persists in `.planning/project/` across milestone boundaries
- [ ] **HIER-03**: User's milestone artifacts (ROADMAP.md, STATE.md, phases, research) are scoped to `.planning/milestones/<name>/`
- [ ] **HIER-04**: User's todos span milestones in `.planning/todos/`

### Migration

- [ ] **MIGR-01**: User can run a migration command to restructure flat `.planning/` to three-tier hierarchy
- [ ] **MIGR-02**: GSD auto-detects whether `.planning/` uses flat or hierarchical layout
- [ ] **MIGR-03**: Migration correctly maps existing files to new tier locations (PROJECT.md → `project/`, ROADMAP.md/STATE.md → `milestones/v1/`, todos/ stays)

### Lifecycle

- [ ] **LIFE-01**: New milestone creation initializes `.planning/milestones/<name>/` with scoped artifacts
- [ ] **LIFE-02**: Completing a milestone summarizes key outcomes into MILESTONES.md
- [ ] **LIFE-03**: Completed milestone directory is cleaned up after summarization
- [ ] **LIFE-04**: MILESTONES.md provides history of all completed milestones with key decisions and outcomes

### Workflow

- [ ] **WORK-01**: GSD workflow files (new-project, new-milestone, plan-phase, execute-phase) reference hierarchical paths
- [ ] **WORK-02**: gsd-tools.js resolves paths based on detected layout (hierarchical preferred, flat fallback)
- [ ] **WORK-03**: pr-branch correctly filters planning files in new hierarchy
- [ ] **WORK-04**: Projects using flat `.planning/` layout continue to work without migration (backward compatibility)

## Future Requirements

Deferred to future milestones. Tracked but not in current roadmap.

### Configuration

- **CONF-01**: Configurable tier placement — user can define which files belong in which tier
- **CONF-02**: Per-file visibility rules — mark individual files as persistent, milestone-scoped, or local-only

### Migration Enhancements

- **MIGR-04**: Dry-run mode for migration command — preview changes before executing

### Lifecycle Enhancements

- **LIFE-05**: Auto-archive milestone before delete — keep compressed backup
- **LIFE-06**: Milestone comparison — diff what changed between milestones

## Out of Scope

| Feature | Reason |
|---------|--------|
| Git-level separation (worktrees/submodules for .planning/) | File-level hierarchy is simpler and sufficient for this foundation |
| Interactive migration wizard | Migration should be fully automated, no interactive prompts |
| Multi-milestone parallel workstreams | Foundation must land first; parallel support builds on this hierarchy |
| Forward-integration from upstream | Separate milestone, depends on hierarchy being stable |
| jj integration | Separate milestone, orthogonal to hierarchy restructuring |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| HIER-01 | — | Pending |
| HIER-02 | — | Pending |
| HIER-03 | — | Pending |
| HIER-04 | — | Pending |
| MIGR-01 | — | Pending |
| MIGR-02 | — | Pending |
| MIGR-03 | — | Pending |
| LIFE-01 | — | Pending |
| LIFE-02 | — | Pending |
| LIFE-03 | — | Pending |
| LIFE-04 | — | Pending |
| WORK-01 | — | Pending |
| WORK-02 | — | Pending |
| WORK-03 | — | Pending |
| WORK-04 | — | Pending |

**Coverage:**
- v2 requirements: 15 total
- Mapped to phases: 0
- Unmapped: 15 (pending roadmap creation)

---
*Requirements defined: 2026-02-15*
*Last updated: 2026-02-15 after initial definition*
