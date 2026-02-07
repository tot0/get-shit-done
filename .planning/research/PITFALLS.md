# Domain Pitfalls

**Domain:** Git history manipulation / automated cherry-pick branch filtering
**Researched:** 2026-02-06
**Overall Confidence:** HIGH (verified against official git documentation)

## Critical Pitfalls

Mistakes that cause data loss, branch corruption, or require manual recovery.

### Pitfall 1: Working Branch Corruption

**What goes wrong:** The tool modifies the user's working branch (HEAD, index, or working tree) instead of operating exclusively on the derived PR branch. User loses uncommitted work, gets into detached HEAD state, or has their branch pointer moved.

**Why it happens:** Naive implementations use `git checkout <pr-branch>` to switch branches, apply changes, then switch back. Any failure during this sequence (crash, conflict, power loss) leaves the user on the wrong branch with a dirty state. Even successful operations briefly change HEAD, which confuses IDEs, file watchers, and other git-aware tools.

**Consequences:** User loses uncommitted changes. IDE indexes the wrong branch. File watchers trigger unnecessary rebuilds. In worst case, the working branch pointer is moved or detached HEAD leaves the user confused about their state.

**Prevention:**
- **Use `git worktree`** for all PR branch operations. This creates a separate working directory with its own checkout, leaving the user's HEAD, index, and working tree completely untouched.
- **Never run `git checkout` on the user's working tree** as part of the tool's operation.
- **If `git worktree` is unavailable** (git < 2.5), use `git cherry-pick` with `--no-commit` into a detached worktree created via `GIT_DIR` / `GIT_WORK_TREE` environment variable manipulation, or fall back to `git format-patch` / `git am` piped through a temporary bare clone.
- **Validate preconditions:** Before any operation, verify `git status --porcelain` is empty (or stash automatically and restore after).

**Detection:** Check `git rev-parse --abbrev-ref HEAD` before and after the operation. If they differ, corruption occurred. Add assertion: `if (currentBranch !== originalBranch) { abort and restore }`.

**Confidence:** HIGH — verified via `git-checkout` and `git-worktree` official documentation.

---

### Pitfall 2: Cherry-Pick Conflicts Halt Automation

**What goes wrong:** `git cherry-pick` encounters a merge conflict and enters an interactive conflict resolution state. The automation hangs or crashes, leaving `CHERRY_PICK_HEAD` set and the repository in a half-applied state.

**Why it happens:** When cherry-picking commits from the working branch to the PR branch, the context may differ (because planning-only commits that modified `.planning/` files were skipped). If a code commit was authored against a state that included planning file changes (e.g., a commit that updates both `src/app.js` and references a path mentioned in `.planning/notes.md`), the cherry-pick may not apply cleanly.

**Consequences:** The PR branch is left in a conflicted state. `CHERRY_PICK_HEAD` exists, preventing further git operations. If the tool doesn't clean up, the user's next `git status` shows unexpected conflict markers.

**Prevention:**
- **Abort on any conflict:** Since this is automated, never attempt to resolve conflicts. Run `git cherry-pick --abort` on any non-zero exit code.
- **Fail loudly with context:** Report which commit conflicted, what files are involved, and suggest the user create cleaner commits (separate planning from code changes).
- **Pre-check for mixed-content dependencies:** Before cherry-picking, analyze the diff of each commit to detect if it references files that exist only due to skipped planning commits.
- **Consider `git cherry-pick --no-commit` + manual staging:** Apply changes without committing, check for conflicts before committing. This gives more control but is slower.

**Detection:** Check exit code of `git cherry-pick`. Non-zero means conflict. Also check for existence of `.git/CHERRY_PICK_HEAD` file.

**Confidence:** HIGH — verified via `git-cherry-pick` official documentation. The docs explicitly state: "If the cherry-pick fails to complete, its sequencer state is saved and can be continued/aborted."

---

### Pitfall 3: Post-Commit Hook Infinite Recursion

**What goes wrong:** The post-commit hook triggers the PR branch filter, which creates commits on the PR branch. If the hook fires again for those commits (e.g., because it runs in the same repo context), it recurses infinitely until the stack overflows or the system runs out of resources.

**Why it happens:** Git hooks are triggered by git operations. A post-commit hook that itself creates git commits can trigger another post-commit hook invocation. This is especially insidious with `git worktree` because the worktree shares the same `.git` directory and thus the same hooks.

**Consequences:** Infinite recursion consuming CPU and disk. Potential creation of thousands of duplicate commits. System hangs.

**Prevention:**
- **Use a re-entrancy guard:** Set an environment variable (e.g., `GSD_PR_FILTER_RUNNING=1`) at the start of the hook. Check for it at the top and exit early if set. Pass this env var through to any spawned git operations.
- **Alternative: Lock file guard.** Create `.git/gsd-pr-filter.lock` at start, remove at end. Check for its existence before proceeding. Include PID in the lock file to handle stale locks from crashed processes.
- **Disable hooks during PR branch operations:** Use `git cherry-pick --no-verify` or set `core.hooksPath` to an empty directory temporarily when operating on the PR branch via worktree.
- **Never run the hook for commits on the PR branch:** Check `git rev-parse --abbrev-ref HEAD` — if it matches the `-pr` suffix pattern, exit immediately.

**Detection:** Monitor process count. If the hook has been running for more than N seconds, it's likely recursing.

**Confidence:** HIGH — verified via `githooks` official documentation. The docs note hooks receive `GIT_DIR` and `GIT_WORK_TREE` environment variables, and explicitly warn about hooks operating on foreign repositories needing to clear local env vars.

---

### Pitfall 4: Concurrent Git Operations / Lock File Deadlock

**What goes wrong:** The post-commit hook runs git commands while another git operation is already in progress. Git uses `.git/index.lock` for mutual exclusion. The hook's git commands fail with "fatal: Unable to create '.git/index.lock': File exists."

**Why it happens:** The post-commit hook runs AFTER the commit completes but potentially while git is still doing cleanup (updating refs, running gc). More commonly, the user starts another git operation (e.g., `git status` in their IDE) while the hook is running. With `git worktree`, the shared `.git` directory means lock contention between the main working tree and the worktree.

**Consequences:** Hook fails silently or noisily. PR branch is not updated. User sees confusing lock file errors. If the hook holds a lock and crashes, subsequent git operations fail until the stale lock is manually removed.

**Prevention:**
- **Use `git worktree`** which has its own index (`.git/worktrees/<name>/index`), reducing contention with the main working tree's index.
- **Run heavy operations asynchronously:** The post-commit hook should spawn a background process (`child_process.spawn` with `detached: true`) that does the actual cherry-pick work, and exit immediately.
- **Retry with backoff:** If a lock file is encountered, retry after a short delay (100ms, 200ms, 400ms) up to a maximum.
- **Never hold locks across long operations:** If doing multi-commit cherry-picks, release and re-acquire as needed.

**Detection:** Check for `.git/index.lock` existence before starting. Monitor for "index.lock" in git command stderr output.

**Confidence:** HIGH — this is a well-documented git behavior. The `git worktree` docs confirm per-worktree refs and index files, noting they reduce but don't eliminate shared-state contention.

---

### Pitfall 5: Mixed Commit Splitting Produces Incorrect History

**What goes wrong:** When auto-splitting a commit that touches both `.planning/` files and code files, the tool creates a code-only commit with the same message and metadata. But the code changes may depend on the planning file changes being present in the tree (e.g., a script that reads `.planning/config.json`). The resulting code-only commit produces a broken tree state.

**Why it happens:** The tool treats `.planning/` as a simple file path filter, not understanding semantic dependencies. A commit might add a feature that reads configuration from `.planning/config.json` — the code is meaningless without that file.

**Consequences:** The PR branch has commits that individually produce broken states. `git bisect` on the PR branch hits broken intermediate states. Reviewers see code that references files not present in the branch.

**Prevention:**
- **Accept that perfect splitting is impossible.** Document this limitation. The tool should warn when splitting mixed commits.
- **Run a tree-level integrity check after splitting:** After creating the code-only commit, verify the tree is buildable (if a build command is configured).
- **Encourage commit hygiene over smart splitting:** The primary mitigation is preventing mixed commits in the first place. Add a pre-commit hook (optional) that warns when staging both `.planning/` and non-`.planning/` files.
- **Include `.planning/config.json` as a "both" file:** Some planning files (like config) may be needed in the PR branch. Allow configuration of which `.planning/` files are "infrastructure" vs "pure planning."

**Detection:** After the full cherry-pick sequence, optionally run a user-specified validation command (e.g., `npm run build`, `tsc --noEmit`) on the PR branch worktree.

**Confidence:** MEDIUM — the specific scenarios are hypothetical but the general pattern (semantic dependencies across file boundaries) is well-established in git tooling experience.

---

### Pitfall 6: Force-Resetting the PR Branch Loses External Commits

**What goes wrong:** The tool recreates the PR branch from scratch on each run (for idempotency). It does `git branch -D feature/foo-pr && git checkout -b feature/foo-pr <base>` or equivalent. Any commits added directly to the PR branch (e.g., review feedback fixes, CI-triggered commits) are destroyed.

**Why it happens:** The simplest idempotent strategy is "delete and recreate." This works for the initial use case but becomes destructive once the PR branch becomes a collaboration artifact (reviewers push fixup commits, CI adds auto-formatted code, etc.).

**Consequences:** Lost commits. Lost review work. Reviewer confusion when their fixup commits vanish. Force-push of the PR branch invalidates existing review comments on GitHub/GitLab.

**Prevention:**
- **Track the "filter point":** Store the last commit from the working branch that was successfully filtered (e.g., in `.git/gsd-pr-filter-state` or a git note). On re-run, only process new commits since that point.
- **Never delete the PR branch.** Instead, incrementally cherry-pick new commits onto it.
- **For the "re-do from scratch" case:** Require an explicit `--force` flag. Warn the user that external commits will be lost.
- **Detect external commits:** Before resetting, check if the PR branch has commits not in the working branch's filtered set. If so, warn and require confirmation.

**Detection:** Compare the PR branch's commit history against the expected filtered set. Any commits not attributable to the filter tool are "external."

**Confidence:** HIGH — this is a common pattern in CI/CD branch management tools.

---

## Moderate Pitfalls

Mistakes that cause delays, confusing behavior, or technical debt.

### Pitfall 7: Empty Commits After Filtering

**What goes wrong:** After filtering out `.planning/` file changes from a mixed commit, the remaining diff is empty. The cherry-pick creates an empty commit (or fails, depending on configuration).

**Why it happens:** A commit that only modifies `.planning/` files but also has a meaningful commit message and metadata. After stripping the `.planning/` changes, nothing remains to commit.

**Prevention:**
- **Use `--empty=drop`** when cherry-picking (git 2.26+, well within our 2.52.0 requirement).
- **Pre-filter commit list:** Before cherry-picking, check each commit's diff against the file filter. Skip commits whose entire diff is within `.planning/`.
- **Log skipped commits:** Report which commits were pure-planning and dropped.

**Confidence:** HIGH — verified via `git-cherry-pick` documentation. `--empty=drop` is explicitly designed for this.

---

### Pitfall 8: Commit Metadata Loss During Splitting

**What goes wrong:** When splitting a mixed commit, the tool creates a new commit with different metadata: different author date (uses "now"), different committer identity (uses tool's git config), different GPG signature (unsigned).

**Why it happens:** `git commit` by default uses the current timestamp and configured user identity. The original commit's author, date, and signing are not automatically carried forward when creating a new commit from a partial cherry-pick.

**Prevention:**
- **Explicitly set author and date:** Use `git commit --author="Original Author <email>" --date="original-date"` or `git cherry-pick` which preserves author by default.
- **Accept committer identity change:** Git distinguishes "author" (who wrote the change) from "committer" (who applied it). It's acceptable for the committer to be different — this is normal for cherry-picked commits.
- **Don't attempt to preserve GPG signatures:** Splitting a commit necessarily invalidates the original signature. Document this limitation.

**Confidence:** HIGH — verified via `git-cherry-pick` documentation: "the authorship is preserved from the original commit."

---

### Pitfall 9: Merge Commits in Source Branch

**What goes wrong:** The working branch contains merge commits (from pulling upstream, merging feature branches, etc.). Cherry-picking a merge commit requires specifying `-m <parent-number>` to select which parent's changes to apply. Without it, cherry-pick fails.

**Why it happens:** Not all working branches have linear history. Teams that use merge workflows (rather than rebase) will have merge commits interspersed with regular commits.

**Prevention:**
- **Skip merge commits by default.** Merge commits typically don't contain novel changes — the changes are in the merged branch's individual commits. Use `git rev-list --no-merges` to filter the commit list.
- **If merge commits must be handled:** Use `git cherry-pick -m 1 <merge-commit>` to cherry-pick relative to the first parent (the branch being merged into). But this is rarely necessary for the PR filter use case.
- **Document this behavior:** Users should know that merge commits are skipped and why.

**Confidence:** HIGH — verified via `git-cherry-pick` documentation: "Usually you cannot cherry-pick a merge because you do not know which side of the merge should be considered the mainline."

---

### Pitfall 10: Hook Environment Variable Pollution

**What goes wrong:** The post-commit hook inherits git environment variables (`GIT_DIR`, `GIT_WORK_TREE`, `GIT_INDEX_FILE`) from the parent git process. When the hook operates on a `git worktree` for the PR branch, these variables point to the wrong locations, causing operations to affect the main working tree instead of the worktree.

**Why it happens:** Git sets environment variables for hooks that override the default repository detection. These variables are process-inherited and affect all git commands run by the hook.

**Prevention:**
- **Clear inherited git environment variables** at the start of any hook code that operates on a different repository or worktree:
  ```bash
  unset $(git rev-parse --local-env-vars)
  ```
  Or in Node.js:
  ```javascript
  const envVars = execSync('git rev-parse --local-env-vars').toString().split('\n');
  envVars.forEach(v => delete process.env[v]);
  ```
- **Explicitly set `GIT_DIR` and `GIT_WORK_TREE`** for worktree operations rather than relying on cwd-based detection.
- **Use `git -C <worktree-path>`** prefix for all git commands operating on the worktree.

**Detection:** Log the values of `GIT_DIR`, `GIT_WORK_TREE`, and `GIT_INDEX_FILE` at hook entry. If they point to unexpected locations, the hook is polluted.

**Confidence:** HIGH — verified via `githooks` official documentation. The docs explicitly instruct: "If the hook needs to invoke git commands in a foreign repository, they need to clear these environment variables."

---

### Pitfall 11: Worktree Cleanup on Failure

**What goes wrong:** A `git worktree add` creates a temporary worktree for PR branch operations. The tool crashes mid-operation. The worktree directory remains on disk, and the worktree is registered in `.git/worktrees/`. Subsequent runs fail with "fatal: '<path>' is already checked out."

**Why it happens:** `git worktree` tracks active worktrees in `.git/worktrees/`. If the directory exists and is registered, git refuses to create another checkout. The tool needs explicit cleanup on all exit paths.

**Prevention:**
- **Use try/finally cleanup:** Wrap all worktree operations in try/finally that runs `git worktree remove <path> --force`.
- **Use predictable worktree paths:** Always use the same path (e.g., `.git/gsd-pr-worktree/`) so stale worktrees from previous crashes are overwritten.
- **Run `git worktree prune`** at the start of each invocation to clean up stale worktree registrations.
- **Add cleanup to error handling:** On any error, ensure the worktree is removed before reporting the error.

**Detection:** Check `git worktree list` for stale entries. Check for orphaned worktree directories on disk.

**Confidence:** HIGH — verified via `git-worktree` documentation. The docs describe the `prune` and `remove` subcommands for exactly this scenario.

---

### Pitfall 12: Diverged Base Branch

**What goes wrong:** The PR branch was created from `main` at commit A. The user's working branch is based on `main` at commit B (newer). When cherry-picking onto the PR branch, the commits don't apply cleanly because the PR branch's base is older.

**Why it happens:** The tool creates the PR branch once and then incrementally adds to it. But if the working branch is rebased onto a newer `main`, the PR branch falls behind.

**Prevention:**
- **Rebase the PR branch onto the same base as the working branch** before cherry-picking new commits.
- **Track the base commit:** Store the base commit hash when creating the PR branch. On re-run, check if the working branch's merge-base with `main` has changed. If so, reset the PR branch to the new base and re-filter all commits.
- **Document the "fresh start" escape hatch:** `gsd-pr-branch --force` recreates from scratch when incremental updates fail.

**Confidence:** MEDIUM — depends on the team's branching strategy. More relevant for long-lived feature branches.

---

## Minor Pitfalls

Mistakes that cause annoyance but are easily fixable.

### Pitfall 13: Branch Naming Collisions

**What goes wrong:** The derived branch name (e.g., `feature/foo-pr`) already exists from a previous, unrelated use. Or the user manually created a branch with the `-pr` suffix for other reasons.

**Prevention:**
- **Check if the PR branch exists and was created by this tool** (e.g., via a tag or git note marker).
- **If it exists and wasn't created by the tool:** Error with a clear message. Don't silently overwrite.
- **Allow configurable suffix:** Default to `-pr` but allow override in `.planning/config.json`.

**Confidence:** HIGH — straightforward edge case.

---

### Pitfall 14: Binary Files in Split Commits

**What goes wrong:** A mixed commit includes both binary files and `.planning/` files. The tool's file-path-based filtering works correctly for the split, but the cherry-pick of binary changes may not apply cleanly if the binary file has also been modified in a skipped commit.

**Prevention:**
- **Binary files are handled by git's normal merge machinery.** This is only a problem if a binary file's content depends on a skipped commit's binary state (rare for the `.planning/` filter case, since planning files are markdown/JSON, not binary).
- **No special handling needed** unless binary files are stored in `.planning/` (unlikely).

**Confidence:** HIGH — binary handling is well-understood in git.

---

### Pitfall 15: Submodule Interactions

**What goes wrong:** If the repository uses git submodules and a commit modifies both submodule references and `.planning/` files, the split commit may produce a tree with inconsistent submodule states.

**Prevention:**
- **Document that submodules are out of scope for v1.** The tool operates on top-level repository files only.
- **Detect submodule changes** (`.gitmodules` modifications or submodule pointer updates) and skip/warn rather than splitting.

**Confidence:** MEDIUM — submodule edge cases are notoriously complex but unlikely in the GSD use case.

---

## Performance Pitfalls

### Pitfall 16: Post-Commit Hook Running Full Filter on Every Commit

**What goes wrong:** The post-commit hook triggers a full re-analysis and cherry-pick of the entire branch history on every single commit. For a branch with 100+ commits, this takes several seconds, making every commit noticeably slow.

**Why it happens:** The simplest implementation is "rebuild the PR branch from scratch on every commit." This is correct but slow.

**Prevention:**
- **Incremental mode:** Track the last-processed commit. On each post-commit invocation, only process new commits since that marker.
- **Async processing:** The hook spawns a background process and exits immediately. The user doesn't wait for the filter to complete.
- **Debounce:** If commits arrive in rapid succession (e.g., during a rebase or batch operation), coalesce into a single filter run. Use a lock file with a timestamp — if the lock is younger than N seconds, skip.
- **On-demand as default, hook as opt-in:** Start with the manual command. Make the auto-sync hook an explicit opt-in feature in config.

**Confidence:** HIGH — performance characteristics of git operations are well-understood.

---

### Pitfall 17: Large Repository Commit Scanning

**What goes wrong:** Scanning the full git log to identify which commits touch `.planning/` files is slow for repositories with thousands of commits.

**Prevention:**
- **Scope the scan:** Only examine commits between the merge-base (with the target branch) and HEAD. Use `git rev-list --ancestry-path $(git merge-base main HEAD)..HEAD`.
- **Use `git log --name-only` or `git diff-tree`** for efficient per-commit file listing without loading full diffs.
- **Cache results:** Store the commit→classification mapping. On re-run, only classify new commits.

**Confidence:** HIGH — standard git performance optimization patterns.

---

## "Looks Done But Isn't" Checklist

Things that seem complete but have subtle gaps.

| Area | What Seems Done | What's Actually Missing |
|------|----------------|------------------------|
| Cherry-pick | All commits applied | Merge commits silently skipped without warning |
| Commit splitting | Code-only commit created | Original commit's author date not preserved |
| Idempotency | Re-run produces same branch | External commits on PR branch silently destroyed |
| Hook integration | Post-commit hook works | No re-entrancy guard, infinite recursion possible |
| Error handling | Conflicts detected | `CHERRY_PICK_HEAD` not cleaned up on abort path |
| Worktree cleanup | Happy path cleans up | Crash/signal handler missing, stale worktree remains |
| Branch creation | PR branch created | Didn't check if branch name already exists from manual creation |
| File filtering | `.planning/` files excluded | `.planning/config.json` might be needed by code at runtime |

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Core cherry-pick engine | Pitfall 2 (conflicts halt automation) | Abort-and-report strategy, never attempt auto-resolve |
| Core cherry-pick engine | Pitfall 7 (empty commits) | Use `--empty=drop`, pre-filter commit list |
| Core cherry-pick engine | Pitfall 9 (merge commits) | Use `--no-merges` in rev-list |
| Mixed commit splitting | Pitfall 5 (broken tree state) | Warn on split, optional build validation |
| Mixed commit splitting | Pitfall 8 (metadata loss) | Explicitly preserve author/date |
| Worktree-based isolation | Pitfall 1 (working branch corruption) | Use `git worktree`, never `git checkout` |
| Worktree-based isolation | Pitfall 11 (cleanup on failure) | try/finally + `git worktree prune` |
| Worktree-based isolation | Pitfall 10 (env var pollution) | Clear `GIT_DIR`, `GIT_WORK_TREE` in hook |
| Incremental updates | Pitfall 6 (losing external commits) | Track filter state, detect external commits |
| Incremental updates | Pitfall 12 (diverged base) | Track and update base commit |
| Post-commit hook | Pitfall 3 (infinite recursion) | Env var or lock file re-entrancy guard |
| Post-commit hook | Pitfall 4 (lock deadlock) | Async background process, worktree isolation |
| Post-commit hook | Pitfall 16 (performance) | Incremental mode, async, debounce |

---

## Recovery Strategies

When things go wrong despite prevention, here's how to recover.

### Working Branch Recovery

If the user's working branch is corrupted:
1. `git reflog` — find the pre-operation HEAD position
2. `git reset --hard <reflog-entry>` — restore to that state
3. `git stash pop` — if changes were stashed by the tool

The tool should log the starting reflog position before any operation to make recovery instructions specific.

### PR Branch Recovery

If the PR branch is in a bad state:
1. `git branch -D feature/foo-pr` — delete the broken branch
2. Re-run the filter command — recreates from scratch
3. If incremental state is corrupted: `git branch -D feature/foo-pr && rm .git/gsd-pr-filter-state` — full reset

### Stuck Cherry-Pick Recovery

If `CHERRY_PICK_HEAD` exists:
1. `git cherry-pick --abort` — cleanly abort the in-progress cherry-pick
2. Clean up worktree: `git worktree remove <path> --force`
3. Re-run the filter command

### Stale Worktree Recovery

If a worktree is orphaned:
1. `git worktree prune` — remove stale worktree registrations
2. `rm -rf .git/gsd-pr-worktree/` — remove orphaned directory
3. Re-run the filter command

---

## Sources

- `git-cherry-pick` official documentation (verified via git-scm.com, HIGH confidence)
  - `--empty=drop|keep|stop` behavior
  - Conflict handling and `CHERRY_PICK_HEAD` state
  - Clean working tree requirement
  - Author preservation behavior
  - Merge commit handling with `-m <parent-number>`

- `git-worktree` official documentation (verified via git-scm.com, HIGH confidence)
  - Per-worktree index files vs shared refs
  - `prune` and `remove` subcommands
  - Known bugs: "Multiple checkout is still experimental"
  - Lock file behavior

- `git-checkout` official documentation (verified via git-scm.com, HIGH confidence)
  - `-B` flag for force-creating branches
  - Detached HEAD mechanics
  - `--orphan` for disconnected history

- `githooks` official documentation (verified via git-scm.com, HIGH confidence)
  - `post-commit` hook behavior (no arguments, no stdin)
  - Environment variables (`GIT_DIR`, `GIT_WORK_TREE`)
  - Warning about clearing env vars for foreign repository operations

- Local git version: 2.52.0 (verified via `git --version`)

- Existing GSD codebase analysis:
  - `.planning/codebase/CONCERNS.md` — zero test coverage, fragile patterns
  - `.planning/codebase/ARCHITECTURE.md` — hook infrastructure patterns
  - `get-shit-done/references/git-integration.md` — commit conventions

---

*Pitfalls research: 2026-02-06*
