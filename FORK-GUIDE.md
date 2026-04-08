# Fork Features Quick Guide

This build is upstream GSD v1.34.2 + the danhalem-microsoft fork features, installed to `~/.claude/`.

## What's Added (6 Systems)

### 1. Critic Agents — Adversarial Quality Gates

Six specialized critics that review phase artifacts *before* you execute. Each gets a fresh 200k context window for deep analysis.

| Critic | Lane | Fires On |
|--------|------|----------|
| `gsd-critic-plan` | Requirement coverage, scope estimation, task specificity | Phase plans |
| `gsd-critic-code` | Implementation quality, security, performance | Code artifacts |
| `gsd-critic-scope` | Scope creep, feature drift, anti-goal violation | Plans + execution |
| `gsd-critic-verify` | Verification gaps, missing test cases | Verification artifacts |
| `gsd-critic-discuss` | Discussion quality, unresolved assumptions | Discussion artifacts |
| `gsd-critic-strategy` | Milestone-level drift, stale assumptions, deferred items | ROADMAP.md + cross-phase |

**Usage:**
```
/gsd:critique              # Critique current phase (all 5 critics)
/gsd:critique 3             # Critique phase 3 specifically
/gsd:critique --only=plan,scope   # Run specific critics only
```

Output: `CRITIQUE.md` in the phase directory with severity-classified findings (critical/warning/info), deduplicated across critics.

**When to use:** After `/gsd:plan-phase` completes but *before* `/gsd:execute-phase`. The critics catch gaps the planner's optimism bias misses.

---

### 2. Dynamic Researchers — 11 Specialized Research Types

Instead of one generic research phase, GSD selects which researcher types are relevant to each phase.

| Researcher | Output File | Investigates |
|-----------|-------------|-------------|
| `architecture` | ARCHITECTURE.md | System structure, component boundaries |
| `stack` | STACK.md | Technology choices, dependency analysis |
| `conventions` | CONVENTIONS.md | Code style, naming patterns |
| `testing` | TESTING.md | Test strategy, coverage patterns |
| `data-model` | DATA-MODEL.md | Schema design, data flows |
| `deployment` | DEPLOYMENT.md | CI/CD, infrastructure, release |
| `features` | FEATURES.md | Feature landscape, competitors |
| `pitfalls` | PITFALLS.md | Known gotchas, common mistakes |
| `build-system` | BUILD-SYSTEM.md | Build tools, compilation, packaging |
| `phase-research` | RESEARCH.md | Phase-specific deep dive |

**How it works:** During `/gsd:research-phase` or `/gsd:plan-phase`, GSD scans the available researcher types and selects the relevant ones based on phase context. Each selected researcher runs as a focused subagent.

**CLI tools:**
```bash
# List available researcher types
node ~/.claude/get-shit-done/bin/gsd-tools.cjs researcher scan --raw

# Load a specific researcher definition
node ~/.claude/get-shit-done/bin/gsd-tools.cjs researcher load architecture --raw
```

---

### 3. Taste Library — Preference Learning

Captures your recurring implementation preferences so the agent consults them during future planning/discussion. Reduces repeated questions.

**Commands:**
```
/gsd:add-taste              # Guided Q&A to document a preference
/gsd:extract-taste           # Auto-extract preferences from decision logs
```

**How it works:**
- Preferences are stored as markdown files in `.planning/taste/`
- Each entry has: domain, title, pattern, tags, when-to-apply
- Confidence is tracked via `decision_count` (increases each time the taste is consulted and confirmed)
- During `/gsd:discuss-phase`, active taste entries are loaded and consulted

**Example taste entry:**
```yaml
---
id: taste-prefer-explicit-errors
domain: error-handling
title: Prefer explicit error messages over codes
confidence: high
decision_count: 5
tags: [error-handling, user-feedback, validation]
---
## Pattern
Always use descriptive error messages that explain what went wrong and how to fix it.
Never use numeric error codes without an accompanying human-readable message.

## When To Apply
Any error handling path — API responses, CLI output, log messages, validation failures.
```

---

### 4. Mistake Registry — Structured Failure Capture

Captures mistakes and anti-patterns discovered during work. Feeds into critic agents for future phases.

**Commands:**
```
/gsd:add-mistake             # Capture a mistake (auto-extract from conversation or guided Q&A)
/gsd:mistakes                # List all recorded mistakes
```

**How it works:**
- Mistakes stored in `.planning/mistakes/` as structured markdown with frontmatter
- Each entry has: title, area, root cause, prevention, affected files
- Critics reference the mistake registry during reviews
- IDs are auto-assigned: MR-001, MR-002, etc.

---

### 5. Code-Search MCP Integration

**Not active by default.** If you have a `code-search` MCP server configured in `~/.claude/settings.json`, re-running the installer will inject code-search tools into relevant agents (executor, planner, debugger, verifier, researchers).

---

### 6. Sync-Upstream

```
/gsd:sync-upstream           # Fetch and merge upstream GSD changes
```

Automates `git fetch upstream && git merge upstream/main` with conflict guidance.

---

## Recommended Workflow

### Normal GSD workflow (unchanged)
```
/gsd:new-project → /gsd:discuss-phase → /gsd:plan-phase → /gsd:execute-phase
```

### With fork enhancements
```
/gsd:new-project
  → /gsd:discuss-phase        # Taste library consulted automatically
  → /gsd:research-phase       # Dynamic researchers selected per phase
  → /gsd:plan-phase           # Planner uses research output
  → /gsd:critique             # ← NEW: adversarial review before execution
  → /gsd:execute-phase        # Execute with confidence
  → /gsd:add-mistake          # ← NEW: capture any mistakes discovered
  → /gsd:extract-taste        # ← NEW: mine decisions for preferences
```

### Critic-only workflow (quick quality check)
```
/gsd:critique                # After any plan-phase, before execute
/gsd:critique --only=plan    # Quick check — just plan quality
/gsd:critique --only=strategy # Milestone-level scope review
```

## File Locations

| What | Where |
|------|-------|
| Critic agents | `~/.claude/agents/gsd-critic-*.md` |
| Researcher types | `~/.claude/get-shit-done/researchers/*.md` |
| Taste entries (per-project) | `.planning/taste/*.md` |
| Mistake registry (per-project) | `.planning/mistakes/*.md` |
| Decision logs | `.planning/decisions/*.md` |
| Taste module | `~/.claude/get-shit-done/bin/lib/taste.cjs` |

## Source

Branch: `lupickup/rebased-on-upstream` in `~/repos/microsoft/get-shit-done`
Base: upstream GSD v1.34.2 (glittercowboy/get-shit-done)
Fork features from: danhalem-microsoft/get-shit-done
