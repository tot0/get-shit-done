# Phase 3: GSD Integration - Research

**Researched:** 2026-02-07
**Domain:** GSD slash command creation, git post-commit hooks, re-entrancy guards, installer integration
**Confidence:** HIGH

## Summary

Phase 3 wraps the existing `pr-branch` subcommand in two integration surfaces: a `/gsd:pr-branch` (or `/gsd-pr-branch` on OpenCode) slash command that AI agents invoke, and an optional git post-commit hook that auto-syncs the PR branch after each commit. Both are well-understood domains with established patterns in this codebase — there are 27 existing slash commands to pattern-match, 2 existing hooks with installer registration, and a build script that copies hooks to `dist/`.

The slash command is straightforward: a markdown file in `commands/gsd/pr-branch.md` with YAML frontmatter and a `<process>` section that runs `node ~/.claude/get-shit-done/bin/gsd-tools.js pr-branch` via the Bash tool. The `--dry-run` flag maps to a natural UX flow: preview first, then execute. The command needs only the `Bash` tool (to invoke gsd-tools.js) and `Read` (for optional config inspection).

The auto-sync hook is more nuanced. Unlike the existing Claude Code hooks (`gsd-statusline.js`, `gsd-check-update.js`) which are registered in Claude Code's `settings.json` and receive JSON on stdin, this is a **git post-commit hook** — a script placed in `.git/hooks/post-commit` (or managed via `core.hooksPath`). The critical challenge is the **re-entrancy guard**: when the hook fires and cherry-picks a commit onto the PR branch (in a worktree), the cherry-pick itself creates a commit, which would normally fire the post-commit hook again. The guard must prevent this infinite loop. The recommended approach uses an environment variable (`GSD_PR_SYNC_RUNNING=1`) set before invoking `gsd-tools.js`, checked at hook startup — this is the standard pattern for git hook re-entrancy and works because environment variables propagate to child processes (including the git operations in the worktree) but don't persist after the hook exits. A lock file is an alternative but adds cleanup complexity.

**Primary recommendation:** Create the slash command as a thin wrapper invoking `gsd-tools.js pr-branch` with appropriate flags. Implement the auto-sync as a standalone git hook script (`hooks/gsd-pr-sync.js`) that checks config, checks the re-entrancy guard env var, and calls `gsd-tools.js pr-branch` in the background. The installer creates/updates `.git/hooks/post-commit` to call this script. Config toggle: `pr_branch.auto_sync` (default: `false`).

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js `child_process` | N/A (Node 20.x) | `execSync`/`spawn` to invoke gsd-tools.js from hook | Already used in hooks and gsd-tools.js |
| Node.js `fs` | N/A | Read config, check lock files, write hook scripts | Already required everywhere |
| Node.js `path` | N/A | Path manipulation for hook and config locations | Already required |
| Git hooks | N/A | `.git/hooks/post-commit` for auto-sync trigger | Native git feature, no dependencies |

### Supporting
No external libraries. Zero-dependency constraint maintained.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Env var re-entrancy guard | Lock file (`.git/gsd-pr-sync.lock`) | Lock file needs cleanup on crash; env var is automatically scoped to process tree |
| Git post-commit hook | Claude Code `PostCommit` hook event | Claude Code hooks only fire during Claude sessions, not manual git commits; git hooks fire always |
| Standalone hook script | Inline shell in `.git/hooks/post-commit` | Standalone script can be updated by installer without modifying user's post-commit hook |
| Background spawn (`child.unref()`) | Synchronous execution | Synchronous blocks every commit by several seconds; background exits immediately |

**Installation:**
```bash
# No installation needed — zero external dependencies
```

## Architecture Patterns

### New Files Structure
```
commands/gsd/
├── pr-branch.md           # NEW: slash command for /gsd:pr-branch

hooks/
├── gsd-pr-sync.js         # NEW: git post-commit hook for auto-sync
├── gsd-statusline.js      # existing
├── gsd-check-update.js    # existing

scripts/
├── build-hooks.js         # MODIFIED: add gsd-pr-sync.js to HOOKS_TO_COPY

bin/
├── install.js             # MODIFIED: install git post-commit hook when auto_sync enabled

get-shit-done/bin/
├── gsd-tools.js           # MODIFIED: add auto_sync config field to loadConfig()
```

### Pattern 1: Slash Command as Thin Bash Wrapper
**What:** The slash command file contains no logic — it invokes `gsd-tools.js pr-branch` via Bash and presents results.
**When to use:** When a tool already exists as a CLI command and the slash command just provides the AI agent interface.
**Example:**
```markdown
---
name: gsd:pr-branch
description: Create or update a filtered PR branch without planning files
argument-hint: "[--dry-run] [--base branch]"
allowed-tools:
  - Bash
  - Read
---
<objective>
Create or update a PR branch that contains only code commits (no .planning/ files).

Invokes the pr-branch tool which:
- Classifies commits as planning-only, code-only, or mixed
- Cherry-picks code-only commits onto a {source}-pr branch
- Reports results including any skipped mixed commits

Use --dry-run to preview without modifying branches.
</objective>

<process>
## 1. Run the PR branch tool

```bash
node ~/.claude/get-shit-done/bin/gsd-tools.js pr-branch $ARGUMENTS
```

## 2. Display results

Present the tool output to the user. Key items to highlight:
- Number of commits cherry-picked vs skipped
- PR branch name
- Any mixed commits that need splitting
- Any conflicts that occurred
</process>
```

**Key principle:** The slash command is a UX layer. All logic lives in gsd-tools.js.

### Pattern 2: Git Post-Commit Hook with Re-Entrancy Guard
**What:** A git hook that runs after every commit, checks if auto-sync is enabled, and spawns `gsd-tools.js pr-branch` in the background.
**When to use:** For the auto-sync feature (INTG-03).
**Example:**
```javascript
#!/usr/bin/env node
// GSD PR Branch Auto-Sync — git post-commit hook
// Automatically updates PR branch after each commit on source branch

// Re-entrancy guard: if we're already running, exit immediately
if (process.env.GSD_PR_SYNC_RUNNING === '1') {
  process.exit(0);
}

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const cwd = process.cwd();

// Check if auto_sync is enabled in config
const configPath = path.join(cwd, '.planning', 'config.json');
let autoSync = false;
try {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  autoSync = config.pr_branch?.auto_sync === true
    || config.pr_branch_auto_sync === true;
} catch {
  // No config or parse error — auto_sync is off
  process.exit(0);
}

if (!autoSync) {
  process.exit(0);
}

// Spawn gsd-tools.js pr-branch in background with re-entrancy guard
const gsdToolsPath = path.join(__dirname, '..', 'get-shit-done', 'bin', 'gsd-tools.js');
const child = spawn(process.execPath, [gsdToolsPath, 'pr-branch'], {
  cwd,
  stdio: 'ignore',
  detached: true,
  env: { ...process.env, GSD_PR_SYNC_RUNNING: '1' },
});
child.unref();
```

### Pattern 3: Git Hook Installation via Installer
**What:** The installer writes or appends to `.git/hooks/post-commit` to call the GSD hook script.
**When to use:** This pattern differs from existing Claude Code hooks because it targets git's hook system, not Claude Code's event system.
**Critical difference from existing hooks:**
- Existing hooks (statusline, check-update) are Claude Code hooks registered in `settings.json` under `hooks.SessionStart` — they receive JSON on stdin and are managed by Claude Code's runtime
- The auto-sync hook is a **git hook** that goes in `.git/hooks/post-commit` — it's managed by git and fires on every `git commit`, regardless of whether Claude Code is running

**Installation approach:**
```javascript
// In install.js — only for local installs or when user enables auto_sync
function installGitPostCommitHook(projectDir, hookScriptPath) {
  const gitHooksDir = path.join(projectDir, '.git', 'hooks');
  const postCommitPath = path.join(gitHooksDir, 'post-commit');

  // Check if .git/hooks exists
  if (!fs.existsSync(gitHooksDir)) return;

  const gsdMarker = '# GSD-PR-SYNC-START';
  const gsdEndMarker = '# GSD-PR-SYNC-END';
  const hookCall = `${gsdMarker}\nnode "${hookScriptPath}" 2>/dev/null || true\n${gsdEndMarker}`;

  if (fs.existsSync(postCommitPath)) {
    const existing = fs.readFileSync(postCommitPath, 'utf-8');
    if (existing.includes(gsdMarker)) {
      // Replace existing GSD section
      const replaced = existing.replace(
        new RegExp(`${gsdMarker}[\\s\\S]*?${gsdEndMarker}`),
        hookCall
      );
      fs.writeFileSync(postCommitPath, replaced);
    } else {
      // Append to existing post-commit hook
      fs.appendFileSync(postCommitPath, '\n' + hookCall + '\n');
    }
  } else {
    // Create new post-commit hook
    fs.writeFileSync(postCommitPath, '#!/bin/sh\n' + hookCall + '\n');
    fs.chmodSync(postCommitPath, '755');
  }
}
```

### Pattern 4: Config Extension for auto_sync
**What:** Add `pr_branch_auto_sync` to `loadConfig()` in gsd-tools.js.
**When to use:** To read the auto_sync setting.
**Example:**
```javascript
// In loadConfig() defaults:
const defaults = {
  // ... existing defaults ...
  pr_branch_auto_sync: false,
};

// In loadConfig() parsing:
pr_branch_auto_sync: get('pr_branch_auto_sync', { section: 'pr_branch', field: 'auto_sync' }) ?? defaults.pr_branch_auto_sync,
```

**Config format in .planning/config.json:**
```json
{
  "pr_branch": {
    "auto_sync": true,
    "base_branch": "main",
    "filter_paths": [".planning/"]
  }
}
```

### Anti-Patterns to Avoid
- **Don't embed pr-branch logic in the slash command markdown:** The command file is a UX layer. Logic stays in gsd-tools.js.
- **Don't use a lock file for re-entrancy guard:** Lock files need cleanup on crash. Env vars are scoped to the process tree and require no cleanup.
- **Don't run the hook synchronously:** `gsd-tools.js pr-branch` involves worktree creation, cherry-pick, and cleanup. Running synchronously blocks every commit by 1-5 seconds. Spawn in background.
- **Don't install the git hook globally:** The git post-commit hook is project-specific (`.git/hooks/`). It cannot be installed globally because `.git/hooks/` is per-repo.
- **Don't overwrite existing post-commit hooks:** Users may have their own post-commit hooks. Use marker-based append/replace strategy.
- **Don't use Claude Code hook events for auto-sync:** Claude Code hooks only fire during Claude sessions. The auto-sync should work even when the user commits manually from the terminal.
- **Don't make auto_sync default to true:** First run should be explicit. Users enable it after verifying the tool works correctly.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Re-entrancy guard | Custom lock file with PID tracking | `GSD_PR_SYNC_RUNNING` env var | Env vars propagate to child processes, auto-cleanup on exit, no crash orphans |
| Background process | Custom daemon/worker | `child_process.spawn()` with `detached: true` + `child.unref()` | Follows `gsd-check-update.js` pattern exactly |
| Config parsing | Custom JSON parser for nested keys | Existing `loadConfig()` in gsd-tools.js | Already handles nested sections (`section.field` pattern) |
| Hook installation | Custom git config manipulation | Marker-based append to `.git/hooks/post-commit` | Standard pattern for composable git hooks |

**Key insight:** The slash command is a ~40-line markdown file. The hook is a ~40-line JS file. The actual work is already done by `gsd-tools.js pr-branch` from Phase 2. This phase is integration glue, not new logic.

## Common Pitfalls

### Pitfall 1: Infinite Loop from Re-Entrancy
**What goes wrong:** Post-commit hook fires → `gsd-tools.js pr-branch` cherry-picks onto PR branch in worktree → git commit in worktree → post-commit hook fires again → infinite loop.
**Why it happens:** Git post-commit hooks fire on ALL commits, including those made by automated processes.
**How to avoid:** Set `GSD_PR_SYNC_RUNNING=1` in the environment before spawning `gsd-tools.js`. The hook checks this env var at startup and exits immediately if set. The env var propagates to all child processes (including git commands in the worktree).
**Warning signs:** CPU spike, rapid git log growth, disk filling up from worktree creation.
**Verified:** YES — env var propagation through child_process.spawn confirmed by Node.js docs and `gsd-check-update.js` pattern.

### Pitfall 2: Hook Fires When PR Branch Doesn't Exist Yet
**What goes wrong:** Auto-sync tries to run on the very first commit of a new branch before the user has ever run `pr-branch`. It could create a PR branch unexpectedly or error confusingly.
**Why it happens:** The hook fires on every commit, not just on branches that already have PR branches.
**How to avoid:** In `gsd-tools.js pr-branch`, the tool already handles the "no PR branch exists yet" case by creating one. However, for auto-sync, this might be surprising. Two options: (a) always create — simplest; (b) only sync if PR branch already exists — requires a check. Recommend (a) because users explicitly enable auto_sync.
**Warning signs:** Users confused by PR branches appearing for branches they didn't intend.

### Pitfall 3: Slash Command Path Varies by Runtime
**What goes wrong:** The slash command contains `node ~/.claude/get-shit-done/bin/gsd-tools.js` which is wrong for OpenCode (`~/.config/opencode/`) and Gemini (`~/.gemini/`).
**Why it happens:** Command files are authored with Claude Code paths, then the installer replaces `~/.claude/` with the correct path prefix.
**How to avoid:** Use `~/.claude/get-shit-done/bin/gsd-tools.js` in the source file. The installer's `copyWithPathReplacement()` already handles path substitution for all three runtimes. For OpenCode, `convertClaudeToOpencodeFrontmatter()` additionally replaces `~/.claude/` with `~/.config/opencode/`.
**Warning signs:** `ENOENT` errors when running the slash command on OpenCode or Gemini.
**Verified:** YES — confirmed installer path replacement in `install.js` lines 667-690.

### Pitfall 4: Git Hook Not Executable
**What goes wrong:** The post-commit hook file exists but git doesn't execute it because it lacks the executable permission bit.
**Why it happens:** `fs.writeFileSync()` creates files with 644 permissions by default. Git hooks need 755.
**How to avoid:** Call `fs.chmodSync(postCommitPath, '755')` after writing the hook. This is a POSIX-only concern — on Windows, git for Windows handles this differently.
**Warning signs:** Auto-sync simply doesn't fire; no errors visible.
**Verified:** YES — standard git hook requirement, documented in git-hooks(5).

### Pitfall 5: Overwriting User's Existing Post-Commit Hook
**What goes wrong:** User has their own post-commit hook (e.g., running linters, notifications). Installing the GSD hook overwrites it.
**Why it happens:** Naive installation creates a new post-commit file rather than appending.
**How to avoid:** Use marker-based append strategy: check if the file exists, check for GSD markers, append if not present. If markers exist, replace the GSD section. Never delete non-GSD content.
**Warning signs:** User's other git hooks stop working after GSD installation.

### Pitfall 6: Hook Path Resolution in Git Worktree
**What goes wrong:** When `gsd-tools.js pr-branch` creates a worktree and cherry-picks, the worktree has its own `.git` file (not directory) pointing back to the main repo. If the hook resolves paths relative to `process.cwd()`, it might get confused in the worktree context.
**Why it happens:** Git worktrees use a `.git` file containing `gitdir: /path/to/main/.git/worktrees/<name>` instead of a `.git` directory.
**How to avoid:** The hook runs in the main repo's context (triggered by the original commit, not the cherry-pick). The re-entrancy guard prevents the hook from firing in the worktree context. Additionally, `gsd-tools.js` uses `cwd` (main repo) for all non-worktree operations.
**Warning signs:** Hook errors about `.git` not being a directory.
**Verified:** YES — the re-entrancy guard (`GSD_PR_SYNC_RUNNING=1`) prevents worktree commits from triggering the hook.

### Pitfall 7: Git Hook Installation Timing
**What goes wrong:** The git hook needs to be installed per-project (in `.git/hooks/`), but the GSD installer runs globally (installing to `~/.claude/`). The hook can't be installed at GSD install time because the project doesn't exist yet.
**Why it happens:** Git hooks are per-repository, not per-user.
**How to avoid:** Two-stage approach: (1) The hook script lives in `~/.claude/hooks/gsd-pr-sync.js` (installed by GSD installer). (2) Per-project activation is done by the user enabling `pr_branch.auto_sync: true` in config AND running a setup command (or the slash command's first run could offer to install the git hook). Alternatively, the slash command could check and offer to install the git hook.
**Warning signs:** Users enable auto_sync in config but nothing happens because the git hook isn't installed.

## Code Examples

Verified patterns from the existing codebase:

### Slash Command Following Existing Patterns
```markdown
<!-- Source: Pattern derived from commands/gsd/update.md, commands/gsd/help.md -->
---
name: gsd:pr-branch
description: Create or update a filtered PR branch without planning files
argument-hint: "[--dry-run] [--base branch]"
allowed-tools:
  - Bash
  - Read
---
<objective>
Create or update a PR branch that contains only code commits,
filtering out all .planning/ commits.

Wraps `gsd-tools.js pr-branch` — the tool handles all git operations.
</objective>

<process>
## 1. Run PR branch tool

Parse $ARGUMENTS for flags (--dry-run, --base):

```bash
node ~/.claude/get-shit-done/bin/gsd-tools.js pr-branch $ARGUMENTS
```

## 2. Present results

Display the output directly — it includes:
- Commit classification (PLAN/CODE/MIX)
- Cherry-pick results or dry-run preview
- PR branch name
- Warnings about mixed or skipped commits
</process>
```

### Background Spawn Pattern (from gsd-check-update.js)
```javascript
// Source: hooks/gsd-check-update.js lines 25-61
const child = spawn(process.execPath, ['-e', `
  // Background work here
`], {
  stdio: 'ignore',
  windowsHide: true
});
child.unref();
```

### Config Reading Pattern (from gsd-tools.js loadConfig)
```javascript
// Source: get-shit-done/bin/gsd-tools.js lines 45-98
// Nested config access pattern:
pr_branch_auto_sync: get('pr_branch_auto_sync', { section: 'pr_branch', field: 'auto_sync' }) ?? defaults.pr_branch_auto_sync,
```

### Hook Registration Pattern (from install.js)
```javascript
// Source: bin/install.js lines 1253-1276
// Existing pattern for registering Claude Code hooks:
if (!settings.hooks.SessionStart) {
  settings.hooks.SessionStart = [];
}
const hasGsdUpdateHook = settings.hooks.SessionStart.some(entry =>
  entry.hooks && entry.hooks.some(h => h.command && h.command.includes('gsd-check-update'))
);
if (!hasGsdUpdateHook) {
  settings.hooks.SessionStart.push({
    hooks: [{ type: 'command', command: updateCheckCommand }]
  });
}
```

### Marker-Based Git Hook Installation
```bash
#!/bin/sh
# User's existing hook content stays here...

# GSD-PR-SYNC-START
node "/path/to/hooks/gsd-pr-sync.js" 2>/dev/null || true
# GSD-PR-SYNC-END
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Standalone `bin/gsd-pr-branch.js` | Subcommand in `gsd-tools.js` | Phase 1-2 decision | Slash command invokes `gsd-tools.js pr-branch` directly, no separate entry point needed |
| Claude Code hook for post-commit | Git hook for post-commit | This phase | Git hooks fire on ALL commits (not just during Claude sessions), which is the correct behavior for auto-sync |
| Lock file for re-entrancy | Env var (`GSD_PR_SYNC_RUNNING`) | Standard practice | Env vars are process-scoped, auto-cleanup, no crash orphans |

**Deprecated/outdated:**
- The initial project research suggested a standalone `bin/gsd-pr-branch.js` — this was superseded by the `gsd-tools.js pr-branch` subcommand decision in Phase 1.
- The initial research suggested Claude Code hook events — git hooks are correct for auto-sync since they fire on all commits.

## Open Questions

1. **Git hook installation mechanism**
   - What we know: The hook script needs to be in `.git/hooks/post-commit`. The GSD installer runs at `npx get-shit-done-cc` time, potentially before any project exists.
   - What's unclear: Should the installer handle git hook setup, or should the slash command offer to do it on first run, or should there be a separate setup step?
   - Recommendation: The slash command should offer to install the git hook when `auto_sync` is enabled in config but the git hook isn't installed. This is a natural discovery point. Also provide a manual instruction in the command output. The installer should NOT touch `.git/hooks/` during global install (no project context). For local installs, the installer CAN install the hook.

2. **Behavior when not on a feature branch**
   - What we know: `gsd-tools.js pr-branch` errors if on `main`/`master` or detached HEAD.
   - What's unclear: Should the auto-sync hook silently skip if on main, or should it error?
   - Recommendation: Silently skip. The hook should never produce visible output or errors. If not on a feature branch, exit 0 silently. Consistent with hook philosophy: "never break host app."

3. **core.hooksPath compatibility**
   - What we know: Git supports `core.hooksPath` config to redirect hooks to a different directory. Some tools (like Husky) use this.
   - What's unclear: Should we detect and respect `core.hooksPath`?
   - Recommendation: YES — check `git config core.hooksPath` and install there if set. Otherwise use `.git/hooks/`. This is a ~5 line addition to the installer logic.

4. **Multi-runtime hook installation**
   - What we know: OpenCode and Gemini also install GSD. The hook script path varies by runtime.
   - What's unclear: How does the git hook know which runtime's gsd-tools.js to call?
   - Recommendation: The git hook should use a relative path from the project or detect the GSD installation. Simplest: the hook script in `.git/hooks/post-commit` calls the hook at the path that was correct at install time. If the user changes runtimes, they re-run the installer.

## Sources

### Primary (HIGH confidence)
- `commands/gsd/*.md` — 27 existing slash commands examined for frontmatter and process patterns
- `hooks/gsd-statusline.js`, `hooks/gsd-check-update.js` — existing hook patterns (background spawn, silent failure)
- `bin/install.js` — installer hook registration pattern (settings.json hooks, buildHookCommand)
- `get-shit-done/bin/gsd-tools.js` — loadConfig() pattern, pr-branch subcommand, execGit helper
- `scripts/build-hooks.js` — HOOKS_TO_COPY array pattern
- `.planning/research/ARCHITECTURE.md` — project research on hook integration points
- `.planning/research/PITFALLS.md` — post-commit hook re-entrancy pitfall documented
- `.planning/REQUIREMENTS.md` — INTG-02, INTG-03 requirement text
- `.planning/codebase/CONVENTIONS.md` — file naming, frontmatter, code style conventions
- `.planning/codebase/STRUCTURE.md` — where to add new slash commands, hooks, agents

### Secondary (MEDIUM confidence)
- Git hooks documentation (`git-hooks(5)`) — post-commit hook behavior, `core.hooksPath`
- Node.js `child_process.spawn` documentation — `detached`, `unref()`, env propagation

### Tertiary (LOW confidence)
- None — all critical findings verified through codebase examination.

## Metadata

**Confidence breakdown:**
- Slash command: HIGH — 27 existing examples to pattern-match; trivial wrapper
- Auto-sync hook: HIGH — follows existing hook patterns; re-entrancy guard is well-understood
- Installer integration: HIGH — existing hook registration code examined; marker-based git hook append is standard
- Config extension: HIGH — `loadConfig()` pattern already handles nested keys; adding one field
- Git hook installation: MEDIUM — `core.hooksPath` and multi-runtime path resolution need validation during implementation

**Research date:** 2026-02-07
**Valid until:** 2026-03-07 (stable domain — git hooks and slash commands don't change)
