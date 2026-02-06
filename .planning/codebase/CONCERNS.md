# Codebase Concerns

**Analysis Date:** 2026-02-06

## Tech Debt

**Fragile JSON Config Parsing (Critical — Systemic):**
- Issue: All config reading across 31 markdown files uses fragile `grep`/`sed` patterns instead of a proper JSON parser. The identical pattern `cat .planning/config.json 2>/dev/null | grep -o '"key"[[:space:]]*:[[:space:]]*...' | ...` is copy-pasted verbatim everywhere.
- Files:
  - `get-shit-done/workflows/execute-phase.md` (lines 20, 62, 73, 82, 85, 86)
  - `get-shit-done/workflows/execute-plan.md` (lines 18, 63)
  - `get-shit-done/workflows/map-codebase.md` (lines 29, 274)
  - `get-shit-done/workflows/verify-work.md` (lines 27, 310)
  - `get-shit-done/workflows/complete-milestone.md` (lines 590, 598, 610, 768)
  - `get-shit-done/workflows/discuss-phase.md` (line 399)
  - `get-shit-done/workflows/diagnose-issues.md` (line 162)
  - `get-shit-done/references/planning-config.md` (lines 43, 141, 144, 147)
  - `commands/gsd/execute-phase.md` (lines 45, 104)
  - `commands/gsd/plan-phase.md` (lines 56, 142, 355)
  - `commands/gsd/new-project.md` (line 384)
  - `commands/gsd/new-milestone.md` (lines 113, 130)
  - `commands/gsd/quick.md` (line 42)
  - `commands/gsd/research-phase.md` (line 39)
  - `commands/gsd/remove-phase.md` (line 258)
  - `commands/gsd/pause-work.md` (line 96)
  - `commands/gsd/audit-milestone.md` (line 47)
  - `commands/gsd/add-todo.md` (line 132)
  - `commands/gsd/check-todos.md` (line 183)
  - `commands/gsd/debug.md` (line 36)
  - `commands/gsd/plan-milestone-gaps.md` (line 164)
  - `agents/gsd-executor.md` (line 47)
  - `agents/gsd-planner.md` (line 1042)
  - `agents/gsd-phase-researcher.md` (line 458)
  - `agents/gsd-research-synthesizer.md` (line 53)
  - `agents/gsd-debugger.md` (line 985)
- Impact: Silent configuration failures. If config.json is minified, has different spacing, or uses unusual formatting, grep patterns fail silently and fall back to defaults. Users' explicit configuration is ignored without any warning. This affects model profile selection, commit behavior, branching strategy, and workflow toggles.
- Fix approach: Since these are prompt files consumed by AI agents (not shell scripts), the fix is to instruct agents to use `node -e "..."` or `jq` for JSON parsing. Example: `MODEL_PROFILE=$(jq -r '.model_profile // "balanced"' .planning/config.json 2>/dev/null || echo "balanced")`. Could also create a shared helper snippet in `get-shit-done/references/` that all files reference instead of copy-pasting.

**Massive Config Parsing Duplication (High):**
- Issue: The `COMMIT_PLANNING_DOCS` loading snippet (4-line bash block) is duplicated across 20 files. The `MODEL_PROFILE` loading snippet is duplicated across 14 files. The branching strategy loading is duplicated across 4 files. All are identical copy-paste with no shared source of truth.
- Files: Same as above (see Fragile JSON Config Parsing)
- Impact: Any change to config schema or parsing logic requires updating 20-31 files manually. High risk of inconsistency when files drift. Already observed: `get-shit-done/references/planning-config.md` documents config schema as `planning.commit_docs` (nested), but grep pattern searches at any nesting level, accidentally working through a coincidence.
- Fix approach: Create a single reference snippet in `get-shit-done/references/config-loading.md` that all workflow/command/agent files reference via `@` syntax. Or better yet, define a canonical config-loading step that each file imports rather than inlines.

**Monolithic Installer (`bin/install.js` — 1530 lines):**
- Issue: The installer script handles CLI argument parsing, interactive prompts, file copying, path replacement, frontmatter conversion (Claude→OpenCode→Gemini), settings management, orphan cleanup, permission configuration, uninstallation, hex color validation, tool name mapping, and TOML generation — all in a single file.
- Files: `bin/install.js` (1530 lines, 52KB)
- Impact: Any modification risks breaking unrelated functionality. Testing individual features is impossible without running the full installer. The file mixes concerns: runtime-specific logic (OpenCode, Gemini, Claude), file operations, config management, and UI output.
- Fix approach: Extract into modules: `lib/convert-frontmatter.js`, `lib/runtime-config.js`, `lib/file-operations.js`, `lib/interactive-prompts.js`. The frontmatter conversion logic alone (Claude→OpenCode, Claude→Gemini TOML, agent conversion) could be 3 separate modules.

**Config Schema Inconsistency (Medium):**
- Issue: The config.json schema is documented differently across files. `get-shit-done/references/planning-config.md` shows `commit_docs` under `planning` namespace and `branching_strategy` under `git` namespace. But `get-shit-done/templates/config.json` places `commit_docs` under `planning` directly. The `/gsd:settings` command (`commands/gsd/settings.md`) writes `branching_strategy` under `git` namespace. The grep-based parsing accidentally works regardless of nesting because it pattern-matches the key name anywhere in the file.
- Files:
  - `get-shit-done/templates/config.json`
  - `get-shit-done/references/planning-config.md`
  - `commands/gsd/settings.md` (lines 124-126)
- Impact: If anyone reads the schema docs and places config values at the documented nested level, the grep patterns still work by accident. But if a user has duplicate keys at different nesting levels, the wrong value might be parsed.
- Fix approach: Standardize on one schema. Either flatten all config keys to root level (simpler for grep parsing) or commit to nested namespaces and use `jq` for parsing.

## Known Bugs

**Hardcoded `~/.claude` Paths in Hooks (Medium):**
- Symptoms: Statusline and update-check hooks always read from `~/.claude/todos` and `~/.claude/cache`, ignoring custom `CLAUDE_CONFIG_DIR` or local installs.
- Files:
  - `hooks/gsd-statusline.js` (line 49: `path.join(homeDir, '.claude', 'todos')`)
  - `hooks/gsd-check-update.js` (line 12: `path.join(homeDir, '.claude', 'cache')`)
  - `hooks/gsd-check-update.js` (line 17: `path.join(homeDir, '.claude', 'get-shit-done', 'VERSION')`)
- Trigger: User sets `CLAUDE_CONFIG_DIR` to a custom path, or installs GSD locally (`.claude/` in project dir). Hooks still look in `~/.claude/`.
- Workaround: None — hooks always use hardcoded paths.

## Security Considerations

**Destructive File Operations Without Confirmation:**
- Risk: `bin/install.js` uses `fs.rmSync(destDir, { recursive: true })` on line 654 to clean install destinations before copying. If path resolution produces an unexpected value (e.g., due to a symlink or env var misconfiguration), entire directories could be deleted.
- Files: `bin/install.js` (lines 654, 820, 829)
- Current mitigation: Paths are constructed from known base directories (`os.homedir()` + runtime-specific suffixes). The `uninstall()` function only removes GSD-prefixed files.
- Recommendations: Add a safety check that the target directory contains expected GSD files before recursive delete. Log the exact path being removed.

**Environment Variable Trust:**
- Risk: `bin/install.js` trusts `OPENCODE_CONFIG_DIR`, `CLAUDE_CONFIG_DIR`, `GEMINI_CONFIG_DIR`, and `XDG_CONFIG_HOME` without validation. A maliciously set env var could direct file writes to arbitrary locations.
- Files: `bin/install.js` (lines 55-106)
- Current mitigation: The installer only writes known GSD files (markdown, JSON, hooks). The risk is primarily writing to unexpected locations, not executing arbitrary code.
- Recommendations: Validate that config directories are within expected locations (home directory or project directory). Warn if writing to system directories.

**Spawned Child Process for Update Check:**
- Risk: `hooks/gsd-check-update.js` spawns a detached child process that runs `execSync('npm view ...')`. This executes npm CLI in the background with the user's full environment.
- Files: `hooks/gsd-check-update.js` (lines 25-61)
- Current mitigation: The child process only reads npm registry data and writes to a cache file. It's spawned with `stdio: 'ignore'` and `windowsHide: true`.
- Recommendations: Consider using HTTPS fetch to npm registry API instead of spawning `npm` CLI. This avoids executing external programs.

## Performance Bottlenecks

**Statusline File System Scanning:**
- Problem: The statusline hook reads the todos directory, stats every matching file, sorts by mtime, then reads the most recent file — all synchronously on every statusline render.
- Files: `hooks/gsd-statusline.js` (lines 48-67)
- Cause: `readdirSync` + `statSync` per file + `readFileSync` + `JSON.parse` on every render cycle. If the todos directory grows large, this becomes noticeably slow.
- Improvement path: Cache the last-read todo filename and only re-read when the directory's mtime changes. Or use `fs.watch()` in a persistent process instead of re-scanning on every invocation.

## Fragile Areas

**Frontmatter Conversion Pipeline:**
- Files:
  - `bin/install.js` lines 440-542 (`convertClaudeToOpencodeFrontmatter`)
  - `bin/install.js` lines 370-438 (`convertClaudeToGeminiAgent`)
  - `bin/install.js` lines 549-583 (`convertClaudeToGeminiToml`)
- Why fragile: These functions parse YAML frontmatter using hand-written line-by-line string parsing instead of a YAML parser. They track state with boolean flags (`inAllowedTools`) and make assumptions about YAML formatting (e.g., array items always start with `- `, no inline arrays).
- Safe modification: Any change to frontmatter fields (adding new fields, changing tool names) requires updating all three conversion functions. Add a new agent frontmatter field → must update Claude, OpenCode, AND Gemini converters.
- Test coverage: Zero automated tests. The PR template mentions testing on macOS/Windows/Linux but there are no test files in the repo.

**Tool Name Mapping Tables:**
- Files:
  - `bin/install.js` lines 287-308 (Claude→OpenCode mapping, Claude→Gemini mapping)
- Why fragile: Two separate mapping objects must be kept in sync with the actual tool names of three different AI coding runtimes. If Claude Code adds a new tool, both mapping tables need updating. If OpenCode or Gemini renames a tool, the mapping breaks silently.
- Safe modification: Check release notes for all three runtimes before modifying. Test with actual runtime to verify tool names are recognized.
- Test coverage: None.

**State Machine Between Workflows:**
- Files:
  - `get-shit-done/workflows/execute-phase.md` (700 lines)
  - `get-shit-done/workflows/execute-plan.md` (1851 lines)
  - `agents/gsd-executor.md` (824 lines)
  - `commands/gsd/execute-phase.md` (344 lines)
- Why fragile: Execution flow involves the command dispatching to the workflow, which spawns executor agents, which follow the execute-plan workflow. State is passed between these via: (1) markdown file content inlined into prompts, (2) SUMMARY.md files on disk, (3) STATE.md file, (4) git commit hashes, (5) checkpoint return format. Any change to the state-passing contract (e.g., changing SUMMARY frontmatter fields) can silently break the pipeline.
- Safe modification: When changing any state-carrying format (SUMMARY.md, checkpoint return, continuation prompt), grep the entire codebase for consumers of that format. The execute-phase workflow, execute-plan workflow, and executor agent ALL parse the same checkpoint return format.
- Test coverage: None — entirely dependent on end-to-end testing by running actual AI agent workflows.

## Scaling Limits

**Context Window Pressure:**
- Current capacity: Agent prompts are already large (executor: 824 lines, planner: 1418 lines). These are loaded as system prompts, consuming significant context before any work begins.
- Limit: As more features, deviation rules, and protocols are added to agent prompts, they approach the quality degradation curve documented in the planner (50%+ context = degrading quality).
- Scaling path: Decompose large agent prompts into smaller, dynamically-loaded reference files. Only include sections relevant to the current task type (e.g., TDD rules only when plan has TDD tasks).

**File Count in Planning Directory:**
- Current capacity: A milestone with 10 phases × 5 plans each = 100+ planning files (PLAN.md, SUMMARY.md, VERIFICATION.md, CONTEXT.md per phase, plus STATE.md, ROADMAP.md).
- Limit: Workflows that `ls` or `find` in `.planning/phases/` scan all phase directories. Long-running projects with multiple milestones accumulate files.
- Scaling path: The `complete-milestone` command archives old files, which mitigates this. But the archive process itself requires reading all summaries.

## Dependencies at Risk

**esbuild (devDependency):**
- Risk: Listed as devDependency but the build script (`scripts/build-hooks.js`) only copies files — it doesn't use esbuild at all. The `prepublishOnly` script runs `build:hooks` which just copies hooks to `dist/`. esbuild is installed but unused.
- Impact: Unnecessary dependency bloat. Users who run `npm install` with devDependencies get esbuild for no reason.
- Migration plan: Remove esbuild from devDependencies. The build script uses only Node.js builtins (`fs`, `path`).

**Three Runtime Support (Claude, OpenCode, Gemini):**
- Risk: Maintaining feature parity and correctness across three AI coding runtimes multiplies the maintenance burden. Each runtime has different frontmatter formats, command structures, tool names, and config locations. Any new GSD feature must be tested against all three.
- Impact: Bugs may exist in OpenCode or Gemini conversion paths that go undetected because testing is manual. The tool name mapping tables must track upstream changes in all three runtimes.
- Migration plan: Not applicable — this is a core product decision, not a fixable dependency. Mitigate with automated conversion tests.

## Missing Critical Features

**Zero Automated Tests:**
- Problem: No test files exist in the entire repository. No test framework is configured. No CI pipeline runs tests. The PR template asks about manual testing on 3 platforms but there is no automation.
- Blocks: Cannot verify that frontmatter conversion, config parsing, tool name mapping, or file operations work correctly after changes. Cannot catch regressions. Cannot validate cross-platform compatibility (the PR template's Windows checkbox is manual).
- Files that need tests most urgently:
  - `bin/install.js` — frontmatter conversion functions, tool name mapping, path resolution
  - `hooks/gsd-statusline.js` — JSON parsing, context window calculation
  - `hooks/gsd-check-update.js` — version comparison logic

**No CI Pipeline:**
- Problem: No GitHub Actions workflow exists. No automated checks run on PRs. The `.github/` directory contains only `FUNDING.yml` and a PR template.
- Blocks: Quality gates, automated testing on multiple platforms, publish automation, changelog enforcement.

## Test Coverage Gaps

**All Code is Untested:**
- What's not tested: Everything — installer, hooks, frontmatter conversion, tool mapping, config parsing, file operations, uninstall flow, interactive prompts.
- Files: `bin/install.js`, `hooks/gsd-statusline.js`, `hooks/gsd-check-update.js`, `scripts/build-hooks.js`
- Risk: Any change to the 1530-line installer could break installation for any of the three supported runtimes without detection until a user reports it.
- Priority: High — the installer is the primary user touchpoint and handles destructive file operations.

**Markdown Prompt Files Have No Validation:**
- What's not tested: Agent prompts, commands, and workflows are all markdown files that function as AI prompts. There is no validation that referenced file paths exist (e.g., `@~/.claude/get-shit-done/references/checkpoints.md`), that frontmatter fields are valid, or that template placeholders like `{phase}` are consistently used.
- Files: All 27 command files in `commands/gsd/`, all 10 agent files in `agents/`, all workflow files in `get-shit-done/workflows/`
- Risk: A renamed or deleted reference file silently breaks the `@` file reference, causing agents to miss critical context. Already observed: the `FIXES_APPLIED.md` documents that `CONTEXT.md` reference in `agents/gsd-executor.md` lacked a clear path.
- Priority: Medium — broken references degrade agent performance but don't crash anything.

---

*Concerns audit: 2026-02-06*
