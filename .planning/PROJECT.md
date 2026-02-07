# GSD PR Branch Filter

## What This Is

A tool within the GSD toolkit that produces clean, planning-file-free branches for pull requests. Developers use GSD's `.planning/` files throughout their work, accumulating planning commits alongside code commits. This tool filters those planning commits out, producing a PR-ready branch that preserves individual code commit history while stripping all `.planning/` artifacts.

## Core Value

Developers can use GSD planning freely without worrying about PR pollution — one command produces a clean branch for review.

## Requirements

### Validated

- Existing GSD toolkit with `.planning/` directory convention — existing
- Git integration with per-task atomic commits — existing
- Slash command infrastructure for user-facing commands — existing
- Hook system for post-commit/post-push automation — existing
- Multi-runtime installer (Claude Code, OpenCode, Gemini) — existing
- `config.json` for project-level configuration — existing

### Active

- [ ] On-demand filtered PR branch creation from working branch
- [ ] Auto-splitting of mixed commits (code + planning changes in same commit)
- [ ] Preservation of individual code commit history (cherry-pick style, not squash)
- [ ] Derived branch naming convention (e.g., `feature/foo` -> `feature/foo-pr`)
- [ ] Re-run to update PR branch after addressing feedback
- [ ] Auto-sync via post-commit or post-push git hook
- [ ] Loud failure on conflicts or dependency issues with dropped commits
- [ ] GSD slash command invocation (`/gsd-pr-branch` or similar)
- [ ] Standalone git-level command invocation
- [ ] GSD commit hygiene enforcement (planning commits isolated from code commits)

### Out of Scope

- Keeping planning files outside the main repo (separate version control) — user acknowledged as potentially better but explicitly deferred
- Squash mode for PR branches — user wants individual commits preserved
- Interactive commit selection — tool should be fully automated
- PR creation itself — this tool produces the branch, user handles the PR
- Supporting non-`.planning/` planning file locations — standardized on `.planning/`

## Context

- The user works across multiple repos with GSD, hitting this friction repeatedly
- Current workarounds: asking reviewers to ignore `.planning/` files, deleting before final PR
- GSD already enforces atomic per-task commits with conventional commit format
- GSD's `config.json` already has a `commit_docs` setting that controls whether planning docs are committed — this tool complements that by handling the case where they ARE committed (for local tracking) but shouldn't appear in PRs
- The existing hook infrastructure (`hooks/gsd-statusline.js`, `hooks/gsd-check-update.js`) provides a pattern for the auto-sync hook
- The installer (`bin/install.js`) already handles multi-runtime hook registration
- New `gsd-tools.js` centralizes CLI utilities — PR branch filter will be a subcommand there

## Future Vision: Stacked PRs via jj

This PR branch filter is step 1 of a larger workflow vision:

**Philosophy:** Development happens on a single linear branch with many commits — easiest way to understand what happened over time. But for review and merging, code commits (sans planning) should be bundled into reviewable chunks (~= GSD phases) as stacked PRs.

**Future direction:**
- Use jj (Jujutsu) to manage bookmarks over sets of commits on the linear dev branch
- Agent workflow builds stacked bookmarks (phase 1 commits, phase 2 commits, etc.) without modifying the dev branch
- Push bookmarks to GitHub as stacked PRs — each PR reviews one phase's worth of work
- Development continues linearly; the stacking layer is a read-only view for reviewers
- User has jj research to bring in when this phase is reached

**How this milestone relates:** The current PR branch filter establishes the core primitive (filtering planning commits, cherry-picking code commits). The stacked PR workflow extends this by additionally grouping code commits by phase and managing multiple PR branches as a stack. The classification and cherry-pick engine built now will be reused.

## Constraints

- **Tech stack**: Must be JavaScript (Node.js) or shell script — no new runtime dependencies, consistent with zero-dependency philosophy
- **Compatibility**: Must work with existing GSD git conventions (per-task commits, conventional format)
- **Git safety**: Must never modify the user's working branch — only create/update the filtered PR branch
- **Atomicity**: Mixed commit auto-splitting must preserve commit metadata (author, date, message) for the code portion
- **Idempotency**: Re-running the command on an already-filtered branch must produce the same result

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Cherry-pick over squash | User wants reviewers to see individual commit history | -- Pending |
| Warn-and-skip mixed commits (v1) | Auto-split deferred to v2; GSD atomic commits mean mixed should be rare | -- Pending |
| Fail loudly on conflicts | Silent continuation could produce broken branches | -- Pending |
| Derived branch naming (`-pr` suffix) | Simple convention, no user input needed each time | -- Pending |
| Incremental updates (stable PR history) | Avoid force-push; find PR HEAD in source, cherry-pick only new commits | -- Pending |
| Implement in gsd-tools.js | Centralizes CLI tools, no PATH issues, slash command can invoke directly | -- Pending |
| Post-commit/post-push hook for auto-sync | Optional convenience, start with on-demand command first | -- Pending |

---
*Last updated: 2026-02-06 after initialization*
