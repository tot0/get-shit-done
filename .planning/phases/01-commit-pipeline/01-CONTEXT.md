# Phase 1: Commit Pipeline - Context

**Gathered:** 2026-02-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Read-only analysis of a feature branch via `pr-branch --dry-run`. Classifies every commit since the merge base as planning-only, code-only, or mixed — and presents a clear report. No branches are created or modified. Branch creation and cherry-picking are Phase 2.

</domain>

<decisions>
## Implementation Decisions

### Report structure
- Single chronological timeline with a type tag per commit, not grouped by category
- Newest-to-oldest ordering (most recent work first)
- Each commit shows: abbreviated hash, subject line, and files touched
- Summary footer with category counts (planning/code/mixed) plus a short next-action recommendation (e.g., "Run without --dry-run to create PR branch" or "N mixed commits need splitting")

### Base branch resolution
- Resolution order: gsd config → auto-detect (try main, fall back to master)
- Dry-run output always prints the detected base branch and merge-base commit at the top of the report
- `--base <branch>` flag available for per-run override (takes priority over config and auto-detect)
- If auto-detection fails and no config/flag provided, prompt the user interactively for which branch to use

### Filter path rules
- Default filter: `.planning/` directory only — nothing else filtered out of the box
- Additional paths configured via glob patterns in gsd config (e.g., `["docs/internal/**", "**/*.plan.md"]`)
- File breakdown shown only for mixed commits — planning-only and code-only commits don't need file details since their classification is unambiguous
- Active filter paths shown in dry-run header only when user has customized beyond defaults

### Mixed commit messaging
- Mixed commits appear inline in the timeline with a visible warning tag (not a separate section)
- Each mixed commit includes a split file list: planning files and code files shown separately
- Guidance message suggests the user can split the commit to rescue code changes
- Edge case handling (e.g., all commits are mixed, nothing eligible) — Claude's discretion on messaging

### Claude's Discretion
- Exact output formatting and coloring
- Messaging when all commits are mixed / no eligible commits
- Tag/label visual design in the timeline
- Any additional helpful context in the summary footer

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. The tool should feel like a natural `git log`-style report with classification annotations.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-commit-pipeline*
*Context gathered: 2026-02-07*
