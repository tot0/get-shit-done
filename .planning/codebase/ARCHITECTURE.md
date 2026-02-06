# Architecture

**Analysis Date:** 2026-02-06

## Pattern Overview

**Overall:** Meta-prompting orchestrator — a system of markdown files that ARE executable prompts, not documents that become prompts. Commands orchestrate agents via the `Task()` tool. Agents write artifacts directly to `.planning/`. No runtime application code exists; the entire system is prompt engineering infrastructure.

**Key Characteristics:**
- Markdown-as-code: `.md` files with YAML frontmatter define commands, agents, workflows, and templates
- Orchestrator-agent pattern: commands (slash commands) spawn specialized subagents via `Task()`, staying lean on context while agents get fresh 200k token windows
- Wave-based parallel execution: plans are grouped by `wave` number in frontmatter; plans within a wave execute in parallel, waves execute sequentially
- State flows through files: `.planning/STATE.md`, `ROADMAP.md`, `REQUIREMENTS.md`, and `SUMMARY.md` files are the communication medium between agents across sessions
- Zero runtime dependencies: the system is entirely markdown prompts + a Node.js installer (`bin/install.js`) + 2 JS hooks

## Layers

**Layer 1 — Commands (User Entry Points):**
- Purpose: Define slash commands users invoke (e.g., `/gsd:new-project`, `/gsd:plan-phase 1`)
- Location: `commands/gsd/*.md`
- Contains: 27 command definitions with YAML frontmatter (`name`, `description`, `allowed-tools`, `argument-hint`), `<objective>`, `<execution_context>` with `@`-references, `<context>`, and `<process>` sections
- Depends on: Workflows, References, Templates (via `@` references), Agents (via `Task()` spawning)
- Used by: Claude Code / OpenCode / Gemini CLI runtime — users type `/gsd:command-name`

**Layer 2 — Workflows (Process Definitions):**
- Purpose: Detailed step-by-step process definitions that commands `@`-reference for execution logic
- Location: `get-shit-done/workflows/*.md`
- Contains: 12 workflow files defining multi-step processes (`execute-phase.md`, `execute-plan.md`, `map-codebase.md`, `verify-phase.md`, etc.)
- Depends on: References, Templates
- Used by: Commands (via `@~/.claude/get-shit-done/workflows/X.md` in `<execution_context>`)
- Pattern: Each workflow is structured as `<purpose>`, `<process>` with named `<step>` elements, and `<success_criteria>`

**Layer 3 — Agents (Specialized Subagents):**
- Purpose: Define specialized subagent roles spawned via `Task()` tool
- Location: `agents/*.md`
- Contains: 11 agent definitions with YAML frontmatter (`name`, `description`, `tools`, `color`), `<role>`, and detailed execution instructions
- Depends on: Workflows, References (agents `@`-reference workflows within their own execution)
- Used by: Commands and Workflows (via `Task(subagent_type="gsd-executor")`)
- Key agents:
  - `gsd-executor` (`agents/gsd-executor.md`) — Executes PLAN.md files, creates per-task commits, produces SUMMARY.md
  - `gsd-planner` (`agents/gsd-planner.md`) — Creates PLAN.md files with task breakdown and wave assignment
  - `gsd-verifier` (`agents/gsd-verifier.md`) — Goal-backward verification that phase achieved its goal
  - `gsd-codebase-mapper` (`agents/gsd-codebase-mapper.md`) — Explores codebase, writes analysis documents
  - `gsd-roadmapper` (`agents/gsd-roadmapper.md`) — Creates ROADMAP.md from requirements
  - `gsd-phase-researcher` (`agents/gsd-phase-researcher.md`) — Researches domain before planning
  - `gsd-project-researcher` (`agents/gsd-project-researcher.md`) — Researches domain ecosystem
  - `gsd-research-synthesizer` (`agents/gsd-research-synthesizer.md`) — Synthesizes parallel research
  - `gsd-plan-checker` (`agents/gsd-plan-checker.md`) — Verifies plan quality before execution
  - `gsd-debugger` (`agents/gsd-debugger.md`) — Scientific method debugging
  - `gsd-integration-checker` (`agents/gsd-integration-checker.md`) — Cross-phase integration verification

**Layer 4 — Templates (Artifact Schemas):**
- Purpose: Define the structure of generated artifacts (plans, summaries, state files, etc.)
- Location: `get-shit-done/templates/*.md`, `get-shit-done/templates/*.json`
- Contains: 21 template files defining output formats for every GSD artifact
- Depends on: Nothing
- Used by: Agents (to generate correctly-structured artifacts)
- Key templates:
  - `phase-prompt.md` — PLAN.md format (frontmatter + objective + tasks)
  - `summary.md` — SUMMARY.md format (frontmatter + deliverables + self-check)
  - `state.md` — STATE.md format (position + accumulated context + continuity)
  - `roadmap.md` — ROADMAP.md format (phases + details + success criteria)
  - `config.json` — Default project configuration (modes, gates, parallelization)
  - `codebase/*.md` — 7 templates for codebase mapping documents

**Layer 5 — References (Shared Knowledge):**
- Purpose: Cross-cutting documentation referenced by multiple commands and workflows
- Location: `get-shit-done/references/*.md`
- Contains: 8 reference files providing conventions and protocols
- Depends on: Nothing
- Used by: Commands, Workflows, Agents (via `@` references)
- Key references:
  - `git-integration.md` — Commit strategy (per-task atomic commits, conventional format)
  - `model-profiles.md` — Model selection table (quality/balanced/budget per agent)
  - `checkpoints.md` — Human-in-the-loop protocol (human-verify, decision, human-action)
  - `ui-brand.md` — Visual output patterns (stage banners, checkpoint boxes)
  - `continuation-format.md` — "Next Up" presentation format
  - `questioning.md` — Deep questioning methodology
  - `tdd.md` — Test-driven development patterns
  - `verification-patterns.md` — Verification approach patterns

## Data Flow

**Primary Flow: Project Lifecycle**

1. User runs `/gsd:new-project` → command reads `questioning.md`, asks deep questions
2. Command spawns `gsd-project-researcher` agents (4 parallel) → write to `.planning/research/`
3. Command spawns `gsd-research-synthesizer` → writes `.planning/research/SUMMARY.md`
4. Command creates `PROJECT.md`, `REQUIREMENTS.md` → spawns `gsd-roadmapper` → writes `ROADMAP.md`
5. User runs `/gsd:plan-phase N` → spawns `gsd-phase-researcher` → writes `RESEARCH.md`
6. Spawns `gsd-planner` → writes `XX-YY-PLAN.md` files with wave assignments
7. Spawns `gsd-plan-checker` → verifies plans, iterates if needed
8. User runs `/gsd:execute-phase N` → groups plans by wave
9. For each wave: spawns `gsd-executor` agents (parallel within wave) → each reads PLAN.md, executes tasks, creates per-task git commits, writes SUMMARY.md, updates STATE.md
10. After all waves: spawns `gsd-verifier` → goal-backward verification → writes VERIFICATION.md
11. If gaps found: user runs `/gsd:plan-phase N --gaps` → creates gap closure plans → re-execute

**Context Transfer Pattern:**

The `@` syntax (e.g., `@.planning/STATE.md`) loads file contents into the command's context. However, `@` does NOT work across `Task()` boundaries. Orchestrators must:
1. Read file contents using `Read` or `Bash` tools
2. Inline the content into the `Task()` prompt string
3. Also include `@~/.claude/get-shit-done/workflows/X.md` in the agent's `<execution_context>` (these resolve within the agent's context)

**State Management:**

- `STATE.md` — Short-term memory (<100 lines). Read first in every workflow. Updated after every significant action. Contains: current position, accumulated decisions, blockers, session continuity.
- `ROADMAP.md` — Phase tracking. Updated when phases complete or new phases added.
- `REQUIREMENTS.md` — Requirement traceability with REQ-IDs. Referenced during planning and verification.
- `PROJECT.md` — Project vision and key decisions. Long-term reference, updated with decisions.
- `config.json` — Runtime configuration (mode, gates, parallelization, model profile, branching strategy).
- `SUMMARY.md` files — Per-plan execution outcomes. Written by executor agents.
- `VERIFICATION.md` files — Per-phase goal verification. Written by verifier agent.

## Key Abstractions

**Plans as Prompts:**
- Purpose: PLAN.md files ARE the prompts that executor agents receive, not documents that get transformed into prompts
- Examples: `.planning/phases/01-foundation/01-01-PLAN.md`, `.planning/phases/02-core/02-03-PLAN.md`
- Pattern: YAML frontmatter (wave, depends_on, autonomous, must_haves) + `<objective>` + `<execution_context>` with `@` refs + `<context>` with `@` refs + `<tasks>` with typed XML elements + `<success_criteria>`
- Task types: `auto` (fully automated), `checkpoint:human-verify` (human confirms visual/functional), `checkpoint:decision` (human selects option), `checkpoint:human-action` (unavoidable manual step)

**Wave-Based Execution:**
- Purpose: Parallel execution of independent plans, sequential execution of dependent plan groups
- Pattern: Each plan has a `wave: N` in frontmatter. Plans in the same wave can run simultaneously. Waves execute in numeric order. Wave numbers are pre-computed during planning based on `depends_on` analysis.
- Implementation: `execute-phase` orchestrator groups plans by wave, spawns `gsd-executor` via parallel `Task()` calls within each wave, waits for all to complete before next wave.

**Model Profile System:**
- Purpose: Balance quality vs cost by assigning different Claude models to different agent types
- Examples: `get-shit-done/references/model-profiles.md`, `.planning/config.json`
- Pattern: Three profiles (quality/balanced/budget) with a lookup table mapping each agent to a model (opus/sonnet/haiku). Orchestrators read `config.json`, resolve the model, pass it to `Task()`.

**Checkpoint Protocol:**
- Purpose: Formalize human-in-the-loop interaction points during autonomous plan execution
- Examples: `get-shit-done/references/checkpoints.md`
- Pattern: Three types: `human-verify` (90% — confirm visual/functional correctness), `decision` (9% — select from options), `human-action` (1% — unavoidable manual steps). Agent stops at checkpoint, returns structured state to orchestrator, orchestrator presents to user, spawns fresh continuation agent with user response.

**Goal-Backward Verification:**
- Purpose: Verify that phase achieved its GOAL, not just completed its TASKS
- Examples: `agents/gsd-verifier.md`
- Pattern: Start from what must be TRUE → what must EXIST → what must be WIRED. Check actual codebase against must_haves from plan frontmatter. Produce VERIFICATION.md with pass/gaps_found/human_needed status.

## Entry Points

**Installation Entry Point:**
- Location: `bin/install.js`
- Triggers: `npx get-shit-done-cc` (npm binary)
- Responsibilities: Detect runtime(s), convert markdown frontmatter to target format (Claude Code YAML, OpenCode flat commands with permission objects, Gemini TOML commands with YAML agent arrays), copy files to `~/.claude/`, `~/.config/opencode/`, or `~/.gemini/`, configure hooks and statusline in runtime settings files

**User Entry Points (Slash Commands):**
- Location: `commands/gsd/*.md` (27 commands)
- Triggers: User types `/gsd:command-name [args]` in Claude Code, OpenCode, or Gemini CLI
- Key commands: `/gsd:new-project`, `/gsd:plan-phase`, `/gsd:execute-phase`, `/gsd:progress`, `/gsd:quick`, `/gsd:debug`, `/gsd:map-codebase`

**Hook Entry Points:**
- Location: `hooks/gsd-statusline.js`, `hooks/gsd-check-update.js`
- Triggers: Automatically by the runtime on each prompt (statusline) and periodically (update check)
- Responsibilities: Statusline reads `.planning/STATE.md` to show current phase/plan. Update checker runs `npm view get-shit-done-cc version` in background, compares to installed version.

## Error Handling

**Strategy:** Fail gracefully with user routing. Never silently continue past failures.

**Patterns:**
- **Plan execution failure:** Executor agents report failure in SUMMARY.md with `## Self-Check: FAILED` marker. Orchestrator detects missing SUMMARY or failed self-check, asks user: "Retry plan?" or "Continue with remaining waves?"
- **Verification gaps:** Verifier produces VERIFICATION.md with `status: gaps_found`. Orchestrator presents gaps, offers `/gsd:plan-phase N --gaps` for gap closure planning.
- **Context exhaustion:** Plans are designed to complete within ~50% context (2-3 tasks max). If context pressure builds, agent creates checkpoint or handoff rather than degrading quality.
- **Authentication gates:** When CLI automation hits auth errors, executor dynamically creates `checkpoint:human-action` rather than failing. User authenticates, executor retries.
- **Session interruption:** STATE.md tracks last position. `/gsd:resume-work` or re-running `/gsd:execute-phase N` auto-skips completed plans (those with SUMMARY.md).

## Cross-Cutting Concerns

**Git Integration:**
- Per-task atomic commits using conventional commit format: `{type}({phase}-{plan}): {task-name}`
- Commit types: feat, fix, test, refactor, perf, chore
- Plan completion metadata commit: `docs({phase}-{plan}): complete [plan-name] plan`
- Never `git add .` — always stage specific files
- Reference: `get-shit-done/references/git-integration.md`

**Context Budget Management:**
- Orchestrators stay at ~10-15% context usage (spawn agents, collect results)
- Each subagent gets fresh 200k context window
- Plans limited to 2-3 tasks to stay within ~50% context
- Quality degradation curve: PEAK (0-30%) → GOOD (30-50%) → DEGRADING (50-70%) → POOR (70%+)

**Multi-Runtime Support:**
- Source format: Claude Code (YAML frontmatter, PascalCase tools)
- Conversion targets: OpenCode (flat command structure, permission objects, lowercase tools), Gemini (TOML frontmatter, YAML agent arrays, snake_case tools)
- Installer (`bin/install.js`) handles all conversions transparently

**Configuration System:**
- `.planning/config.json` controls: mode (interactive/yolo), workflow toggles (research, plan_check, verifier), parallelization settings, gate confirmations, model profile, branching strategy, planning doc commit behavior
- Reference: `get-shit-done/references/planning-config.md`

---

*Architecture analysis: 2026-02-06*
