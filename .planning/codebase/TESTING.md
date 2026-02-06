# Testing Patterns

**Analysis Date:** 2026-02-06

## Test Framework

**Runner:**
- None — no test framework is configured or used in this project.
- No test runner dependency in `package.json` (no jest, vitest, mocha, or equivalent)
- `npm test` is not defined in `package.json` scripts

**Assertion Library:**
- None

**Run Commands:**
```bash
# No test commands available
# npm test is NOT configured
```

## Test File Organization

**Location:**
- No test files exist anywhere in the codebase
- No `__tests__/` directories
- No `*.test.*` or `*.spec.*` files

**Pattern:**
- Not established — no convention exists to follow

## Test Coverage

**Requirements:** None enforced — no coverage tooling configured

## What IS Tested (Manual/Runtime Verification)

Despite having no automated tests, the project has verification mechanisms built into its workflow:

**Goal-Backward Verification (Agent-Based):**
- `agents/gsd-verifier.md` defines an agent that verifies phase goals after execution
- Checks actual codebase against `must_haves` from plan frontmatter
- Produces VERIFICATION.md with `passed` / `gaps_found` / `human_needed` status
- This is NOT unit testing — it's a goal verification protocol run by AI agents

**User Acceptance Testing (Command-Based):**
- `/gsd:verify-work` command runs conversational UAT
- Extracts testable deliverables from SUMMARY.md files
- Presents tests one at a time, diagnoses failures
- Template: `get-shit-done/templates/UAT.md`

**Plan Checking (Agent-Based):**
- `agents/gsd-plan-checker.md` verifies plan quality before execution
- Checks that plans actually achieve their stated phase goal
- Blocks execution if critical gaps found

## What SHOULD Be Tested (Gaps)

**High-Priority Test Targets:**

1. **`bin/install.js` (~1530 lines):**
   - Frontmatter conversion (Claude → OpenCode, Claude → Gemini)
   - Path handling (Windows backslashes, tilde expansion, XDG paths)
   - Runtime detection and config directory resolution
   - Settings file merge logic (don't overwrite user settings)
   - Attribution processing (remove, keep, replace Co-Authored-By)
   - Tool name mapping tables (Claude → OpenCode, Claude → Gemini)

2. **`hooks/gsd-statusline.js` (92 lines):**
   - JSON input parsing
   - Context window percentage scaling (80% → 100% conversion)
   - Todo file scanning and in-progress task display
   - Update cache reading
   - Graceful failure on malformed input

3. **`hooks/gsd-check-update.js` (62 lines):**
   - Version file detection (project vs global)
   - Background process spawning
   - Cache file writing

4. **`scripts/build-hooks.js` (43 lines):**
   - Hook file copying to dist/
   - Directory creation
   - Missing file handling

## How to Add Tests (If Establishing Testing)

**Recommended Framework:**
- Node.js built-in test runner (`node:test`) — aligns with zero-dependency philosophy
- Alternative: vitest or jest (would add dev dependency)

**Recommended Structure:**
```
tests/
├── install.test.js          # Installer unit tests
├── hooks/
│   ├── statusline.test.js   # Statusline hook tests
│   └── check-update.test.js # Update checker tests
└── scripts/
    └── build-hooks.test.js  # Build script tests
```

**Key Test Scenarios for Installer:**

```javascript
// Frontmatter conversion
test('converts Claude allowed-tools to OpenCode permission object', () => {
  const input = `---
name: gsd:plan-phase
allowed-tools:
  - Read
  - Write
  - Bash
  - Task
---`;
  const result = convertToOpencodeFormat(input);
  assert(result.includes('permission:'));
  assert(result.includes('read: true'));
});

// Path handling
test('expands tilde to home directory', () => {
  const result = expandTilde('~/some/path');
  assert(result.startsWith(os.homedir()));
});

// Tool mapping
test('maps Claude tool names to OpenCode equivalents', () => {
  assert.equal(claudeToOpencodeTools['AskUserQuestion'], 'question');
  assert.equal(claudeToOpencodeTools['TodoWrite'], 'todowrite');
});
```

**Key Test Scenarios for Statusline:**

```javascript
// Context scaling
test('scales 80% real usage to 100% displayed', () => {
  const remaining = 20; // 80% used
  const rawUsed = 100 - remaining;
  const scaled = Math.min(100, Math.round((rawUsed / 80) * 100));
  assert.equal(scaled, 100);
});

// Graceful failure
test('outputs nothing on invalid JSON input', () => {
  // Should not throw
  const result = processInput('not-json');
  assert.equal(result, '');
});
```

## CI/CD Testing

**Current State:**
- No CI pipeline configured
- No GitHub Actions workflows
- CONTRIBUTING.md mentions "Must pass CI" as a rule, but no CI exists
- CONTRIBUTING.md's "Setting Up Development" section lists `npm test` — which is not configured

**Recommended CI Setup:**
```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        node-version: [16, 18, 20, 22]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
      - run: npm install
      - run: npm test
```

Cross-platform testing is critical because:
- `bin/install.js` handles Windows paths (backslash conversion, UNC paths)
- Path separators affect config directory resolution
- `BUG_REPORT.md` documents past Windows-specific bugs

## Mocking

**Framework:** Not established

**What Would Need Mocking:**
- `fs` operations (file reads/writes during install)
- `os.homedir()` (for path resolution testing)
- `process.env` (for env var override testing)
- `child_process.spawn` (for update check testing)
- `process.stdin` (for hook input testing)
- `readline` (for interactive installer prompts)

---

*Testing analysis: 2026-02-06*
