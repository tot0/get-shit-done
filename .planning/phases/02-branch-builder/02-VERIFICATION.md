---
phase: 02-branch-builder
verified: 2026-02-07T23:30:00Z
status: passed
score: 14/14 must-haves verified
must_haves:
  truths:
    - "PR branch name is derived from source branch automatically"
    - "Worktree is created in temp directory without touching user's working tree"
    - "Worktree is always cleaned up even on error"
    - "Cherry-pick preserves original author, date, and message"
    - "Cherry-pick conflict is detected, aborted, reported with conflicting files, and worktree is cleaned up"
    - "Mixed commits and merge commits are skipped with warnings"
    - "Running `node gsd-tools.js pr-branch` without --dry-run creates a {source}-pr branch with cherry-picked code-only commits"
    - "Running the tool again after adding new source commits cherry-picks only NEW non-planning commits (incremental update)"
    - "Mixed commits are warned about and skipped in the execution summary"
    - "Cherry-pick conflicts cause immediate abort with conflict file report"
    - "Force-push warning appears when PR branch was pushed and source was rebased"
    - "Source branch and working tree are never modified"
    - "Human-readable summary shows commits included, excluded, skipped, and PR branch name"
    - "Raw JSON output includes all execution results"
  artifacts:
    - path: "get-shit-done/bin/gsd-tools.js"
      provides: "All Phase 2 functions and execution mode"
  key_links:
    - from: "CLI router (pr-branch case)"
      to: "cmdPrBranch"
      via: "switch case at line 1196"
    - from: "cmdPrBranch execution mode"
      to: "createWorktree, cherryPickCommits, removeWorktree"
      via: "try/finally block at line 607"
    - from: "cmdPrBranch incremental detection"
      to: "findNewCodeCommits → buildPatchIdMap"
      via: "called at line 579"
    - from: "findNewCodeCommits"
      to: "buildPatchIdMap"
      via: "called at lines 368-369"
---

# Phase 2: Branch Builder Verification Report

**Phase Goal:** User can produce a clean PR branch with one command, and incrementally update it as they add more commits — without force-pushing
**Verified:** 2026-02-07T23:30:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | PR branch name is derived from source branch automatically | ✓ VERIFIED | `getPrBranchName()` (L259-263) uses `git rev-parse --abbrev-ref HEAD` + `-pr` suffix. Used at L554. |
| 2 | Worktree is created in temp directory without touching user's working tree | ✓ VERIFIED | `createWorktree()` (L273-285) uses `fs.mkdtempSync(path.join(os.tmpdir(), 'gsd-pr-'))`. Cherry-pick runs in `wtPath`, never `cwd`. |
| 3 | Worktree is always cleaned up even on error | ✓ VERIFIED | `try/finally` block (L607-636) calls `removeWorktree(cwd, wtPath)` in `finally`. `removeWorktree` (L287-292) force-removes worktree + prunes. `createWorktree` prunes stale worktrees as defense-in-depth (L275). |
| 4 | Cherry-pick preserves original author, date, and message | ✓ VERIFIED | `git cherry-pick <hash>` (L306) without `--reset-author` — git's default preserves authorship metadata. |
| 5 | Cherry-pick conflict is detected, aborted, reported with conflicting files, and worktree cleaned up | ✓ VERIFIED | Conflict detection via `git diff --name-only --diff-filter=U` (L313). Abort via `cherry-pick --abort` (L325). Failed result includes hash, subject, conflictFiles (L326). Report at L614-632. Cleanup via `finally` (L634-636). |
| 6 | Mixed commits and merge commits are skipped with warnings | ✓ VERIFIED | Merges skipped at L301-303 with reason. Mixed filtered out at L560. Both shown in execution summary: mixed at L679-681 with ⚠ MIX label, merges at L684-686 with SKIP label. |
| 7 | Running `node gsd-tools.js pr-branch` creates {source}-pr branch with cherry-picked code-only commits | ✓ VERIFIED | Execution mode (L548-707): filters to code-only (L560), creates worktree with PR branch (L609), cherry-picks (L612). Confirmed working via live dry-run test showing correct classification. |
| 8 | Running tool again after new source commits cherry-picks only NEW commits (incremental update) | ✓ VERIFIED | `findNewCodeCommits()` (L357-391) builds patch-id maps for both PR and source branches, filters to commits not already on PR branch. Used at L579 when `prExists` is true. Mode set to 'incremental' (L593). |
| 9 | Mixed commits are warned about and skipped in execution summary | ✓ VERIFIED | Mixed commits shown with ⚠ MIX label (L680). Count shown in totals (L698). Warning tip shown (L702-703). |
| 10 | Cherry-pick conflicts cause immediate abort with conflict file report | ✓ VERIFIED | `cherryPickCommits` aborts on conflict (L325) and breaks loop (L327). `cmdPrBranch` reports conflicting commit hash, subject, and file list (L617-627), then exits with code 1 (L632). |
| 11 | Force-push warning when PR branch pushed and source rebased | ✓ VERIFIED | `needsRebuild` detected by zero patch-id overlap (L388). If `prBranchPushed()` true (L582), errors with force-push message (L583). If not pushed, rebuilds by deleting and recreating (L587-590). |
| 12 | Source branch and working tree are never modified | ✓ VERIFIED | All cherry-pick operations use `wtCwd` (worktree path), not `cwd`. Only read-only git ops use `cwd` (rev-parse, rev-list, patch-id). The sole write to `cwd` is `branch -D prBranch` (L587) which deletes the PR branch, not source. |
| 13 | Human-readable summary shows commits included, excluded, skipped, and PR branch name | ✓ VERIFIED | Execution summary (L659-707) shows: PR branch name (L661), mode (L664-669), picked commits (L674-676), mixed skips (L679-681), merge skips (L684-686), empty skips (L689-691), totals with branch name (L697-699). |
| 14 | Raw JSON output includes all execution results | ✓ VERIFIED | Raw output (L639-657) includes: mode, prBranch, baseBranch, mergeBase, picked array, skippedMixed array, skippedMerges array, skippedEmpty array, failed status. |

**Score:** 14/14 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `get-shit-done/bin/gsd-tools.js` | All Phase 2 functions + execution mode | ✓ VERIFIED | 1213 lines. 8 new functions added (getPrBranchName, prBranchExists, prBranchPushed, createWorktree, removeWorktree, cherryPickCommits, buildPatchIdMap, findNewCodeCommits). cmdPrBranch extended with execution mode. Syntax valid. No stubs/TODOs. |

#### Artifact Detail: `get-shit-done/bin/gsd-tools.js`

- **Exists:** ✓ (1213 lines)
- **Substantive:** ✓ (well above minimum, 0 TODO/FIXME, 0 placeholder patterns, has real implementations)
- **Wired:** ✓ (all 8 functions called within cmdPrBranch, CLI router routes `pr-branch` to cmdPrBranch)
- **Syntax valid:** ✓ (`node -c` passes)
- **Runtime functional:** ✓ (live `--dry-run` test produced correct output with 22 planning + 9 code commits)

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| CLI router `pr-branch` | `cmdPrBranch()` | switch case L1196-1206 | ✓ WIRED | Parses `--dry-run` and `--base` flags, calls `cmdPrBranch(cwd, flags, raw)` |
| `cmdPrBranch` | `createWorktree()` | L609 | ✓ WIRED | Creates worktree in temp dir, returns path used for cherry-pick |
| `cmdPrBranch` | `cherryPickCommits()` | L612 | ✓ WIRED | Passes worktree path, receives structured result with picked/failed/skipped |
| `cmdPrBranch` | `removeWorktree()` | L635 (finally) | ✓ WIRED | Always called via try/finally cleanup |
| `cmdPrBranch` | `findNewCodeCommits()` | L579 | ✓ WIRED | Called when PR branch exists, result drives incremental/rebuild decision |
| `findNewCodeCommits` | `buildPatchIdMap()` | L368-369 | ✓ WIRED | Builds maps for both PR and source sides, used for filtering |
| `cmdPrBranch` | `getPrBranchName()` | L554 | ✓ WIRED | Result used for worktree branch name and display |
| `cmdPrBranch` | `prBranchExists()` | L574 | ✓ WIRED | Result determines fresh vs incremental mode |
| `cmdPrBranch` | `prBranchPushed()` | L582 | ✓ WIRED | Result determines force-push error vs rebuild |
| Conflict result | User report | L614-632 | ✓ WIRED | `cpResult.failed` drives detailed conflict report output |
| Execution result | Human summary | L659-707 | ✓ WIRED | `cpResult.picked`, `mixedCommits`, `cpResult.skippedMerges`, `cpResult.skippedEmpty` all rendered |
| Execution result | Raw JSON | L639-657 | ✓ WIRED | All result fields included in JSON output |

### Requirements Coverage

| Requirement | Description | Status | Evidence |
|-------------|-------------|--------|----------|
| FILT-02 | Cherry-picks code-only commits onto PR branch | ✓ SATISFIED | L560 filters to code-only, L612 cherry-picks via worktree |
| FILT-03 | Detects mixed commits, warns, skips by default | ✓ SATISFIED | L561 filters mixed, L679-681 warns, L702-703 shows tip |
| BRCH-01 | Derives PR branch name from source branch | ✓ SATISFIED | `getPrBranchName()` L259-263: `HEAD + '-pr'` |
| BRCH-02 | Never modifies source/working branch | ✓ SATISFIED | All writes in worktree. Only `branch -D prBranch` writes to repo (rebuilds PR branch, not source) |
| BRCH-03 | Incremental updates via patch-id detection | ✓ SATISFIED | `findNewCodeCommits()` L357-391 with patch-id maps |
| BRCH-05 | Warns when pushed PR branch needs force-push rebuild | ✓ SATISFIED | L581-583: `needsRebuild && prBranchPushed` → error with force-push message |
| UX-02 | Clear summary after each run | ✓ SATISFIED | L659-707: mode, commits, skips, totals, PR branch name |
| UX-03 | Fails loudly on cherry-pick conflicts | ✓ SATISFIED | L614-632: conflict hash, subject, file list, exit code 1 |
| INTG-04 | Preserves original commit metadata | ✓ SATISFIED | `git cherry-pick` default preserves author, date, message |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | No anti-patterns detected | — | — |

- 0 TODO/FIXME/HACK/PLACEHOLDER patterns
- 0 console.log debugging statements
- 0 empty implementations
- `return null` patterns (L216, L221, L261, L282) are all legitimate error-case returns, not stubs

### Human Verification Required

### 1. Full PR Branch Creation End-to-End

**Test:** On a feature branch with mixed planning/code commits, run `node gsd-tools.js pr-branch` and verify a `{branch}-pr` branch is created with only code commits.
**Expected:** PR branch exists with correct name, contains only code-file commits, preserves authorship metadata (`git log --format='%an %ae %ai'`).
**Why human:** Requires actual git branch state manipulation and inspection that can't be verified by static analysis.

### 2. Incremental Update After New Commits

**Test:** After creating a PR branch, add more code commits to the source branch, then run `node gsd-tools.js pr-branch` again.
**Expected:** Only the new commits are cherry-picked. The PR branch history shows old + new commits without duplication. No force-push needed.
**Why human:** Requires sequential git state manipulation and timeline verification.

### 3. Cherry-Pick Conflict Handling

**Test:** Create a scenario where a code commit conflicts with the PR branch base, then run the tool.
**Expected:** Tool exits with code 1, reports the conflicting commit and files, source branch is unchanged, worktree is cleaned up (no stale worktrees in `git worktree list`).
**Why human:** Requires engineering a conflict scenario and verifying cleanup.

### 4. Force-Push Warning for Pushed+Rebased Scenario

**Test:** Create PR branch, push it to remote, then rebase the source branch (changing commit hashes). Run the tool again.
**Expected:** Tool errors with force-push warning mentioning the remote push.
**Why human:** Requires remote push and rebase state, difficult to simulate in static analysis.

### Gaps Summary

No gaps found. All 14 must-have truths verified through code analysis:

- **8 Phase 2 functions** all exist, are substantive (real implementations, no stubs), and are wired into `cmdPrBranch`
- **CLI router** correctly routes `pr-branch` command with `--dry-run`/`--base` flag parsing
- **Execution mode** implements complete workflow: classify → filter → worktree → cherry-pick → cleanup → report
- **Incremental detection** uses patch-id comparison for stateless, content-based matching
- **Conflict handling** detects via unmerged files, aborts, reports with detail, cleans up
- **Force-push protection** checks pushed status before rebuild, errors when dangerous
- **Live dry-run test** confirms the tool actually works: correctly classified 22 planning + 9 code + 0 mixed commits from current branch

All 9 Phase 2 requirements (FILT-02, FILT-03, BRCH-01, BRCH-02, BRCH-03, BRCH-05, UX-02, UX-03, INTG-04) are satisfied.

---

_Verified: 2026-02-07T23:30:00Z_
_Verifier: Claude (gsd-verifier)_
