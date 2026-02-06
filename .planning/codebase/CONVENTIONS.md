# Coding Conventions

**Analysis Date:** 2026-02-06

## Naming Patterns

**Files:**
- All file names use kebab-case: `execute-phase.md`, `gsd-statusline.js`, `build-hooks.js`
- Command files match their slash command name: `plan-phase.md` → `/gsd:plan-phase`
- Agent files use `gsd-` prefix: `gsd-executor.md`, `gsd-planner.md`, `gsd-verifier.md`
- Hook files use `gsd-` prefix: `gsd-statusline.js`, `gsd-check-update.js`
- Generated planning artifacts use `{phase}-{plan}-{TYPE}.md` format: `01-02-PLAN.md`, `01-02-SUMMARY.md`
- Phase directories use `{zero-padded-number}-{slug}`: `01-foundation/`, `02-core-features/`

**Slash Command Names:**
- Format: `gsd:{kebab-case}` (colon separator)
- Examples: `gsd:new-project`, `gsd:execute-phase`, `gsd:plan-phase`

**XML Tags:**
- Semantic names only — never use generic tags like `<section>`, `<item>`, `<content>`
- Use kebab-case or snake_case: `<execution_context>`, `<offer_next>`, `<wave_execution>`
- Step `name` attributes use snake_case: `name="load_project_state"`, `name="resolve_model_profile"`
- Step `priority` attribute is a named value: `priority="first"`

**JavaScript (install.js, hooks, scripts):**
- Functions: camelCase — `expandTilde()`, `readSettings()`, `buildHookCommand()`, `getCommitAttribution()`
- Constants: camelCase for simple values, CAPS for color codes — `const cyan = '\x1b[36m'`
- Variables: camelCase — `selectedRuntimes`, `hasGlobal`, `explicitConfigDir`
- Boolean flags: prefixed with `has`/`is` — `hasGlobal`, `hasLocal`, `hasOpencode`, `hasBoth`

**Bash Variables (embedded in markdown):**
- CAPS_UNDERSCORES: `MODEL_PROFILE`, `COMMIT_PLANNING_DOCS`, `PHASE_ARG`, `PLAN_START_TIME`

**Frontmatter Fields:**
- Commands: `name`, `description`, `allowed-tools`, `argument-hint`, `agent` (optional)
- Agents: `name`, `description`, `tools`, `color`
- Plans: `phase`, `plan`, `type`, `wave`, `depends_on`, `autonomous`, `must_haves`

**Type Attributes:**
- Colon separator for compound types: `type="checkpoint:human-verify"`, `type="checkpoint:decision"`

## Code Style

**Formatting:**
- No formatter configured (no .prettierrc, .editorconfig, or equivalent)
- JavaScript uses 2-space indentation (observed in `bin/install.js`, `hooks/*.js`, `scripts/*.js`)
- Markdown uses 2-space indentation for nested lists
- YAML frontmatter uses 2-space indentation for arrays
- JSON uses 2-space indentation with trailing newline

**Linting:**
- No linter configured (no .eslintrc, eslint.config.*, biome.json, or equivalent)
- Style enforced by convention, not tooling

**Semicolons:**
- Always use semicolons in JavaScript (observed consistently across all `.js` files)

**Quotes:**
- Single quotes for strings in JavaScript: `const cyan = '\x1b[36m'`
- Double quotes for JSON strings (standard)
- Single quotes for inline bash in markdown: `MODEL_PROFILE=$(cat .planning/config.json 2>/dev/null | ...)`

**Line Length:**
- No enforced limit
- Long lines common in installer help text and markdown tables
- Keep process steps readable; break naturally at logical boundaries

## Import Organization

**Node.js Modules (CommonJS):**
- Use `require()` — no ES modules
- Order (observed in `bin/install.js`, hooks, scripts):
  1. Node.js built-in modules: `fs`, `path`, `os`, `readline`, `child_process`
  2. Local modules: `../package.json`
- No third-party imports in any runtime code (zero-dependency project)

**Example from `bin/install.js`:**
```javascript
const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');
```

**Example from `hooks/gsd-check-update.js`:**
```javascript
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
```

**Path Aliases:**
- None — all paths are relative or absolute

## @-Reference Patterns (Markdown)

**Static references** (always load):
```
@~/.claude/get-shit-done/workflows/execute-phase.md
@.planning/PROJECT.md
```

**Conditional references** (load if exists):
```
@.planning/DISCOVERY.md (if exists)
@.planning/codebase/ARCHITECTURE.md (if exists)
```

**Cross-boundary note:** `@` references do NOT work across `Task()` boundaries. Orchestrators must read file contents and inline them into the `Task()` prompt.

## Error Handling

**JavaScript (hooks):**
- Wrap all operations in try/catch
- Silent failure for non-critical operations (statusline, update check)
- Pattern: `try { ... } catch (e) { /* Silent fail */ }`
- Example from `hooks/gsd-statusline.js`:
```javascript
try {
  const todos = JSON.parse(fs.readFileSync(path.join(todosDir, files[0].name), 'utf8'));
  const inProgress = todos.find(t => t.status === 'in_progress');
  if (inProgress) task = inProgress.activeForm || '';
} catch (e) {}
```

**JavaScript (installer):**
- Explicit error messages with color formatting for user-facing errors
- `process.exit(1)` for fatal errors (missing config-dir argument, invalid paths)
- Return empty defaults for missing files: `readSettings()` returns `{}` if file missing or parse fails

**Markdown (orchestration):**
- Check for file existence before reading: `cat .planning/STATE.md 2>/dev/null`
- Provide fallback defaults: `|| echo "balanced"`, `|| echo "true"`
- Error routing: present errors to user with options ("Retry?" / "Skip?" / "Fix and continue?")

## Logging

**Framework:** None — `console.log` and `console.warn` in JavaScript

**Patterns:**
- Hooks: completely silent — never log to stdout/stderr (would break statusline)
- Installer: colored console output with ANSI escape codes
- Build script: `console.log` for progress, `console.warn` for warnings
- Orchestration (markdown): stage banners for visual progress (see `get-shit-done/references/ui-brand.md`)

## Comments

**When to Comment:**
- JSDoc-style block comments for function documentation in `bin/install.js`:
```javascript
/**
 * Get the global config directory for OpenCode
 * OpenCode follows XDG Base Directory spec and uses ~/.config/opencode/
 * Priority: OPENCODE_CONFIG_DIR > dirname(OPENCODE_CONFIG) > XDG_CONFIG_HOME/opencode > ~/.config/opencode
 */
function getOpencodeGlobalDir() {
```
- Inline comments for non-obvious logic:
```javascript
// Scale: 80% real usage = 100% displayed
const used = Math.min(100, Math.round((rawUsed / 80) * 100));
```
- Section separators in install.js: `// Colors`, `// Parse args`, `// Cache for attribution settings`

**JSDoc/TSDoc:**
- Used for function documentation in `bin/install.js` with `@param` and `@returns` tags
- Not used in hooks or build scripts (shorter, simpler files)

## Function Design

**Size:**
- Functions in `bin/install.js` range from 5 to ~200 lines
- Hook scripts are ~90 lines total with minimal function extraction
- Build script is a single `build()` function at ~25 lines

**Parameters:**
- Named parameters (positional), no destructuring or options objects:
```javascript
function getGlobalDir(runtime, explicitDir = null) { ... }
function processAttribution(content, attribution) { ... }
function buildHookCommand(configDir, hookName) { ... }
```
- Default values for optional params: `explicitDir = null`

**Return Values:**
- Functions return explicit values, not void
- Use of `null`/`undefined` with semantic meaning (attribution: `null` = remove, `undefined` = keep, `string` = replace)
- Boolean checks via `fs.existsSync()` before operations

## Module Design

**Exports:**
- No module exports — all JS files are standalone scripts run directly via `node`
- `bin/install.js` runs as CLI entry point (`#!/usr/bin/env node`)
- Hooks run as stdin-piped scripts
- Build script runs as standalone node script

**Barrel Files:**
- Not applicable — no module system beyond Node.js built-ins

## Markdown File Structure

**Commands (`commands/gsd/*.md`):**
```yaml
---
name: gsd:command-name
description: One-line description
argument-hint: "<required>" or "[optional]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Task
  - AskUserQuestion
---
```
Then: `<objective>` → `<execution_context>` → `<context>` → `<process>` → `<success_criteria>`

**Agents (`agents/gsd-*.md`):**
```yaml
---
name: gsd-agent-name
description: Multi-line description
tools: Read, Write, Edit, Bash, Grep, Glob
color: yellow
---
```
Then: `<role>` → execution steps → `<success_criteria>`

**Workflows (`get-shit-done/workflows/*.md`):**
No YAML frontmatter. Structure: `<purpose>` → `<process>` with named `<step>` elements → `<success_criteria>`

**References (`get-shit-done/references/*.md`):**
No YAML frontmatter. Use outer XML containers related to content domain.

## Language & Tone (for Markdown Prompts)

**Voice:** Imperative, direct. "Execute tasks", "Create file", "Read STATE.md"
- Never: "Let me", "Just", "Simply", "Basically", "I'd be happy to"

**Sycophancy:** Banned. No "Great!", "Awesome!", "Excellent!"

**Brevity:** Substance over filler. "JWT auth with refresh rotation using jose library" not "Authentication implemented"

**Temporal language:** Banned in implementation docs. Describe current state only.
- Exception: CHANGELOG.md, MIGRATION.md, git commits

**Character preservation:** Always preserve diacritics (TÂCHES, not TACHES)

## Git Conventions

**Commit Format:**
```
{type}({scope}): {description}
```

**Types:** `feat`, `fix`, `test`, `refactor`, `docs`, `chore`, `revert`

**Scope:** Phase-plan identifier (`1-01`), `quick-NNN`, or descriptive scope (`install`, `checkpoints`)

**Rules:**
- One commit per task during execution
- Stage files individually — never `git add .` or `git add -A`
- Include `Co-Authored-By` line (configurable via attribution settings)

**Branch naming:**
- `feat/description` — New capability
- `fix/description` — Bug fix
- `docs/description` — Documentation only
- `refactor/description` — Internal changes
- `hotfix/version-description` — Emergency production fix

## Config Pattern

**Reading config.json values (grep-based, used across 30+ markdown files):**
```bash
# Boolean value
COMMIT_PLANNING_DOCS=$(cat .planning/config.json 2>/dev/null | grep -o '"commit_docs"[[:space:]]*:[[:space:]]*[^,}]*' | grep -o 'true\|false' || echo "true")

# String value
MODEL_PROFILE=$(cat .planning/config.json 2>/dev/null | grep -o '"model_profile"[[:space:]]*:[[:space:]]*"[^"]*"' | grep -o '"[^"]*"$' | tr -d '"' || echo "balanced")
```

This is the established pattern. Follow it for consistency even though it's fragile (see CONCERNS.md).

## Anti-Patterns (Banned)

- Enterprise patterns: story points, sprint ceremonies, RACI matrices, team coordination
- Generic XML tags: `<section>`, `<item>`, `<content>` — use semantic tags instead
- Vague tasks: "Add authentication" — specify exactly what, how, and verify criteria
- Human time estimates: days/weeks — use task counts and context budgets instead

---

*Convention analysis: 2026-02-06*
