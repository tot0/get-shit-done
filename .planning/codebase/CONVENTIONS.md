# Coding Conventions

**Analysis Date:** 2026-02-06

## Naming Patterns

**Files:**
- kebab-case filenames for scripts and hooks (examples: `bin/install.js`, `scripts/build-hooks.js`, `hooks/gsd-statusline.js`, `hooks/gsd-check-update.js`).

**Functions:**
- lowerCamelCase with verb-first naming (examples: `getGlobalDir`, `convertClaudeToGeminiAgent`, `copyWithPathReplacement` in `bin/install.js`).

**Variables:**
- lowerCamelCase for locals and constants scoped to functions (examples: `cacheFile`, `selectedRuntimes` in `bin/install.js`).
- UPPER_SNAKE_CASE for module-level constants (examples: `HOOKS_DIR`, `DIST_DIR`, `HOOKS_TO_COPY` in `scripts/build-hooks.js`).

**Types:**
- Not detected (no TypeScript types in `bin/install.js`, `hooks/gsd-statusline.js`, `hooks/gsd-check-update.js`, `scripts/build-hooks.js`).

## Code Style

**Formatting:**
- Tool used: Not detected (no formatter config found; style inferred from `bin/install.js`, `hooks/gsd-statusline.js`).
- Key settings: 2-space indentation, semicolons, single quotes, trailing commas only when needed (see `bin/install.js`, `hooks/gsd-check-update.js`).

**Linting:**
- Tool used: Not detected (no lint config; see `package.json`).
- Key rules: Not detected.

## Import Organization

**Order:**
1. Node.js core modules via CommonJS `require` (examples: `fs`, `path`, `os`, `readline` in `bin/install.js`).
2. Destructured core modules when needed (example: `{ spawn }` from `child_process` in `hooks/gsd-check-update.js`).

**Path Aliases:**
- Not detected (uses relative paths like `../package.json` in `bin/install.js`).

## Error Handling

**Patterns:**
- Guarded filesystem access with `existsSync` checks and `try/catch` fallbacks; return defaults on failure (see `bin/install.js`, `hooks/gsd-statusline.js`).
- Log error conditions and exit on fatal CLI errors (see `bin/install.js`).
- Silent failures for non-critical statusline/update parsing (empty `catch` blocks in `hooks/gsd-statusline.js`, `hooks/gsd-check-update.js`).

## Logging

**Framework:** console (usage throughout `bin/install.js`, `scripts/build-hooks.js`).

**Patterns:**
- CLI-style progress output with colored ANSI codes (see `bin/install.js`).
- Warnings for missing optional files (see `scripts/build-hooks.js`).

## Comments

**When to Comment:**
- Use short inline comments to explain non-obvious behavior and platform constraints (examples in `hooks/gsd-statusline.js`, `bin/install.js`).

**JSDoc/TSDoc:**
- JSDoc blocks used for public helper functions and multi-step operations (see `bin/install.js`, `scripts/build-hooks.js`).

## Function Design

**Size:**
- Prefer small helper functions with single responsibilities, but allow long procedural flows for CLI installs when needed (helpers in `bin/install.js`, flow in `install`/`uninstall` in `bin/install.js`).

**Parameters:**
- Use explicit parameters with optional defaults for configuration (see `getGlobalDir(runtime, explicitDir = null)` in `bin/install.js`).

**Return Values:**
- Return booleans for verification helpers and structured objects for multi-step results (see `verifyInstalled`, `install` in `bin/install.js`).

## Module Design

**Exports:**
- None; scripts are executed directly with a shebang (`bin/install.js`, `hooks/gsd-statusline.js`, `hooks/gsd-check-update.js`, `scripts/build-hooks.js`).

**Barrel Files:**
- Not used (no index re-exports in `bin/install.js`).

---

*Convention analysis: 2026-02-06*
