---
created: 2026-02-08T21:16:14.540Z
title: Multi-milestone lifecycle with ad-hoc automation
area: planning
files:
  - get-shit-done/workflows/execute-phase.md
  - get-shit-done/workflows/new-project.md
  - get-shit-done/bin/gsd-tools.js
---

## Problem

GSD currently assumes a linear milestone lifecycle: new-project → plan phases → execute phases → complete milestone → new milestone. This breaks down in real-world collaborative repos where:

- Multiple unrelated milestones may be active simultaneously (one developer on auth, another on payments)
- Milestones are picked up ad-hoc — a developer grabs a todo, plans a small milestone, executes, moves on
- Agents and humans interleave — an AI agent picks up a todo from the backlog, plans and executes it, a human reviews
- The "current milestone" assumption in STATE.md doesn't support parallel workstreams

The vision: a system where automations and hooks condense complex workflows into simple state transitions triggered on command. Structure guides, automation executes, and the developer (or agent) just says "do the next thing."

## Solution

**State machine approach:**
- Todos, milestones, and phases are states with defined transitions
- Commands trigger transitions: `/gsd:quick` (todo → planned → executed → done), `/gsd:plan-phase` (phase → planned), `/gsd:execute-phase` (planned → executed)
- Hooks fire on transitions: post-commit auto-sync (already built), post-phase verification, post-milestone audit
- Each transition is atomic — if it fails, state rolls back cleanly

**Multi-milestone support:**
- STATE.md tracks multiple active milestones, each with independent progress
- `config.json` gets a `milestones` section listing active workstreams
- `/gsd:progress` shows all active milestones, not just "the" current one
- Workspace branch can carry multiple milestone directories under `.planning/milestones/`

**Ad-hoc agent pickup:**
- `/gsd:check-todos` surfaces backlog items that can be grabbed by any agent/human
- A todo can escalate to a milestone if it's complex enough (detected during planning)
- Agents can autonomously: check todos → plan → execute → PR — with human review gates

**Automation hooks:**
- Post-commit: auto-sync PR branch (already built)
- Post-phase: auto-verify, auto-plan-next if verification passes
- Post-milestone: auto-audit, suggest next milestone from backlog
- Cron/scheduled: update codebase map, refresh stale todos, notify on blocked items

**Key questions for the planner:**
- How does multi-milestone STATE.md work without becoming a mess?
- What's the minimum viable state machine that enables ad-hoc agent pickup?
- How do parallel milestones interact with `pr-branch` (separate PR branches per milestone?)
- Should this be a GSD core feature or a "GSD Teams" extension?
