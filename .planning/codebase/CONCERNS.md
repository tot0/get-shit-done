# Codebase Concerns

**Analysis Date:** 2026-02-06

## Tech Debt

**Runtime-specific paths baked into shared hooks:**
- Issue: Hook logic assumes `~/.claude` for cache, todos, and VERSION files even when installed for Gemini, creating drift between supported runtimes and actual behavior.
- Files: `hooks/gsd-check-update.js`, `hooks/gsd-statusline.js`
- Impact: Update checks and task display can fail or read stale data on non-Claude installs.
- Fix approach: Derive base config directory from runtime context or environment, and pass it into hooks during install.

**Silent JSON parse fallback overwrites user config:**
- Issue: Invalid `settings.json` or `opencode.json` silently resolves to `{}` and is later written back, discarding user settings.
- Files: `bin/install.js`
- Impact: User configuration loss and hard-to-debug config corruption.
- Fix approach: Surface parse errors and abort write, or preserve original file and write a recovered copy.

**Manual frontmatter conversion logic duplicated and ad-hoc:**
- Issue: Multiple conversion functions handle YAML/TOML parsing with string manipulation, increasing maintenance cost and edge-case failures.
- Files: `bin/install.js`
- Impact: Subtle formatting bugs and inconsistent behavior across Claude/OpenCode/Gemini outputs.
- Fix approach: Use a lightweight YAML/TOML parser and centralize frontmatter transformation logic.

## Known Bugs

**Gemini statusline reads Claude-specific todo/cache paths:**
- Symptoms: No task shown, update badge missing, or incorrect data when using Gemini CLI.
- Files: `hooks/gsd-statusline.js`, `hooks/gsd-check-update.js`, `bin/install.js`
- Trigger: Installing for Gemini (`--gemini` or `--all`) and enabling statusline.
- Workaround: Disable statusline or manually symlink Gemini directories to `~/.claude` paths.

## Security Considerations

**Config file rewriting without atomic write or backup:**
- Risk: Partial writes can corrupt config files if process is interrupted.
- Files: `bin/install.js`
- Current mitigation: None detected in `bin/install.js`.
- Recommendations: Write to a temporary file and rename atomically; keep a timestamped backup.

**External directory permission grant is broad:**
- Risk: `external_directory` permission for `get-shit-done/*` is granted globally, which may exceed least-privilege expectations.
- Files: `bin/install.js`
- Current mitigation: Path is scoped to the GSD directory only.
- Recommendations: Prompt or flag-gate this permission, and document the security tradeoff.

## Performance Bottlenecks

**Statusline performs sync filesystem scans on every render:**
- Problem: Each statusline render reads directories, stats files, and parses JSON synchronously.
- Files: `hooks/gsd-statusline.js`
- Cause: Uses `fs.readdirSync`, `fs.statSync`, and `fs.readFileSync` per render.
- Improvement path: Cache last-read todo file and update only when mtime changes; reduce IO per render.

**Update check shells out to npm on session start:**
- Problem: `npm view` call can be slow or blocked behind proxies, even with timeout.
- Files: `hooks/gsd-check-update.js`
- Cause: `execSync('npm view ...')` inside background process.
- Improvement path: Use registry HTTP API with shorter timeout and exponential backoff cached results.

## Fragile Areas

**Install/uninstall relies on recursive deletes in user-defined directories:**
- Files: `bin/install.js`
- Why fragile: `fs.rmSync` removes directories without validating they only contain GSD-managed content.
- Safe modification: Guard deletions with explicit GSD markers (e.g., VERSION file) and confirm ownership.
- Test coverage: No automated tests cover install/uninstall behavior in `bin/install.js`.

**Hook conversion and path rewriting depend on regex-only parsing:**
- Files: `bin/install.js`
- Why fragile: Regex replacements can miss edge cases (nested frontmatter, unusual whitespace, alternate quoting).
- Safe modification: Add fixture-based tests for conversion functions and use parsers.
- Test coverage: No tests in `package.json` scripts or `scripts/`.

## Scaling Limits

**Not detected** in `bin/install.js`, `hooks/gsd-check-update.js`, `hooks/gsd-statusline.js`, `scripts/build-hooks.js`.

## Dependencies at Risk

**Not detected** in `package.json`.

## Missing Critical Features

**No automated validation of generated installs:**
- Problem: Install success is verified only by basic existence checks, not content correctness.
- Files: `bin/install.js`
- Blocks: Hard to detect partially converted frontmatter or broken hooks until runtime.

## Test Coverage Gaps

**Install/convert logic untested:**
- What's not tested: Frontmatter conversion, runtime path replacement, install/uninstall flows.
- Files: `bin/install.js`, `scripts/build-hooks.js`, `hooks/gsd-check-update.js`, `hooks/gsd-statusline.js`, `package.json`
- Risk: Regression on runtime compatibility and config safety.
- Priority: High

---

*Concerns audit: 2026-02-06*
