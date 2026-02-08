---
phase: quick-003
plan: 01
subsystem: installer
tags: [opt-in, git-hooks, auto-sync, install]
dependency_graph:
  requires: []
  provides:
    - opt-in-git-hook-installation
  affects: [bin/install.js, install-flow]
tech_stack:
  added: []
  patterns: [flag-gated-side-effects]
key_files:
  created: []
  modified:
    - bin/install.js
key-decisions:
  - "Gate installGitPostCommitHook() behind --auto-sync flag rather than removing functionality"
metrics:
  duration: 1 min
  completed: 2026-02-08
---

# Quick 003: Make Git Hook Auto-Sync Opt-In Summary

**Git post-commit hook installation gated behind --auto-sync flag so default install no longer modifies .git/hooks/post-commit**

## Performance

- **Duration:** 1 min
- **Started:** 2026-02-08T18:12:11Z
- **Completed:** 2026-02-08T18:19:16Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Added `hasAutoSync` flag parsing from CLI args
- Gated `installGitPostCommitHook()` call behind `if (hasAutoSync)` conditional
- Preserved unconditional uninstall cleanup (lines 978-995 unchanged)
- Default install no longer touches `.git/hooks/post-commit`

## Task Commits

1. **Task 1: Add --auto-sync flag and gate hook installation behind it** - `57bab87` (feat)

## Files Created/Modified
- `bin/install.js` — Added `--auto-sync` flag parsing (line 28) and conditional hook installation (line 1563-1565)

## Decisions Made
- Gate the call site rather than modifying `installGitPostCommitHook()` itself — minimal change, function remains reusable
- Keep uninstall cleanup unconditional — users who previously installed the hook should still get it cleaned up on uninstall

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## Next Phase Readiness
- Users can now safely run `npx get-shit-done` without worrying about git hook modification
- `npx get-shit-done --auto-sync` explicitly opts in to PR auto-sync hook installation

---
*Quick task: 003-make-git-hook-auto-sync-opt-in-don-t-ins*
*Completed: 2026-02-08*

## Self-Check: PASSED

- [x] `bin/install.js` exists and contains `hasAutoSync`
- [x] Commit `57bab87` exists in git log
- [x] `installGitPostCommitHook` call is gated behind `if (hasAutoSync)`
- [x] Uninstall cleanup (lines 978-995) unchanged
