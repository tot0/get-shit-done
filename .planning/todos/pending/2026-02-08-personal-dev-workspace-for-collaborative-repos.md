---
created: 2026-02-08T21:16:14.540Z
title: Personal dev workspace for collaborative repos
area: planning
files:
  - get-shit-done/workflows/new-project.md
  - get-shit-done/bin/gsd-tools.js
  - bin/install.js
---

## Problem

GSD's `.planning/` directory conflates three tiers of content with different lifecycle and visibility needs:

1. **Project code** — goes to main, everyone sees it
2. **Milestone planning** — noisy for reviewers, filter from PRs (what `pr-branch` does now)
3. **Personal dev context** — should never leave the developer's branch/machine

In a collaborative repo, this creates friction:
- `PROJECT.md` has valuable cross-milestone context (key decisions, vision) but doesn't belong on `origin/main` since other contributors have different contexts
- A developer's engagement goals, personal notes, and scratch work have no clean home
- In restrictive repos, you can't modify `.gitignore` or add directories — forced to use branches or forks
- Codebase mapping and project-level context that helps GSD agents improve over time needs to persist across milestones but not pollute shared history

**Observed workflow patterns:**
- Long-lived personal branch (`lupickup/workspace`) carrying `.planning/` across milestones
- Fork-based: fork's main carries personal dev files, PRs to upstream are clean
- Local-only (`commit_docs: false`): no backup, no history, lost on reclone
- `.git/info/exclude` for per-repo gitignore without touching shared `.gitignore`

## Solution

**Proposed: Three-tier `.planning/` hierarchy:**

```
.planning/
├── project/                  # Tier 3: Personal dev context (long-lived)
│   ├── PROJECT.md            # Cross-milestone vision and decisions
│   ├── CODEBASE.md           # Living codebase map, updated as repo changes
│   ├── notes/                # Personal scratch
│   └── goals.md              # My engagement goals for this repo
├── milestones/               # Tier 2: Milestone planning (filtered by pr-branch)
│   └── pr-branch-filter/
│       ├── ROADMAP.md
│       ├── STATE.md
│       └── phases/
└── todos/                    # Spans both tiers
    ├── pending/
    └── done/
```

**Key design considerations for the planner:**
- `pr-branch` already filters `.planning/` — the hierarchy just organizes what's inside
- Personal context lives on a long-lived branch, rebased on main/upstream periodically
- Codebase mapping (`CODEBASE.md`) can auto-update via hooks when files change — helps GSD agents get better over time without manual intervention
- In restrictive repos, the branch-based approach works without any repo config changes
- Multiple developers can each have their own workspace branch without conflict
- The installer could detect collaborative vs solo repo and suggest appropriate setup
