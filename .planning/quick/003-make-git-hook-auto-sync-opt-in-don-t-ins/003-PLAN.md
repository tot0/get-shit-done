---
phase: quick
plan: 003
type: execute
wave: 1
depends_on: []
files_modified:
  - bin/install.js
autonomous: true
must_haves:
  truths:
    - "Running `npx get-shit-done` without --auto-sync does NOT install the git post-commit hook"
    - "Running `npx get-shit-done --auto-sync` installs the git post-commit hook as before"
    - "Uninstall still cleans up the git hook if it was previously installed"
  artifacts:
    - path: "bin/install.js"
      provides: "--auto-sync flag gating installGitPostCommitHook()"
      contains: "hasAutoSync"
  key_links:
    - from: "bin/install.js args parsing"
      to: "installGitPostCommitHook() call"
      via: "hasAutoSync conditional"
      pattern: "hasAutoSync.*installGitPostCommitHook"
---

<objective>
Make the git post-commit hook (PR auto-sync) opt-in instead of installing by default.

Purpose: Currently `installGitPostCommitHook()` runs unconditionally on every install (line 1562), which modifies the user's `.git/hooks/post-commit` without them asking for it. This should only happen when the user explicitly passes `--auto-sync`.
Output: Updated `bin/install.js` with `--auto-sync` flag support
</objective>

<execution_context>
@/Users/lupickup/.config/Claude/get-shit-done/workflows/execute-plan.md
@/Users/lupickup/.config/Claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
@bin/install.js
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add --auto-sync flag and gate hook installation behind it</name>
  <files>bin/install.js</files>
  <action>
Three changes to `bin/install.js`:

1. **Parse the flag** (near line 28, with the other flag declarations):
   Add: `const hasAutoSync = args.includes('--auto-sync');`

2. **Gate the hook installation** (line 1561-1562):
   Change the unconditional call:
   ```
   // Install git post-commit hook for PR auto-sync
   installGitPostCommitHook(targetDir, isGlobal);
   ```
   To a conditional:
   ```
   // Install git post-commit hook for PR auto-sync (opt-in via --auto-sync)
   if (hasAutoSync) {
     installGitPostCommitHook(targetDir, isGlobal);
   }
   ```

3. **Keep uninstall cleanup unconditional** — the existing uninstall code at lines 978-995 should remain as-is. If a user previously installed the hook and later reinstalls without `--auto-sync`, uninstall should still clean up. No change needed here.

Do NOT modify `installGitPostCommitHook()` itself — it stays the same. Only gate when it's called.
  </action>
  <verify>
    - `grep 'hasAutoSync' bin/install.js` shows the flag declaration and conditional
    - `node -c bin/install.js` parses without syntax errors
    - Verify the unconditional `installGitPostCommitHook(targetDir, isGlobal)` call no longer exists (it's now inside an `if (hasAutoSync)` block)
  </verify>
  <done>
    - `--auto-sync` flag is parsed from args
    - `installGitPostCommitHook()` is only called when `--auto-sync` is passed
    - Uninstall cleanup remains unconditional (still removes hook if present)
    - No other behavior changes
  </done>
</task>

</tasks>

<verification>
- `node -c bin/install.js` — no syntax errors
- `grep -n 'hasAutoSync' bin/install.js` — shows flag parse + conditional usage
- `grep -n 'installGitPostCommitHook' bin/install.js` — call site is inside `if (hasAutoSync)` block
- Uninstall section (lines ~978-995) is unchanged
</verification>

<success_criteria>
- Default install (`npx get-shit-done`) does NOT touch `.git/hooks/post-commit`
- Explicit `npx get-shit-done --auto-sync` installs the hook as before
- Uninstall still cleans up any previously-installed hook
</success_criteria>

<output>
After completion, create `.planning/quick/003-make-git-hook-auto-sync-opt-in-don-t-ins/003-SUMMARY.md`
</output>
