# Model Profiles

Model profiles control which AI model tier each GSD agent uses. Abstract capability tiers are resolved to provider-specific models at runtime.

## Profile Definitions

| Agent | `quality` | `balanced` | `budget` |
|-------|-----------|------------|----------|
| gsd-planner | reasoning | reasoning | standard |
| gsd-roadmapper | reasoning | standard | standard |
| gsd-executor | reasoning | standard | standard |
| gsd-phase-researcher | reasoning | standard | fast |
| gsd-project-researcher | reasoning | standard | fast |
| gsd-research-synthesizer | standard | standard | fast |
| gsd-debugger | reasoning | standard | standard |
| gsd-codebase-mapper | standard | fast | fast |
| gsd-verifier | standard | standard | fast |
| gsd-plan-checker | standard | standard | fast |
| gsd-integration-checker | standard | standard | fast |

## Profile Philosophy

**quality** - Maximum reasoning power
- Reasoning tier for all decision-making agents
- Standard tier for read-only verification
- Use when: quota available, critical architecture work

**balanced** (default) - Smart allocation
- Reasoning tier only for planning (where architecture decisions happen)
- Standard tier for execution and research (follows explicit instructions)
- Standard tier for verification (needs reasoning, not just pattern matching)
- Use when: normal development, good balance of quality and cost

**budget** - Minimal cost
- Standard tier for anything that writes code
- Fast tier for research and verification
- Use when: conserving quota, high-volume work, less critical phases

## Resolution Logic

Orchestrators resolve model before spawning:

```
1. Read .planning/config.json
2. Get model_profile (default: "balanced")
3. Look up agent's tier (reasoning/standard/fast) in table above
4. Resolve tier to provider-specific model ID (see model-profile-resolution.md)
5. Pass model parameter to Task call
```

## Switching Profiles

Runtime: `/gsd:set-profile <profile>`

Per-project default: Set in `.planning/config.json`:
```json
{
  "model_profile": "balanced"
}
```

## Design Rationale

**Why reasoning-tier for gsd-planner?**
Planning involves architecture decisions, goal decomposition, and task design. This is where model quality has the highest impact.

**Why standard-tier for gsd-executor?**
Executors follow explicit PLAN.md instructions. The plan already contains the reasoning; execution is implementation.

**Why standard-tier (not fast) for verifiers in balanced?**
Verification requires goal-backward reasoning — checking if code *delivers* what the phase promised, not just pattern matching. Standard-tier models handle this well; fast-tier may miss subtle gaps.

**Why fast-tier for gsd-codebase-mapper?**
Read-only exploration and pattern extraction. No reasoning required, just structured output from file contents.
