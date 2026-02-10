# GSD PR Branch Filter

## What This Is

A tool within the GSD toolkit that produces clean, planning-file-free branches for pull requests. Developers use GSD's `.planning/` files throughout their work, accumulating planning commits alongside code commits. This tool filters those planning commits out, producing a PR-ready branch that preserves individual code commit history while stripping all `.planning/` artifacts.

## Core Value

Developers can use GSD planning freely without worrying about PR pollution — one command produces a clean branch for review.

## Completed Milestones

### v1: PR Branch Filter (2026-02-07 → 2026-02-10)

**What was built:**
- Commit classification engine: categorizes commits as code-only, planning-only, or mixed based on configurable glob patterns
- Cherry-pick engine: creates `{branch}-pr` branches via git worktree (never modifies working branch)
- Incremental updates: patch-id matching detects new commits, cherry-picks only what's new — no force-push
- Conflict detection: aborts cleanly on cherry-pick failure, reports conflicting files
- Rebase detection: identifies when source branch was rebased, rebuilds PR branch (warns if pushed)
- `/gsd:pr-branch` slash command: thin wrapper invoking `gsd-tools.js pr-branch`
- Auto-sync post-commit hook: `hooks/gsd-pr-sync.js` with re-entrancy guard, opt-in via `--install-hooks` flag
- Config support: `pr_branch.auto_sync`, `pr_branch.base_branch`, `pr_branch.filter_paths` in `config.json`

**Architecture:**
- All logic in `get-shit-done/bin/gsd-tools.js` as `pr-branch` subcommand
- Uses existing patterns: `execGit()`, `loadConfig()`, `output()`/`error()`
- Hook follows `gsd-statusline.js`/`gsd-check-update.js` patterns (silent failure, background spawn)
- Installer uses marker-based append to preserve existing user git hooks

**Key decisions (finalized):**

| Decision | Rationale | Status |
|----------|-----------|--------|
| Cherry-pick over squash | User wants reviewers to see individual commit history | Done |
| Warn-and-skip mixed commits (v1) | Auto-split deferred to v2; GSD atomic commits mean mixed is rare | Done |
| Fail loudly on conflicts | Silent continuation could produce broken branches | Done |
| Derived branch naming (`-pr` suffix) | Simple convention, no user input needed each time | Done |
| Incremental updates via patch-id | Stateless detection — no persistent state file needed | Done |
| Implement in gsd-tools.js | Centralizes CLI tools, no PATH issues, slash command invokes directly | Done |
| Worktree over checkout | Checkout fails with dirty tracked files; worktree is isolated | Done |
| Rebuild unpushed / abort pushed on rebase | Protects remote history while allowing local rebuilds | Done |
| Env var over lock file for re-entrancy | Auto-scoped to process tree, no crash orphans | Done |
| Marker-based append for git hooks | Preserves existing user post-commit hooks — never overwrites | Done |
| Auto-sync opt-in via --install-hooks flag | Too invasive to install by default | Done |

**Stats:** 3 phases, 6 plans, ~10 min total execution time

**Files delivered:**
- `get-shit-done/bin/gsd-tools.js` — glob matching, color helpers, config extension, git adapter, commit classifier, cherry-pick engine, patch-id incremental detection, `pr-branch` subcommand
- `commands/gsd/pr-branch.md` — slash command
- `hooks/gsd-pr-sync.js` — post-commit auto-sync hook
- `hooks/dist/gsd-pr-sync.js` — built hook for npm distribution
- `scripts/build-hooks.js` — updated to include gsd-pr-sync
- `bin/install.js` — git hook installer with marker-based append + uninstall cleanup
- `get-shit-done/templates/config.json` — `pr_branch.auto_sync` default

## Future Vision: Stacked PRs via jj

This PR branch filter is step 1 of a larger workflow vision:

**Philosophy:** Development happens on a single linear branch with many commits — easiest way to understand what happened over time. But for review and merging, code commits (sans planning) should be bundled into reviewable chunks (~= GSD phases) as stacked PRs.

**Future direction:**
- Use jj (Jujutsu) to manage bookmarks over sets of commits on the linear dev branch
- Agent workflow builds stacked bookmarks (phase 1 commits, phase 2 commits, etc.) without modifying the dev branch
- Push bookmarks to GitHub as stacked PRs — each PR reviews one phase's worth of work
- Development continues linearly; the stacking layer is a read-only view for reviewers
- User has jj research to bring in when this phase is reached

**How v1 relates:** The PR branch filter establishes the core primitive (filtering planning commits, cherry-picking code commits). The stacked PR workflow extends this by additionally grouping code commits by phase and managing multiple PR branches as a stack. The classification and cherry-pick engine built in v1 will be reused.

## Active Requirements (for future milestones)

- [ ] Auto-splitting of mixed commits (code + planning changes in same commit) — deferred from v1
- [ ] GSD commit hygiene enforcement (planning commits isolated from code commits)
- [ ] Personal dev workspace with three-tier `.planning/` hierarchy (see todos)
- [ ] Multi-milestone lifecycle with parallel workstreams (see todos)
- [ ] Automated forward-integration from upstream to fork (see todos)
- [ ] jj stacked bookmarks prototype (see todos)

## Out of Scope

- Keeping planning files outside the main repo (separate version control) — user acknowledged as potentially better but explicitly deferred
- Squash mode for PR branches — user wants individual commits preserved
- Interactive commit selection — tool should be fully automated
- PR creation itself — this tool produces the branch, user handles the PR

## Constraints

- **Tech stack**: JavaScript (Node.js) — no new runtime dependencies, zero-dependency philosophy
- **Compatibility**: Works with existing GSD git conventions (per-task commits, conventional format)
- **Git safety**: Never modifies the user's working branch — only creates/updates the filtered PR branch
- **Idempotency**: Re-running the command on an already-filtered branch produces the same result

## Repository Context

- **Upstream**: `glittercowboy/get-shit-done` — the main GSD repo
- **Fork**: `lupickup/get-shit-done` — carries pr-branch and future custom features
- **Fork strategy**: `lupickup/main` branches from upstream main + merged PR branch; feature work branches from `lupickup/main`
- **Forward integration**: Periodically rebase/merge upstream changes into `lupickup/main`

---
*Last updated: 2026-02-10 — milestone v1 complete*
