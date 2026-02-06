# Codebase Structure

**Analysis Date:** 2026-02-06

## Directory Layout

```
[project-root]/
├── agents/                # Subagent role definitions (markdown prompts)
├── assets/                # README and marketing assets
├── bin/                   # CLI entry point
├── commands/              # Slash command definitions
├── get-shit-done/         # Core workflows, templates, references
├── hooks/                 # Runtime hooks (statusline/update)
├── scripts/               # Build-time utilities
├── package.json           # npm package manifest
└── README.md              # Primary documentation
```

## Directory Purposes

**agents/:**
- Purpose: subagent instructions and tool constraints.
- Contains: markdown files like `agents/gsd-planner.md`, `agents/gsd-executor.md`.
- Key files: `agents/gsd-codebase-mapper.md`, `agents/gsd-planner.md`.

**commands/:**
- Purpose: runtime slash commands for GSD.
- Contains: `commands/gsd/*.md` command prompts with frontmatter.
- Key files: `commands/gsd/execute-phase.md`, `commands/gsd/map-codebase.md`.

**get-shit-done/:**
- Purpose: shared orchestration assets used by commands and agents.
- Contains: workflows, templates, references.
- Key files: `get-shit-done/workflows/execute-phase.md`, `get-shit-done/templates/phase-prompt.md`, `get-shit-done/references/planning-config.md`.

**hooks/:**
- Purpose: runtime hook scripts and their distribution build.
- Contains: source hooks in `hooks/gsd-statusline.js`, `hooks/gsd-check-update.js` and compiled copies in `hooks/dist/`.
- Key files: `hooks/gsd-statusline.js`, `hooks/gsd-check-update.js`.

**scripts/:**
- Purpose: build utilities for packaging.
- Contains: `scripts/build-hooks.js` (copies hooks into `hooks/dist/`).
- Key files: `scripts/build-hooks.js`.

## Key File Locations

**Entry Points:**
- `bin/install.js`: CLI installer invoked by npm bin entry.

**Configuration:**
- `package.json`: defines bin mapping and included files.
- `get-shit-done/templates/config.json`: default planning config template.

**Core Logic:**
- `commands/gsd/*.md`: command definitions with workflow references.
- `get-shit-done/workflows/*.md`: orchestrator processes and flows.
- `agents/*.md`: subagent roles and instructions.

**Testing:**
- Not detected (no `tests/` or `*.test.*` files in repo).

## Naming Conventions

**Files:**
- Kebab-case markdown prompts in `commands/gsd/execute-phase.md` and `get-shit-done/workflows/execute-phase.md`.
- Agent filenames prefixed with `gsd-` in `agents/gsd-planner.md`.

**Directories:**
- Lowercase with hyphen separators like `get-shit-done/` and `commands/gsd/`.

## Where to Add New Code

**New Command:**
- Primary code: `commands/gsd/<command>.md`.
- Workflow support: `get-shit-done/workflows/<command>.md` (if it needs a dedicated process).

**New Agent Role:**
- Implementation: `agents/gsd-<role>.md`.
- Reference from workflows in `get-shit-done/workflows/*.md` using the agent name.

**New Template:**
- Implementation: `get-shit-done/templates/<template>.md`.
- For codebase mapping templates: `get-shit-done/templates/codebase/<template>.md`.

**New Hook:**
- Implementation: `hooks/<hook-name>.js`.
- Build inclusion: add to `scripts/build-hooks.js` so it is copied into `hooks/dist/`.
- Install wiring: reference in `bin/install.js` when registering hooks.

## Special Directories

**hooks/dist/:**
- Purpose: distribution-ready hook files copied during build.
- Generated: Yes (via `scripts/build-hooks.js`).
- Committed: Yes (listed in `package.json` files array).

**get-shit-done/templates/codebase/:**
- Purpose: templates used by `/gsd:map-codebase` workflow.
- Generated: No.
- Committed: Yes.

---

*Structure analysis: 2026-02-06*
