# Roadmap: GSD PR Branch Filter

## Overview

This roadmap delivers a tool that produces clean, planning-file-free branches for pull requests. Starting from a read-only diagnostic pipeline (classify commits, preview results), we build the core cherry-pick engine with incremental updates, then wrap it in GSD's slash command and hook infrastructure. Three phases, each delivering a standalone capability that builds on the last.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Commit Pipeline** - Classify commits and preview filtering results without modifying anything
- [ ] **Phase 2: Branch Builder** - Create and incrementally update the filtered PR branch
- [ ] **Phase 3: GSD Integration** - Slash command and auto-sync hook

## Phase Details

### Phase 1: Commit Pipeline
**Goal**: User can analyze any feature branch and see exactly which commits would be filtered, kept, or skipped — without touching any branches
**Depends on**: Nothing (first phase)
**Requirements**: FILT-01, BRCH-04, UX-01, UX-04, INTG-01
**Success Criteria** (what must be TRUE):
  1. Running `node gsd-tools.js pr-branch --dry-run` on a feature branch outputs a categorized list of commits (planning-only, code-only, mixed) with commit hashes and messages
  2. The tool auto-detects the merge base where the feature branch diverged from main/master (or a configured base branch)
  3. Commits touching only `.planning/` files (or other configured filter paths) are classified as planning-only; commits touching only non-planning files are classified as code-only; commits touching both are classified as mixed
  4. The tool runs as a `pr-branch` subcommand within `gsd-tools.js`, following existing patterns for `execGit()`, `loadConfig()`, and `output()`/`error()`
**Plans:** 2 plans

Plans:
- [x] 01-01-PLAN.md — Glob matching, color helpers, config extension, git adapter functions, and commit classification engine
- [x] 01-02-PLAN.md — cmdPrBranch subcommand with formatted dry-run report and CLI router wiring

### Phase 2: Branch Builder
**Goal**: User can produce a clean PR branch with one command, and incrementally update it as they add more commits — without force-pushing
**Depends on**: Phase 1
**Requirements**: FILT-02, FILT-03, BRCH-01, BRCH-02, BRCH-03, BRCH-05, UX-02, UX-03, INTG-04
**Success Criteria** (what must be TRUE):
  1. Running `node gsd-tools.js pr-branch` creates a branch named `{source}-pr` containing only code-only commits cherry-picked from the source branch, with original author, date, and message preserved
  2. Running the tool again after adding new commits to the source branch cherry-picks only the NEW non-planning commits onto the existing PR branch (incremental update — no force-push needed)
  3. Mixed commits (touching both planning and code files) are detected, warned about, and skipped — the user sees which commits were skipped and why
  4. If a cherry-pick conflicts, the tool aborts the PR branch update immediately, reports the conflicting commit and files, and leaves the source branch completely untouched
  5. When the PR branch has been pushed to remote and the source branch was rebased (requiring a full rebuild), the tool warns that the update will require a force-push before proceeding
**Plans:** 2 plans

Plans:
- [x] 02-01-PLAN.md — Worktree lifecycle, PR branch name derivation, and cherry-pick engine with conflict detection
- [ ] 02-02-PLAN.md — Patch-id incremental detection, cmdPrBranch execution mode, CLI router update

### Phase 3: GSD Integration
**Goal**: Users can trigger PR branch filtering from AI agents via slash command, and optionally auto-sync after every commit
**Depends on**: Phase 2
**Requirements**: INTG-02, INTG-03
**Success Criteria** (what must be TRUE):
  1. `/gsd-pr-branch` slash command invokes the tool with appropriate defaults and displays results to the AI agent
  2. When auto-sync is enabled in config, a post-commit hook automatically updates the PR branch after each commit on the source branch (with re-entrancy guard to prevent infinite loops)
**Plans**: TBD

Plans:
- [ ] 03-01: Slash command, auto-sync hook, and installer integration

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Commit Pipeline | 2/2 | Complete | 2026-02-07 |
| 2. Branch Builder | 1/2 | In progress | - |
| 3. GSD Integration | 0/1 | Not started | - |
