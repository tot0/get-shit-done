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
| Auto-split mixed commits | Rejecting mixed commits would be too strict; including as-is leaks planning files | -- Pending |
| Fail loudly on conflicts | Silent continuation could produce broken branches | -- Pending |
| Derived branch naming (`-pr` suffix) | Simple convention, no user input needed each time | -- Pending |
| Both slash command and git command | Accessible from GSD workflow and standalone git usage | -- Pending |
| Post-commit/post-push hook for auto-sync | Optional convenience, start with on-demand command first | -- Pending |

---
*Last updated: 2026-02-06 after initialization*
