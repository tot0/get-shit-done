# Codebase Structure

**Analysis Date:** 2026-02-06

## Directory Layout

```
get-shit-done/                          # Project root (npm package: get-shit-done-cc)
├── agents/                             # Subagent role definitions (11 agents)
│   ├── gsd-codebase-mapper.md
│   ├── gsd-debugger.md
│   ├── gsd-executor.md
│   ├── gsd-integration-checker.md
│   ├── gsd-plan-checker.md
│   ├── gsd-planner.md
│   ├── gsd-phase-researcher.md
│   ├── gsd-project-researcher.md
│   ├── gsd-research-synthesizer.md
│   ├── gsd-roadmapper.md
│   └── gsd-verifier.md
├── bin/                                # npm binary entry point
│   └── install.js                      # Multi-runtime installer (~1500 lines)
├── commands/                           # Slash command definitions
│   └── gsd/                            # All 27 /gsd:* commands
│       ├── add-phase.md
│       ├── add-todo.md
│       ├── audit-milestone.md
│       ├── check-todos.md
│       ├── complete-milestone.md
│       ├── debug.md
│       ├── discuss-phase.md
│       ├── execute-phase.md
│       ├── help.md
│       ├── insert-phase.md
│       ├── join-discord.md
│       ├── list-phase-assumptions.md
│       ├── map-codebase.md
│       ├── new-milestone.md
│       ├── new-project.md
│       ├── pause-work.md
│       ├── plan-milestone-gaps.md
│       ├── plan-phase.md
│       ├── progress.md
│       ├── quick.md
│       ├── remove-phase.md
│       ├── research-phase.md
│       ├── resume-work.md
│       ├── set-profile.md
│       ├── settings.md
│       ├── update.md
│       └── verify-work.md
├── get-shit-done/                      # Core system files (workflows, templates, references)
│   ├── workflows/                      # Detailed process definitions (12 files)
│   │   ├── complete-milestone.md
│   │   ├── diagnose-issues.md
│   │   ├── discovery-phase.md
│   │   ├── discuss-phase.md
│   │   ├── execute-phase.md
│   │   ├── execute-plan.md
│   │   ├── list-phase-assumptions.md
│   │   ├── map-codebase.md
│   │   ├── resume-project.md
│   │   ├── transition.md
│   │   ├── verify-phase.md
│   │   └── verify-work.md
│   ├── templates/                      # Artifact structure definitions (21+ files)
│   │   ├── codebase/                   # Codebase mapping templates (7 files)
│   │   │   ├── architecture.md
│   │   │   ├── concerns.md
│   │   │   ├── conventions.md
│   │   │   ├── integrations.md
│   │   │   ├── stack.md
│   │   │   ├── structure.md
│   │   │   └── testing.md
│   │   ├── research-project/           # Research output templates (5 files)
│   │   │   ├── ARCHITECTURE.md
│   │   │   ├── FEATURES.md
│   │   │   ├── PITFALLS.md
│   │   │   ├── STACK.md
│   │   │   └── SUMMARY.md
│   │   ├── config.json                 # Default project configuration
│   │   ├── context.md                  # Phase context (user decisions) template
│   │   ├── continue-here.md            # Session handoff template
│   │   ├── debug-subagent-prompt.md    # Debug agent prompt template
│   │   ├── discovery.md                # Discovery phase template
│   │   ├── milestone-archive.md        # Milestone archive template
│   │   ├── milestone.md                # Milestone definition template
│   │   ├── phase-prompt.md             # PLAN.md output format template
│   │   ├── planner-subagent-prompt.md  # Planner agent prompt template
│   │   ├── project.md                  # PROJECT.md template
│   │   ├── requirements.md             # REQUIREMENTS.md template
│   │   ├── research.md                 # RESEARCH.md template
│   │   ├── roadmap.md                  # ROADMAP.md template
│   │   ├── state.md                    # STATE.md template
│   │   ├── summary.md                  # SUMMARY.md template
│   │   ├── UAT.md                      # User acceptance testing template
│   │   ├── DEBUG.md                    # Debug session template
│   │   ├── user-setup.md              # User setup instructions template
│   │   └── verification-report.md      # VERIFICATION.md template
│   └── references/                     # Cross-cutting shared knowledge (8 files)
│       ├── checkpoints.md              # Human-in-the-loop protocol
│       ├── continuation-format.md      # "Next Up" presentation format
│       ├── git-integration.md          # Git commit conventions
│       ├── model-profiles.md           # Agent-to-model mapping
│       ├── planning-config.md          # Config.json documentation
│       ├── questioning.md              # Deep questioning methodology
│       ├── tdd.md                      # Test-driven development patterns
│       ├── ui-brand.md                 # Visual output formatting
│       └── verification-patterns.md    # Verification approach patterns
├── hooks/                              # Runtime hooks (source)
│   ├── gsd-statusline.js              # Reads STATE.md, shows status in terminal
│   ├── gsd-check-update.js            # Background npm version check
│   └── dist/                          # Built hooks for distribution
├── scripts/                            # Build scripts
│   └── build-hooks.js                 # Copies hooks to dist/ (run by npm build:hooks)
├── .planning/                          # Generated project artifacts (for this codebase)
│   └── codebase/                      # Codebase analysis documents
├── package.json                        # npm package config (zero runtime deps)
├── package-lock.json                   # Lockfile (lockfileVersion 3)
└── .gitignore                          # Git ignore rules
```

## Directory Purposes

**`agents/`:**
- Purpose: Define 11 specialized subagent roles for the GSD system
- Contains: Markdown files with YAML frontmatter (`name`, `description`, `tools`, `color`) and detailed execution instructions
- Key files: `gsd-executor.md` (824 lines, plan execution), `gsd-planner.md` (plan creation), `gsd-verifier.md` (goal verification)
- Naming: All prefixed with `gsd-`, using kebab-case (e.g., `gsd-phase-researcher.md`)

**`bin/`:**
- Purpose: npm binary entry point — the installer that makes GSD work across runtimes
- Contains: Single file `install.js` (~1500 lines) handling multi-runtime installation
- Key responsibility: Convert Claude Code markdown format to OpenCode and Gemini formats, copy to runtime config directories, configure hooks

**`commands/gsd/`:**
- Purpose: Define all 27 `/gsd:*` slash commands users invoke
- Contains: Markdown files with YAML frontmatter (`name`, `description`, `allowed-tools`, `argument-hint`, optional `agent`) and process sections
- Key files: `new-project.md` (1009 lines, project initialization), `plan-phase.md` (569 lines), `execute-phase.md` (344 lines)
- Naming: kebab-case matching the command name (e.g., `plan-phase.md` → `/gsd:plan-phase`)

**`get-shit-done/workflows/`:**
- Purpose: Detailed step-by-step process definitions referenced by commands
- Contains: 12 workflow markdown files with `<purpose>`, `<process>`, and named `<step>` elements
- Key files: `execute-phase.md` (701 lines, wave execution), `execute-plan.md` (task execution), `map-codebase.md` (parallel mapper orchestration)
- Naming: kebab-case matching the workflow name

**`get-shit-done/templates/`:**
- Purpose: Define the exact structure of every artifact GSD generates
- Contains: 21+ template files defining output formats, plus `codebase/` and `research-project/` subdirectories
- Key files: `phase-prompt.md` (PLAN.md format), `summary.md` (SUMMARY.md format), `state.md` (STATE.md format), `config.json` (default config)
- Naming: kebab-case for descriptive names

**`get-shit-done/references/`:**
- Purpose: Cross-cutting knowledge referenced by multiple commands, workflows, and agents
- Contains: 8 reference documents defining conventions and protocols
- Key files: `git-integration.md` (commit strategy), `model-profiles.md` (model selection), `checkpoints.md` (human interaction protocol), `ui-brand.md` (visual formatting)

**`hooks/`:**
- Purpose: Runtime hooks that enhance the development experience
- Contains: 2 source JS files + `dist/` directory with built copies
- `gsd-statusline.js` — Reads `.planning/STATE.md`, displays current phase/plan in terminal statusline
- `gsd-check-update.js` — Runs `npm view` in background to check for newer versions

**`scripts/`:**
- Purpose: Build tooling for the npm package
- Contains: `build-hooks.js` — copies hook files to `hooks/dist/` for distribution

## Key File Locations

**Entry Points:**
- `bin/install.js`: npm binary entry point, multi-runtime installer
- `commands/gsd/help.md`: Command reference and quick start guide
- `commands/gsd/new-project.md`: Project initialization flow

**Configuration:**
- `package.json`: npm package metadata, version, engine requirements
- `get-shit-done/templates/config.json`: Default GSD project configuration template

**Core Logic (Orchestration):**
- `commands/gsd/execute-phase.md`: Phase execution orchestrator (wave-based parallel execution)
- `commands/gsd/plan-phase.md`: Phase planning orchestrator (research → plan → verify)
- `commands/gsd/new-project.md`: Project initialization orchestrator (questioning → research → requirements → roadmap)

**Core Logic (Execution):**
- `get-shit-done/workflows/execute-phase.md`: Detailed wave execution process (701 lines)
- `get-shit-done/workflows/execute-plan.md`: Individual plan execution process
- `agents/gsd-executor.md`: Executor agent behavior (task commits, deviations, checkpoints)
- `agents/gsd-planner.md`: Planner agent behavior (task breakdown, wave assignment)

**Cross-Cutting Protocols:**
- `get-shit-done/references/git-integration.md`: Git commit conventions
- `get-shit-done/references/model-profiles.md`: Model selection per agent
- `get-shit-done/references/checkpoints.md`: Human-in-the-loop protocol (1079 lines)

## Naming Conventions

**Files:**
- Commands: kebab-case `.md` matching slash command name → `plan-phase.md` = `/gsd:plan-phase`
- Agents: `gsd-` prefix + kebab-case `.md` → `gsd-executor.md`
- Workflows: kebab-case `.md` → `execute-phase.md`
- Templates: kebab-case `.md` or `.json` → `phase-prompt.md`
- References: kebab-case `.md` → `git-integration.md`
- Hooks: `gsd-` prefix + kebab-case `.js` → `gsd-statusline.js`

**Generated Artifacts (in user's `.planning/`):**
- Plans: `{phase}-{plan}-PLAN.md` → `01-02-PLAN.md` (Phase 1, Plan 2)
- Summaries: `{phase}-{plan}-SUMMARY.md` → `01-02-SUMMARY.md`
- Research: `{phase}-RESEARCH.md` → `03-RESEARCH.md`
- Context: `{phase}-CONTEXT.md` → `02-CONTEXT.md`
- Verification: `{phase}-VERIFICATION.md` → `04-VERIFICATION.md`
- Phase directories: `{zero-padded-number}-{slug}` → `01-foundation/`, `02-core-features/`

**Frontmatter Fields:**
- Commands: `name` (colon-separated namespace), `description`, `allowed-tools` (PascalCase array), `argument-hint`, optional `agent`
- Agents: `name` (kebab-case), `description`, `tools` (comma-separated PascalCase), `color`
- Plans: `phase`, `plan`, `type`, `wave`, `depends_on`, `autonomous`, `must_haves`

## Where to Add New Code

**New Slash Command:**
- Create: `commands/gsd/{command-name}.md`
- Format: YAML frontmatter with `name: gsd:{command-name}`, `description`, `allowed-tools`
- Include `<objective>`, `<execution_context>` (with `@` refs to workflows/references), `<process>`
- If complex, create companion workflow at `get-shit-done/workflows/{command-name}.md`
- Register: automatically detected by runtime — no registration step needed

**New Agent:**
- Create: `agents/gsd-{agent-name}.md`
- Format: YAML frontmatter with `name: gsd-{agent-name}`, `description`, `tools`, `color`
- Include `<role>` and detailed execution steps
- Add to model profile table in `get-shit-done/references/model-profiles.md`
- Spawned by commands/workflows via `Task(subagent_type="gsd-{agent-name}")`

**New Workflow:**
- Create: `get-shit-done/workflows/{workflow-name}.md`
- Format: `<purpose>`, `<process>` with named `<step>` elements, `<success_criteria>`
- Referenced by commands via `@~/.claude/get-shit-done/workflows/{workflow-name}.md`

**New Template:**
- Create: `get-shit-done/templates/{template-name}.md` (or `.json`)
- Format: Document the template with examples and lifecycle notes
- Referenced by agents when producing output artifacts

**New Reference:**
- Create: `get-shit-done/references/{reference-name}.md`
- Format: Structured documentation of a convention or protocol
- Referenced by commands/workflows/agents via `@~/.claude/get-shit-done/references/{reference-name}.md`

**New Hook:**
- Create: `hooks/gsd-{hook-name}.js`
- Build: Run `npm run build:hooks` to copy to `hooks/dist/`
- Register: Add to installer's hook configuration in `bin/install.js`

## Special Directories

**`.planning/` (Generated — User's Project):**
- Purpose: Contains all GSD-generated artifacts for a user's project
- Generated: Yes — created by `/gsd:new-project` or `/gsd:map-codebase`
- Committed: Configurable via `config.json` `commit_docs` setting (default: true)
- Key subdirectories: `phases/`, `codebase/`, `research/`, `debug/`, `todos/`, `quick/`

**`hooks/dist/` (Generated — Build Output):**
- Purpose: Built copies of hook files for npm distribution
- Generated: Yes — created by `npm run build:hooks` / `scripts/build-hooks.js`
- Committed: Yes — included in npm package `files` array

**`get-shit-done/templates/codebase/` (Templates for Codebase Mapping):**
- Purpose: Template files that define the structure of `.planning/codebase/` documents
- Generated: No — source templates
- Committed: Yes

**`get-shit-done/templates/research-project/` (Templates for Research):**
- Purpose: Template files for project research output documents
- Generated: No — source templates
- Committed: Yes

## File Size Distribution

**Largest files (core system logic):**
- `bin/install.js` — ~1500 lines (multi-runtime installer with format conversion)
- `get-shit-done/references/checkpoints.md` — 1079 lines (comprehensive checkpoint protocol)
- `commands/gsd/new-project.md` — 1009 lines (project initialization orchestrator)
- `agents/gsd-executor.md` — 824 lines (plan execution agent)
- `get-shit-done/workflows/execute-phase.md` — 701 lines (wave execution workflow)
- `commands/gsd/plan-phase.md` — 569 lines (phase planning orchestrator)
- `commands/gsd/help.md` — 483 lines (full command reference)

**Medium files (feature commands/agents):**
- Most commands: 50-350 lines
- Most agents: 100-400 lines
- Most workflows: 100-400 lines

**Small files (templates/references):**
- Most templates: 50-200 lines
- Most references: 50-250 lines

---

*Structure analysis: 2026-02-06*
