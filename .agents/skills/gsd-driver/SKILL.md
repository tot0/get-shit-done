---
name: gsd-driver
description: >
  Intentional orchestration skill for deciding when to drive work through GSD phase workflows
  vs ad-hoc investigation. Use for scoped multi-step development with verification gates,
  roadmap progression, and sub-agent based codebase research.
---

# GSD Driver Skill

Use this skill to decide **how** work should proceed:
- through GSD roadmap/phase lifecycle, or
- through ad-hoc investigation + targeted execution.

This is a **control-plane skill**. It does not replace GSD command internals.

## Primary goals

1. Keep GSD usage intentional (not automatic for every request)
2. Preserve roadmap quality for scoped work
3. Enable quick dip-in/dip-out investigation loops
4. Route read-heavy sub-agent investigations to Sonnet-tier models when available

## When to use GSD workflow

Use GSD phase workflow when at least **2** are true:
- Task spans multiple subsystems/components
- Clear acceptance criteria or UAT is required
- Work likely spans multiple sessions
- Traceability/phase progress matters
- User explicitly asks for roadmap/phase advancement

Recommended flow:
1. `/gsd-progress` (where are we?)
2. `/gsd-discuss-phase N`
3. `/gsd-plan-phase N`
4. `/gsd-execute-phase N`
5. `/gsd-verify-work N`

## When to stay ad-hoc

Stay outside full GSD phase flow for:
- one-off debugging/investigation
- quick code reading/grep audits
- small isolated edits
- hypothesis testing before committing roadmap changes

Recommended command: `/gsd-quick`

If ad-hoc discovery reveals roadmap-impacting scope, switch back into phase flow.

## Sonnet-first investigation routing

For read-heavy, CLI-style investigation tasks (grep/read/list/analyze):

1. Prefer Sonnet-tier sub-agent execution when model selection is available
2. Keep these tasks read-only and scoped to a clear inquiry
3. Return compressed findings (signals, risks, next action), not raw dumps

Practical profile guidance:
- Use balanced profile by default for quality planning + efficient execution
- If currently on a weaker profile and investigation quality drops, switch profile first:
  - `/gsd-set-profile balanced`

If explicit per-subagent model selection is available in your runtime, prefer Sonnet for:
- codebase mapping
- dependency tracing
- grep/read synthesis
- failure triage summaries

## Handoff checkpoints (required)

After each major step, ask the user which path to take:
- Continue GSD phase progression
- Pause and investigate ad-hoc
- Capture findings and resume later

This preserves user intent and prevents over-automation.

## Output contract

Always provide:
1. Chosen mode (GSD phase vs ad-hoc)
2. Why that mode was selected (brief criteria)
3. Next concrete command
4. One fallback command

## Anti-patterns

- Do not force full GSD lifecycle for tiny tasks
- Do not auto-chain phases without explicit user intent
- Do not dump large logs; summarize evidence and link to files
- Do not rewrite roadmap structure during exploratory investigation

## Minimal examples

- "Investigate flaky test and report cause" -> ad-hoc investigation (Sonnet preferred), then `/gsd-quick` if small fix
- "Implement feature across API + UI + tests" -> full phase flow
- "Need quick confidence on file ownership/dependencies" -> ad-hoc investigation, then decide if phase plan update is needed
