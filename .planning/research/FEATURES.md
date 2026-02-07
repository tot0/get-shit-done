# Feature Landscape: PR Branch Filter Tool

**Domain:** Git commit filtering / PR branch preparation
**Researched:** 2026-02-06
**Mode:** Ecosystem (Features dimension)
**Confidence:** MEDIUM-HIGH

## Existing Tool Analysis

Before categorizing features, here's what we can learn from related tools.

### git-filter-repo (11.6k stars)
**What it does:** Rewrites entire repository history — removes files, renames paths, prunes empty commits.
**Relevant lessons:**
- Path-based filtering is the core primitive (keep/remove by path pattern)
- Become-empty commit pruning is critical — commits that become empty after filtering must be removed
- Commit message rewriting (updating SHA references) is a nice touch but overkill for our use case
- Fresh clone safety pattern — refuse to run on a repo with unsaved work unless `--force`
- Speed matters enormously — filter-branch was deprecated partly due to being too slow
**What NOT to copy:** It rewrites history destructively. Our tool creates a *new branch*, never touching the original.
**Confidence:** HIGH (official GitHub repo, verified)

### git-town (3k stars)
**What it does:** Higher-level branch management — create, sync, ship, cleanup branches. Supports stacked changes.
**Relevant lessons:**
- `git town sync` re-syncs branches automatically — analogous to our "re-run to update" requirement
- `git town ship` merges completed feature branches — we're solving the step *before* ship (cleaning the branch)
- Error recovery (`continue`, `skip`, `undo`) is a first-class concern — users need escape hatches
- Configuration via `git-town.toml` — per-repo config is expected
- Undo capability for complex multi-step operations
**What NOT to copy:** Full branch lifecycle management — we only care about producing a clean PR branch.
**Confidence:** HIGH (official GitHub repo, verified)

### git-branchless (4k stars)
**What it does:** Suite of tools for commit graph manipulation — undo, smartlog, move, restack. Favors patch-stack workflows.
**Relevant lessons:**
- In-memory operations (no working copy checkout needed) enable much faster rebases — relevant for our cherry-pick approach
- `git sync` rebases all local stacks without checking them out — our PR branch update should similarly avoid checkout disruption
- Commit graph visualization (`git sl`) helps users understand what happened — we need clear output showing which commits were included/excluded
- Operation safety: tracks all operations for undo — excessive for us but the *principle* of recoverability matters
**What NOT to copy:** Full commit graph management, anonymous branching, revset query language — massive scope creep.
**Confidence:** HIGH (official GitHub repo, verified)

### git-absorb (5.4k stars)
**What it does:** Automatically maps staged changes to the right fixup commit in a stack. Like `git commit --fixup` but automatic.
**Relevant lessons:**
- **Patch commutation** — determines which commit a change "belongs to" by checking if patches commute. This is conceptually related to our mixed commit splitting problem.
- Auto-detection of where changes belong is the key UX win — users don't manually specify, the tool figures it out
- `--and-rebase` flag for automatic integration vs manual review — good pattern for "do it all" vs "let me check first"
- Safety: if unsure, leave changes uncommitted rather than guessing wrong — our tool should similarly fail loudly rather than silently produce wrong output
**What NOT to copy:** The patch commutation algorithm itself (our problem is simpler: filter by file path, not by hunk ancestry).
**Confidence:** HIGH (official GitHub repo, verified)

### .gitattributes `export-ignore` (built-in Git)
**What it does:** Marks paths to exclude from `git archive` exports.
**Relevant lesson:** Git already has the concept of "these files are part of the repo but shouldn't be in the deliverable." Our tool extends this to branches/PRs rather than archives.
**Why insufficient:** Only affects `git archive`, not branches or PRs. Doesn't help with PR review.
**Confidence:** HIGH (git built-in, verified via docs)

### GitHub CODEOWNERS / `.github/`
**Relevant pattern:** GitHub already supports repo-level config for PR behavior. Teams use `.github/CODEOWNERS` to auto-assign reviewers and `.gitattributes` with `linguist-generated` to collapse generated files in PR diffs.
**What this tells us:** The *hiding* approach (collapse in diff) is GitHub's answer. Our *filtering* approach (remove from branch entirely) is more aggressive but cleaner for the reviewer.
**Confidence:** HIGH (GitHub docs, verified)

---

## Table Stakes

Features users expect. Missing = tool is useless or dangerous.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Path-based commit classification** | Core purpose — identify which commits touch `.planning/` vs code files | Low | `git diff-tree --no-commit-id --name-only -r <sha>` gives file list per commit. Simple path prefix match. |
| **Cherry-pick code-only commits** | Produce a branch with only code commits, preserving individual history | Low | `git cherry-pick <sha>` for each qualifying commit. Well-understood git primitive. |
| **Derived branch naming** | Users need predictable branch name without manual input | Low | `feature/foo` -> `feature/foo-pr`. Simple string operation. Convention must be documented. |
| **Never modify source branch** | Safety — users must trust tool won't corrupt their work | Low | Only create/force-update the PR branch. Never touch HEAD or working branch. Source branch is read-only input. |
| **Fail loudly on conflicts** | Silent failure would produce broken PR branches that waste reviewer time | Low | Cherry-pick already fails on conflict. Catch error, report clearly, abort PR branch creation. |
| **Idempotent re-runs** | After adding new commits, user must be able to regenerate PR branch | Med | Delete and recreate PR branch from scratch each time. Simpler and more reliable than incremental. |
| **Mixed commit detection** | Warn when a single commit touches both `.planning/` and code files | Low | Report which commits are mixed so user knows the tool is handling them. Transparency builds trust. |
| **Dry-run mode** | Let users preview what will happen before modifying any branches | Low | List commits that would be included/excluded/split. No actual branch manipulation. |
| **Clear terminal output** | User must understand what happened — which commits kept, dropped, split | Low | Summary: "Included 5 commits, excluded 3 planning-only, split 1 mixed. PR branch: feature/foo-pr" |

## Differentiators

Features that set the tool apart. Not expected, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Auto-split mixed commits** | Handles messy reality where code and planning files are in the same commit. Without this, user must choose: include planning files or lose code changes. | **High** | This is the hardest feature. Requires creating a new commit with only the code-file changes from the original, preserving author/date/message. Uses `git cherry-pick -n` + selective staging. |
| **GSD slash command integration** | One-command UX within existing GSD workflow (`/gsd:pr-branch`) | Low | Follows existing GSD command pattern. Wrap the git-level tool in a command definition. |
| **Standalone git-level command** | Usable outside GSD context, across any repo with `.planning/` convention | Low | Shell script or Node.js script callable as `gsd-pr-branch` or `git gsd-pr` |
| **Post-commit/post-push hook** | Auto-sync PR branch whenever source branch changes — zero-effort maintenance | Med | Uses existing GSD hook infrastructure. Must be optional (off by default) since it can be surprising. |
| **Configurable filter paths** | Allow filtering paths beyond `.planning/` (e.g., `.notes/`, `TODO.md`) | Low | Read from `config.json` or `.gsd-pr-filter` config. Array of path prefixes to exclude. |
| **Base branch detection** | Auto-detect the merge base (where feature branch diverged from main) instead of requiring user to specify | Med | `git merge-base main HEAD` — but need to handle various main branch names (main, master, develop). Read from git config or GSD config. |
| **Commit metadata preservation** | For split commits: preserve original author, date, committer info exactly | Low | Cherry-pick preserves this by default. For manual splits, use `--author` and `GIT_AUTHOR_DATE`/`GIT_COMMITTER_DATE` env vars. |
| **Force-push awareness** | When re-running, warn if PR branch was already pushed and will need force-push | Low | Check `git branch -r` for remote tracking. Warn but don't auto-push. |

## Anti-Features

Features to explicitly NOT build. Common mistakes in this domain.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Interactive commit selection** | PROJECT.md explicitly says "tool should be fully automated." Interactive mode adds complexity, testing burden, and defeats the "one command" UX. | Fully automated classification by path. If user disagrees with classification, they fix their commits first. |
| **Squash mode** | PROJECT.md explicitly excludes this: "user wants individual commits preserved." Squashing destroys the careful per-task commit history GSD produces. | Always cherry-pick individual commits. The whole point is clean, granular history. |
| **PR creation** | Scope creep. GitHub CLI (`gh pr create`) already does this well. Our tool produces the branch; the user or another tool creates the PR. | Output the branch name so user can `gh pr create --head feature/foo-pr`. |
| **Rewriting history on source branch** | Extremely dangerous. `git filter-repo` explicitly recommends working on fresh clones. We must NEVER modify the user's working branch. | Only create/update the derived PR branch. Source branch is sacred and read-only. |
| **Supporting non-`.planning/` layouts** | GSD is standardized on `.planning/`. Supporting arbitrary planning file locations adds complexity without clear user demand. The configurable filter paths differentiator covers edge cases. | Default to `.planning/` prefix. Allow config override for additional paths if needed. |
| **Incremental update (only new commits)** | Tracking which commits were already processed adds state management complexity and creates failure modes when commits are amended or rebased on source branch. | Recreate PR branch from scratch each time. It's fast enough for feature branch sizes (10-100 commits). Idempotent and simple. |
| **Merge commit handling** | GSD uses linear history (per-task atomic commits). Feature branches shouldn't have merge commits. Supporting merge cherry-picks is a rabbit hole of edge cases. | Detect merge commits and fail with a clear message: "PR branch filter doesn't support merge commits. Rebase your branch first." |
| **Auto-push to remote** | Pushing is a destructive (in the sense of non-reversible) action. Force-pushing can destroy remote state. User should control this. | Report what to push: "Run `git push -f origin feature/foo-pr` to update remote." |
| **Complex conflict resolution** | If cherry-pick conflicts, the commit likely has deep dependencies on planning files (code imports from `.planning/`, etc). Auto-resolving is dangerous. | Fail immediately on conflict. Print the conflicting commit and file. User must fix the commit on source branch, then re-run. |

## Feature Dependencies

```
Path-based commit classification ─────────┬──> Cherry-pick code-only commits ──> Derived branch naming
                                           │
                                           ├──> Mixed commit detection ──> Auto-split mixed commits
                                           │
                                           └──> Dry-run mode

Never modify source branch ──> (safety invariant, not a dependency — enforced everywhere)

Cherry-pick code-only commits ──> Idempotent re-runs ──> Post-commit hook
                              ──> Clear terminal output
                              ──> Fail loudly on conflicts

Base branch detection ──> Cherry-pick code-only commits (need to know which commits to consider)

GSD slash command ──> Standalone git command (command wraps the standalone tool)
```

**Critical path for MVP:**
1. Path-based classification (foundation — everything depends on this)
2. Base branch detection (need to know commit range)  
3. Cherry-pick code-only commits (core value)
4. Derived branch naming (usability)
5. Mixed commit detection + warning (transparency)
6. Clear output + dry-run (trust-building)

**Deferred path (post-MVP):**
1. Auto-split mixed commits (highest complexity, can warn-and-skip initially)
2. Post-commit hook (convenience, not core)
3. Configurable filter paths (edge case)

## MVP Recommendation

For MVP, prioritize:

1. **Path-based commit classification** — the atomic primitive everything builds on
2. **Base branch detection** — automatically find the merge base with main
3. **Cherry-pick code-only commits to derived branch** — the core value proposition
4. **Derived branch naming** (`-pr` suffix) — predictable, automatic
5. **Mixed commit detection with WARNING** (not splitting) — "Commit abc123 touches both .planning/ and src/. Skipping. Run with --include-mixed to include as-is."
6. **Dry-run mode** — user trust before first real use
7. **Clear terminal output** — summary of what happened
8. **Fail loudly on conflicts** — safety

Defer to post-MVP:
- **Auto-split mixed commits**: High complexity. MVP can warn and skip, or include as-is with `--include-mixed`. Real splitting requires careful commit reconstruction.
- **Post-commit/post-push hook**: Convenience feature. Users run the command manually first; hook automates later.
- **Configurable filter paths**: `.planning/` is the standard. Config can come later.
- **GSD slash command**: Build the standalone tool first, wrap in a command later.

## Complexity Budget

| Feature | Git Operations | Error Surface | Estimated Effort |
|---------|---------------|---------------|-----------------|
| Path classification | `git diff-tree`, `git log` | Low — read-only queries | 2-3 hours |
| Cherry-pick to new branch | `git checkout -b`, `git cherry-pick` | Medium — conflicts possible | 3-4 hours |
| Branch naming | String manipulation | Low | 30 min |
| Mixed commit detection | Same as classification | Low | 30 min |
| Mixed commit splitting | `cherry-pick -n`, selective `git add`, `git commit` | **HIGH** — must reconstruct commits exactly | 8-12 hours |
| Dry-run mode | Same as classification, no mutations | Low | 1-2 hours |
| Base branch detection | `git merge-base` | Low-Med — multiple main branch names | 1-2 hours |
| Hook integration | Hook registration, GSD installer integration | Medium | 4-6 hours |

**Total MVP: ~12-16 hours**
**Total with splitting: ~24-30 hours**

## Key Insight from Tool Analysis

The most important lesson from studying these tools:

**git-absorb's principle of "if unsure, don't act"** is the right default. Our tool should classify commits conservatively:
- Pure code commits → cherry-pick (confident)
- Pure planning commits → skip (confident)  
- Mixed commits → WARN and skip by default (uncertain — let user decide)

This matches GSD's existing philosophy of "fail loudly" and keeps the MVP simple while being genuinely useful. The auto-split feature is the "magic" differentiator but it's not needed for v1 if mixed commits are rare (and GSD's per-task atomic commit convention means they *should* be rare).

## Sources

- git-filter-repo: https://github.com/newren/git-filter-repo (HIGH confidence — official repo, 11.6k stars)
- git-town: https://github.com/git-town/git-town (HIGH confidence — official repo, 3k stars)
- git-branchless: https://github.com/arxanas/git-branchless (HIGH confidence — official repo, 4k stars)
- git-absorb: https://github.com/tummychow/git-absorb (HIGH confidence — official repo, 5.4k stars)
- Git cherry-pick documentation: `git cherry-pick --help` (HIGH confidence — git built-in)
- Git diff-tree documentation: `git diff-tree --help` (HIGH confidence — git built-in)
- GSD PROJECT.md, git-integration.md, ARCHITECTURE.md (HIGH confidence — project source files)
