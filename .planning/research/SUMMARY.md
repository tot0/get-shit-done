# Project Research Summary

**Project:** GSD PR Branch Filter
**Domain:** Git commit filtering / PR branch preparation
**Researched:** 2026-02-06
**Confidence:** HIGH

## Executive Summary

The GSD PR Branch Filter is a **commit processing pipeline** that creates a clean PR branch from a working branch by stripping out `.planning/` file changes. This is a well-scoped tool with a clear algorithmic core: enumerate commits since divergence, classify each by file paths, and selectively cherry-pick code-only changes onto a new branch. The domain is well-understood — git's plumbing commands (`diff-tree`, `cherry-pick`, `rev-list`, `merge-base`) provide all necessary primitives, and all have been verified locally against git 2.52.0. There are no novel algorithms or external dependencies required.

The recommended approach is **Node.js orchestration over git CLI commands** using `child_process.execSync`, following GSD's established patterns. The core algorithm is cherry-pick-with-split: iterate commits chronologically, skip planning-only commits, cherry-pick code-only commits directly, and split mixed commits using `cherry-pick -n` + selective staging. This approach was selected over `git filter-branch` (deprecated), `git filter-repo` (external dependency), and Node.js git libraries (violates zero-dependency constraint). The architecture is a 4-stage pipeline (Discovery → Classification → Transformation → Application) with a thin Git Adapter layer isolating all `child_process` calls.

The primary risks are **working branch corruption** (mitigated by never running `git checkout` on the user's working tree, using worktrees or isolated operations), **cherry-pick conflicts halting automation** (mitigated by immediate abort-and-report), and **post-commit hook recursion** (mitigated by re-entrancy guards). Mixed commit splitting is the hardest feature and should be deferred past MVP — GSD's per-task commit convention means mixed commits should be rare, and warning-then-skipping is a safe default.

## Key Findings

### Recommended Stack

Zero external dependencies. The entire tool is built with Node.js builtins and system git. See [STACK.md](./STACK.md) for full command reference and approach comparison.

**Core technologies:**
- **Git plumbing commands** (`diff-tree`, `rev-list`, `merge-base`, `cherry-pick`): Commit enumeration, classification, and application — stable, well-documented primitives verified against git 2.52.0
- **Node.js `child_process.execSync`**: Git command orchestration — already used in GSD hooks (`gsd-check-update.js`, `install.js`), zero dependencies
- **Markdown command file** (`commands/gsd/pr-branch.md`): Slash command integration — follows existing GSD command pattern

**Rejected alternatives:** `git filter-branch` (deprecated), `git filter-repo` (Python dependency), `isomorphic-git`/`nodegit`/`simple-git` (violate zero-dep constraint), pure bash (macOS bash 3.2 portability), `git rebase -i` (interactive/destructive).

### Expected Features

See [FEATURES.md](./FEATURES.md) for full analysis including tool landscape study.

**Must have (table stakes):**
- Path-based commit classification (`.planning/` vs code)
- Cherry-pick code-only commits preserving individual history
- Derived branch naming (`feature/foo` → `feature/foo-pr`)
- Never modify source branch (safety invariant)
- Fail loudly on conflicts
- Idempotent re-runs (delete and recreate from scratch)
- Dry-run mode
- Clear terminal output (commits kept/dropped/split)

**Should have (differentiators):**
- Auto-split mixed commits (highest value, highest complexity)
- GSD slash command integration (`/gsd:pr-branch`)
- Standalone CLI (`npx gsd-pr-branch`)
- Base branch auto-detection (`main`/`master`/`develop`)
- Force-push awareness (warn when PR branch was already pushed)

**Defer (v2+):**
- Auto-split mixed commits (warn-and-skip for MVP, full splitting post-MVP)
- Post-commit/post-push hook auto-sync
- Configurable filter paths beyond `.planning/`

**Anti-features (explicitly NOT building):**
- Interactive commit selection, squash mode, PR creation, history rewriting on source branch, auto-push, complex conflict resolution, incremental updates

### Architecture Approach

A 4-stage pipeline with pure-function stages and a shared Git Adapter. See [ARCHITECTURE.md](./ARCHITECTURE.md) for full data flow and component contracts.

**Major components:**
1. **Git Adapter** — Thin `child_process.execSync` wrapper; all git commands flow through here; enables dry-run mode
2. **Branch Resolver** — Finds merge-base, enumerates commits (`rev-list`) in chronological order
3. **Commit Classifier** — Inspects each commit's file list, categorizes as planning-only/code-only/mixed
4. **Branch Builder** — Creates PR branch from merge-base, cherry-picks qualifying commits sequentially
5. **CLI Entry Point** — Arg parsing + pipeline invocation + result formatting
6. **Slash Command** — Wraps standalone CLI for AI agent invocation

**Key patterns:** Pipeline with pure stage functions, Git Adapter (single point for error handling/dry-run), fail loudly on conflicts, idempotent re-runs via full rebuild.

### Critical Pitfalls

See [PITFALLS.md](./PITFALLS.md) for full analysis including 17 pitfalls with prevention strategies.

1. **Working branch corruption** — Tool switches branches via `git checkout`, crashes mid-operation, leaves user on wrong branch with dirty state. **Prevent:** Use `git worktree` for isolation, or at minimum validate/restore HEAD before and after. Never modify user's working tree.
2. **Cherry-pick conflicts halt automation** — Conflict leaves `CHERRY_PICK_HEAD` set, repo in half-applied state. **Prevent:** Abort immediately on any conflict (`cherry-pick --abort`), report which commit and files, return to original branch.
3. **Post-commit hook infinite recursion** — Hook creates commits on PR branch, which triggers hook again. **Prevent:** Re-entrancy guard via environment variable (`GSD_PR_FILTER_RUNNING=1`).
4. **Mixed commit splitting produces broken tree** — Code changes may semantically depend on planning files. **Prevent:** Accept imperfection, warn on split, optional build validation. Encourage commit hygiene.
5. **Force-resetting PR branch destroys external commits** — Reviewers' fixup commits vanish on re-run. **Prevent:** Detect external commits before reset, require `--force` flag, warn user.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Git Adapter + Branch Resolution (Foundation)

**Rationale:** Every pipeline stage depends on the Git Adapter. Branch resolution is the simplest stage and validates the entire git plumbing approach works correctly from Node.js.
**Delivers:** `GitAdapter` class wrapping `execSync`, `resolveCommits()` function returning merge-base + ordered commit list. Standalone executable that can enumerate commits on a branch.
**Addresses:** Base branch auto-detection (table stakes), zero-dependency constraint
**Avoids:** Pitfall 1 (working branch corruption) — establishes safe git execution patterns from the start; Pitfall 10 (env var pollution) — sets up clean environment handling

### Phase 2: Commit Classification + Dry Run

**Rationale:** Classification is the core primitive everything else builds on. It's pure read-only logic over git queries — no repo mutation, easy to test. Combined with dry-run output, this phase delivers a useful diagnostic tool even before cherry-picking works.
**Delivers:** `classifyCommit()` function, dry-run CLI output showing "N planning-only, M code-only, K mixed" with commit details.
**Addresses:** Path-based commit classification, mixed commit detection, dry-run mode (all table stakes)
**Avoids:** Pitfall 9 (merge commits) — detection logic handles merge commits here; Pitfall 7 (empty commits) — classification catches these

### Phase 3: Cherry-Pick Engine + Branch Building

**Rationale:** This is the core value delivery — actually creating the filtered PR branch. Depends on Phase 1 (git adapter + branch resolution) and Phase 2 (classification). Build splitter and builder together since the splitter's output format is dictated by what the builder consumes.
**Delivers:** End-to-end pipeline creating a code-only PR branch. Code-only commits cherry-picked, planning-only commits dropped. Mixed commits warned and skipped (MVP) or included as-is with `--include-mixed`.
**Addresses:** Cherry-pick code-only commits, derived branch naming, idempotent re-runs, fail loudly on conflicts, clear terminal output, never modify source branch
**Avoids:** Pitfall 2 (conflicts halt automation) — abort-and-report strategy; Pitfall 6 (losing external commits) — warn before force-reset; Pitfall 11 (worktree cleanup) — try/finally cleanup

### Phase 4: CLI Polish + Slash Command

**Rationale:** Pipeline must work before wrapping in user interfaces. CLI is thin (arg parsing, help text, result formatting). Slash command is a markdown file wrapping the CLI.
**Delivers:** Polished `bin/gsd-pr-branch.js` CLI with `--base`, `--dry-run`, `--force`, `--include-mixed` flags. `commands/gsd/pr-branch.md` slash command.
**Addresses:** GSD slash command integration, standalone CLI, force-push awareness
**Avoids:** Anti-pattern of building UI before logic is solid

### Phase 5: Mixed Commit Splitting (Enhancement)

**Rationale:** Highest complexity feature (8-12 hours estimated). Deferred past MVP because GSD's atomic commit convention means mixed commits should be rare. MVP warns and skips; this phase adds the "magic" auto-split.
**Delivers:** `cherry-pick -n` + selective unstaging + `git clean` for mixed commits. Preserves original author/date/message on the code-only derivative commit.
**Addresses:** Auto-split mixed commits (key differentiator)
**Avoids:** Pitfall 5 (broken tree state from splitting) — warn on split, optional validation; Pitfall 8 (metadata loss) — explicitly preserve author/date via `-C` flag

### Phase 6: Hook Integration (Automation)

**Rationale:** Convenience layer, not core functionality. Tool must work on-demand before adding automation. Hook integration requires solving recursion, lock contention, and performance — all well-documented pitfalls.
**Delivers:** Optional post-commit hook (`hooks/gsd-pr-sync.js`), installer integration, config toggle (`pr_branch.auto_sync`)
**Addresses:** Post-commit hook auto-sync (differentiator)
**Avoids:** Pitfall 3 (infinite recursion) — env var guard; Pitfall 4 (lock deadlock) — async background process; Pitfall 16 (performance) — debounce + async

### Phase Ordering Rationale

- **Phases 1-3 follow strict dependencies:** Git Adapter → Classification → Cherry-pick engine. Each is testable in isolation before the next is built.
- **Phase 2 delivers standalone value** as a diagnostic tool ("what would be filtered?") before the mutation logic exists.
- **Phase 3 is the core value phase** — everything before it is foundation, everything after is enhancement.
- **Phase 4 is a thin wrapper** that should be fast given the pipeline is already functional.
- **Phases 5-6 are independent enhancements** that could be built in either order, but splitting (Phase 5) is more likely to be needed than the hook (Phase 6).
- **This ordering front-loads safety:** Each critical pitfall is addressed in the phase where its prevention pattern is established, not retrofitted later.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3 (Cherry-Pick Engine):** Needs investigation into `git worktree` vs `git checkout -B` for branch isolation strategy. The PITFALLS research recommends worktree but ARCHITECTURE and STACK show simpler `checkout -B` approach. This tension needs resolution — worktree adds safety but complexity.
- **Phase 5 (Mixed Commit Splitting):** The `cherry-pick -n` + `git reset HEAD -- .planning/` + `git checkout HEAD -- .planning/` + `git clean -fd .planning/` sequence is verified but needs testing against edge cases (binary files in `.planning/`, symlinks, nested directories).
- **Phase 6 (Hook Integration):** Needs investigation into exact hook event model — which git operations trigger `post-commit` in the worktree context, and whether the async background process pattern works reliably across platforms.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Git Adapter):** Well-documented `child_process.execSync` pattern, already used in GSD codebase.
- **Phase 2 (Classification):** Pure logic over `git diff-tree` output — thoroughly verified in STACK research.
- **Phase 4 (CLI + Slash Command):** Follows established GSD conventions exactly. No novel patterns.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All git commands verified locally against git 2.52.0 man pages. Node.js `child_process` pattern already established in codebase. Zero external dependencies. |
| Features | MEDIUM-HIGH | Feature landscape derived from analysis of 5 related tools (git-filter-repo, git-town, git-branchless, git-absorb, gitattributes). MVP scope is clear. Mixed commit frequency in practice is unverified. |
| Architecture | HIGH | 4-stage pipeline derived from direct codebase analysis. All integration points verified against existing GSD file structure and conventions. |
| Pitfalls | HIGH | 17 pitfalls identified, all verified against official git documentation. Critical pitfalls have concrete prevention strategies with specific git commands. |

**Overall confidence:** HIGH

### Gaps to Address

- **Worktree vs checkout strategy:** PITFALLS recommends `git worktree` for safety; STACK/ARCHITECTURE use simpler `checkout -B`. Need to decide during Phase 3 planning whether the worktree complexity is justified for the expected use case (short-lived feature branches, <100 commits).
- **Mixed commit frequency:** The decision to defer auto-splitting assumes mixed commits are rare under GSD conventions. If they're common in practice, Phase 5 should move earlier. Consider adding telemetry (count mixed commits in dry-run output) to validate this assumption.
- **`.planning/config.json` as infrastructure file:** PITFALLS flags that code may depend on `.planning/config.json` at runtime. Need to decide if certain `.planning/` files should be included in the PR branch. This affects classification logic in Phase 2.
- **Cross-platform testing:** macOS is the primary platform, but the Node.js + git CLI approach should work on Linux/Windows. Untested on Windows (git path separators, shell escaping).

## Sources

### Primary (HIGH confidence)
- Git 2.52.0 man pages — `cherry-pick`, `diff-tree`, `rev-list`, `merge-base`, `reset`, `clean`, `commit`, `filter-branch`, `worktree`, `checkout` (verified locally via `git help`)
- GSD codebase — `bin/install.js`, `hooks/*.js`, `scripts/build-hooks.js`, `commands/gsd/*.md`, `.planning/codebase/*.md`, `.planning/PROJECT.md` (direct source analysis)
- Node.js `child_process` documentation — `execSync`, `spawnSync` (built-in, established pattern in codebase)

### Secondary (HIGH confidence)
- git-filter-repo (11.6k stars) — path filtering patterns, empty commit pruning
- git-town (3k stars) — branch sync, error recovery patterns
- git-branchless (4k stars) — commit graph manipulation, in-memory operations
- git-absorb (5.4k stars) — patch commutation, "if unsure, don't act" principle
- GitHub CODEOWNERS / `.gitattributes` — existing file filtering mechanisms

### Tertiary (MEDIUM confidence)
- macOS bash version 3.2 — GPLv3 licensing constraint (common knowledge, not directly verified)
- Performance estimates for >100 commit branches — based on general git performance characteristics, not benchmarked

---
*Research completed: 2026-02-06*
*Ready for roadmap: yes*
