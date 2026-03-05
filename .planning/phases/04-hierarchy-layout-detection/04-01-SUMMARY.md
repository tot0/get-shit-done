---
phase: 04-hierarchy-layout-detection
plan: "01"
subsystem: core
tags: [resolver, layout-detection, archive-normalization, path-resolution]
requires:
  - phase: none
    provides: foundation scope
provides:
  - Canonical artifact registry and resolver APIs for layout/path resolution
  - Deterministic hierarchical-first artifact selection with flat fallbacks
  - Archive namespace drift handling for canonical and legacy paths
affects: [04-02, 04-03, init, progress, phase-lookup]
tech-stack:
  added: []
  patterns: [resolver-first path policy, hierarchical-preferred deterministic fallback]
key-files:
  created: [.planning/phases/04-hierarchy-layout-detection/04-01-SUMMARY.md]
  modified: [get-shit-done/bin/lib/core.cjs, tests/core.test.cjs]
key-decisions:
  - "Prefer canonical hierarchical artifact paths when both canonical and flat paths exist, and surface explicit conflict metadata."
  - "Treat shared-path artifacts like todos as stable roots that should not bias layout mode to ambiguous."
patterns-established:
  - "Resolver metadata contract: source, fallbackUsed, conflict, candidates"
  - "Archive drift normalization: canonical .planning/archive/milestones with legacy .planning/milestones fallback"
duration: 1 min
completed: 2026-03-05
---

# Phase 4 Plan 1: Hierarchy Layout Resolver Summary

**Core now exposes a resolver-first contract that classifies planning layout mode and resolves canonical artifact paths with deterministic hierarchical preference, flat fallback, and drift/conflict signaling.**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-04T21:44:15-07:00
- **Completed:** 2026-03-05T04:46:07Z
- **Tasks:** 3
- **Files modified:** 2

## Accomplishments
- Added canonical artifact registry plus `resolveLayout(cwd)` and `resolveArtifactPath(cwd, artifact)` APIs in core.
- Refactored phase discovery and archived phase enumeration to use resolver-selected phase/archive roots.
- Added resolver regression coverage for all layout modes, archive namespace drift, and stable todos root behavior.

## Task Commits

Each task was committed atomically:

1. **Task 1: Build canonical resolver APIs in core** - `cd57f54` (feat)
2. **Task 2: Normalize phase/archive roots behind resolver** - `96052e1` (feat)
3. **Task 3: Add resolver mode and drift regression tests** - `9da4845` (fix)

**Plan metadata:** pending

## Files Created/Modified
- `get-shit-done/bin/lib/core.cjs` - Added artifact registry/resolver APIs and routed phase/archive helpers through resolver roots.
- `tests/core.test.cjs` - Added layout resolver, archive drift, and todos stability regression tests.

## Decisions Made
- Locked resolver behavior to hierarchical-first path selection when canonical and fallback paths both exist.
- Kept todos as a cross-milestone stable root (`.planning/todos`) and excluded shared-path artifacts from flat/hier ambiguity scoring.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Shared artifact path falsely triggered ambiguous layout mode**
- **Found during:** Task 3 (Add resolver mode and drift regression tests)
- **Issue:** `resolveLayout` counted `.planning/todos` as both hierarchical and flat because canonical and fallback are identical, producing false ambiguous classification.
- **Fix:** Updated signal collection to treat shared-path artifacts as a single stable signal and skip duplicate flat counting.
- **Files modified:** get-shit-done/bin/lib/core.cjs
- **Verification:** `npm test -- tests/core.test.cjs` passes including hierarchical-only layout test.
- **Committed in:** `9da4845`

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Auto-fix was required for layout correctness and preserved planned scope.

## Issues Encountered
- Resolver regression test initially failed on hierarchical-only layout due shared-path scoring; fixed in Task 3.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Resolver-first core/path contract is in place for downstream `init`/`progress`/roadmap migration tasks.
- Ready for `04-02-PLAN.md`.

---
*Phase: 04-hierarchy-layout-detection*
*Completed: 2026-03-05*

## Self-Check: PASSED
- FOUND: `.planning/phases/04-hierarchy-layout-detection/04-01-SUMMARY.md`
- FOUND commits: `cd57f54`, `96052e1`, `9da4845`
