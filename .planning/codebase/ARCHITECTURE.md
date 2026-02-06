# Architecture

**Analysis Date:** 2026-02-06

## Pattern Overview

**Overall:** Content-driven prompt system with a Node.js installer and runtime hooks.

**Key Characteristics:**
- Markdown-first orchestration: commands and workflows are authored as markdown prompts in `commands/gsd/*.md` and `get-shit-done/workflows/*.md`.
- Agent specialization: subagent roles are defined in `agents/*.md` and referenced by workflows such as `get-shit-done/workflows/execute-phase.md`.
- Install-time materialization: the CLI installer `bin/install.js` copies and transforms content into runtime config directories.

## Layers

**Installer/Distribution:**
- Purpose: package entry point and install-time content transformation.
- Location: `bin/install.js`, `package.json`, `scripts/build-hooks.js`.
- Contains: CLI argument parsing, copy/transform of markdown assets, hook installation, settings updates.
- Depends on: Node.js core modules and repo assets in `commands/`, `agents/`, `get-shit-done/`, `hooks/`.
- Used by: end users running `npx get-shit-done-cc` (bin mapping in `package.json`).

**Command Layer:**
- Purpose: runtime entry points that define slash commands.
- Location: `commands/gsd/*.md`.
- Contains: YAML frontmatter metadata + structured process instructions.
- Depends on: workflows and references in `get-shit-done/workflows/*.md` and `get-shit-done/references/*.md`.
- Used by: runtime command execution (e.g., `/gsd:execute-phase` in `commands/gsd/execute-phase.md`).

**Workflow Layer:**
- Purpose: shared orchestrator logic and procedures referenced by commands.
- Location: `get-shit-done/workflows/*.md`.
- Contains: step-based orchestration for map/plan/execute/verify flows.
- Depends on: templates in `get-shit-done/templates/*.md` and agent roles in `agents/*.md`.
- Used by: commands via `@~/.claude/get-shit-done/workflows/*.md` references (example: `commands/gsd/execute-phase.md`).

**Template/Reference Layer:**
- Purpose: reusable output formats and rules.
- Location: `get-shit-done/templates/*.md`, `get-shit-done/templates/codebase/*.md`, `get-shit-done/references/*.md`.
- Contains: plan/summary/context templates and guidance docs.
- Depends on: none (static content).
- Used by: workflows and agents (example: `get-shit-done/templates/phase-prompt.md`).

**Agent Layer:**
- Purpose: subagent definitions with tool access and role constraints.
- Location: `agents/*.md`.
- Contains: detailed role instructions (planner, executor, mapper, verifier).
- Depends on: workflows and templates referenced in the agent prompts.
- Used by: Task-spawned subagents in workflows like `get-shit-done/workflows/execute-phase.md`.

**Hook Layer:**
- Purpose: runtime statusline and update-check automation.
- Location: `hooks/gsd-statusline.js`, `hooks/gsd-check-update.js`, `hooks/dist/`.
- Contains: Node scripts that run in Claude Code/Gemini sessions.
- Depends on: local config dirs and cache files (e.g., `~/.claude/cache/gsd-update-check.json` referenced in `hooks/gsd-statusline.js`).
- Used by: installer wiring in `bin/install.js` (hook registration in settings.json).

## Data Flow

**Installation Flow:**
1. User runs `npx get-shit-done-cc` which executes `bin/install.js`.
2. `bin/install.js` reads command/agent/template sources from `commands/`, `agents/`, `get-shit-done/` and writes them into the target config directory.
3. Hook scripts are copied from `hooks/dist/` (built by `scripts/build-hooks.js`) and registered in settings by `bin/install.js`.
4. Runtime now has `/gsd:*` commands populated from `commands/gsd/*.md` with workflow references to `get-shit-done/workflows/*.md`.

**Command Execution Flow (example: execute phase):**
1. User invokes `/gsd:execute-phase` defined in `commands/gsd/execute-phase.md`.
2. Command loads workflow logic from `get-shit-done/workflows/execute-phase.md`.
3. Workflow spawns subagents defined in `agents/gsd-executor.md` and `agents/gsd-verifier.md` (referenced by name in the workflow).
4. Subagents produce outputs (plans, summaries, verification) following templates in `get-shit-done/templates/*.md`.

**Hook Runtime Flow:**
1. Session start triggers `hooks/gsd-check-update.js` (registered by `bin/install.js`) to update cache.
2. Statusline calls `hooks/gsd-statusline.js`, which reads cache and todos to render runtime info.

**State Management:**
- Planning state is file-based and referenced by workflows like `get-shit-done/workflows/execute-phase.md` (reads `.planning/STATE.md` and `.planning/ROADMAP.md`).

## Key Abstractions

**Command Prompt:**
- Purpose: top-level action entry point for runtime commands.
- Examples: `commands/gsd/execute-phase.md`, `commands/gsd/map-codebase.md`.
- Pattern: YAML frontmatter + `<objective>/<process>` sections with workflow references.

**Workflow:**
- Purpose: orchestrator logic that defines procedural steps.
- Examples: `get-shit-done/workflows/execute-phase.md`, `get-shit-done/workflows/map-codebase.md`.
- Pattern: `<process>` sections with explicit steps and tool usage rules.

**Agent Definition:**
- Purpose: encapsulated role behavior for Task-spawned subagents.
- Examples: `agents/gsd-planner.md`, `agents/gsd-executor.md`.
- Pattern: YAML frontmatter (name/tools) + structured instructions.

**Template:**
- Purpose: standardized output structure for planning and summaries.
- Examples: `get-shit-done/templates/phase-prompt.md`, `get-shit-done/templates/summary.md`.
- Pattern: markdown templates with required frontmatter fields.

**Hook:**
- Purpose: runtime automation outside of explicit commands.
- Examples: `hooks/gsd-statusline.js`, `hooks/gsd-check-update.js`.
- Pattern: Node scripts with defensive parsing to avoid runtime disruption.

## Entry Points

**CLI Installer:**
- Location: `bin/install.js`.
- Triggers: `npx get-shit-done-cc` (defined in `package.json`).
- Responsibilities: copy assets, transform frontmatter, register hooks, update settings.

**Runtime Commands:**
- Location: `commands/gsd/*.md`.
- Triggers: slash commands like `/gsd:execute-phase` from `commands/gsd/execute-phase.md`.
- Responsibilities: orchestrate workflows and spawn agents.

**Hooks:**
- Location: `hooks/gsd-statusline.js`, `hooks/gsd-check-update.js`.
- Triggers: session start/statusline callbacks configured in `bin/install.js`.
- Responsibilities: update checks and runtime status rendering.

## Error Handling

**Strategy:** Defensive parsing with graceful no-op on failure.

**Patterns:**
- Try/catch around JSON parsing and file reads in `bin/install.js` to avoid aborting installs.
- Silent failure handling in `hooks/gsd-statusline.js` to prevent breaking the statusline.
- Background update checks in `hooks/gsd-check-update.js` with guarded exec errors.

## Cross-Cutting Concerns

**Logging:** Console output in `bin/install.js` and `scripts/build-hooks.js` for install/build feedback.
**Validation:** CLI flag parsing and required argument checks in `bin/install.js`.
**Authentication:** Not applicable in code; runtime auth gates are documented in workflow guidance in `get-shit-done/workflows/execute-phase.md`.

---

*Architecture analysis: 2026-02-06*
