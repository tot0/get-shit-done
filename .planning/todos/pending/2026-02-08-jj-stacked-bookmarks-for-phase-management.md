---
created: 2026-02-08T21:16:14.540Z
title: Prototype jj stacked bookmarks for phase management
area: tooling
files:
  - get-shit-done/bin/gsd-tools.js
  - get-shit-done/workflows/execute-phase.md
---

## Problem

GSD phases are currently managed as sequential plans within a single branch. The `pr-branch` tool filters planning files at the commit level, but there's no first-class support for managing phases as layered changes that can be independently reordered, amended, or selectively pushed.

jj (Jujutsu) has a change-centric model with stacked bookmarks that maps naturally to this:
- Each phase = a stacked change/bookmark
- Planning layers sit above code layers and never get pushed
- Phases can be reordered, amended, or split without the rebase pain of git
- `jj` handles the equivalent of `pr-branch` filtering natively through its change graph

Even without jj, git branch naming could approximate this:
- Named branches per phase (`gsd/phase-01-commit-pipeline`, `gsd/phase-02-branch-builder`)
- Stacked via rebase chain
- `pr-branch` already knows how to cherry-pick across branches

## Solution

**Phase 1 — Prototype with jj:**
- Set up a jj-managed GSD project
- Model phases as stacked bookmarks
- Test: can planning changes live in a "never-push" layer while code changes flow to PR branches?
- Evaluate: does jj's `jj git push` with bookmark selection replace `pr-branch` entirely?

**Phase 2 — Git fallback:**
- If jj proves valuable, design a git-compatible approximation using named branches
- Consider: `gsd-tools.js` could manage the branch stack (create, rebase, push selective branches)

**Key questions for the planner:**
- Does jj's model eliminate the need for `pr-branch` or complement it?
- How does jj handle the "planning files never leave my machine" requirement?
- What's the migration path for existing git-based GSD projects?
