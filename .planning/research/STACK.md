# Technology Stack: PR Branch Filter Tool

**Project:** GSD PR Branch Filter (git commit filtering / branch splitting)
**Researched:** 2026-02-06
**Overall Confidence:** HIGH — all recommendations verified against git 2.52.0 man pages and local testing

## Recommendation

**Use a shell script (bash) orchestrated from a Node.js wrapper, not a pure Node.js implementation.** The core logic is a sequence of git CLI commands. Node.js adds value only for commit classification logic and integration with GSD's slash command system.

## Recommended Stack

### Core: Git Porcelain + Plumbing Commands

All commands verified against git 2.52.0 installed locally. Confidence: HIGH.

| Command | Purpose | Why This Command |
|---------|---------|------------------|
| `git rev-list base..HEAD` | List commits in range | Standard way to enumerate commits between two refs. Returns SHAs in reverse chronological order. |
| `git diff-tree --no-commit-id --name-only -r <sha>` | List files changed by a commit | Plumbing command, machine-readable output, no pagination. More reliable than `git show --stat`. |
| `git diff-tree --no-commit-id --name-status -r <sha>` | List files with status (A/M/D) | Needed to handle Added vs Modified vs Deleted .planning/ files differently during split. |
| `git diff-tree --no-commit-id --name-only -r <sha> -- '.planning/'` | Files in .planning/ changed by commit | Pathspec filtering — verified working. Returns only .planning/ paths. |
| `git diff-tree --no-commit-id --name-only -r <sha> -- ':!.planning/'` | Files outside .planning/ changed by commit | Pathspec negation — verified working. Returns empty if commit only touched .planning/. |
| `git cherry-pick -n <sha>` | Apply commit without committing | `-n`/`--no-commit` applies changes to index + worktree but doesn't create a commit. Essential for split operation. |
| `git cherry-pick <sha>` | Apply commit with auto-commit | Used for code-only commits (no splitting needed). Preserves original message. |
| `git reset HEAD -- .planning/` | Unstage .planning/ changes | After `cherry-pick -n`, this unstages .planning/ changes while keeping code changes staged. |
| `git checkout HEAD -- .planning/` | Revert .planning/ working tree changes | After unstaging, this reverts the .planning/ working tree to the PR branch's state (not the source commit's state). |
| `git clean -fd .planning/` | Remove untracked .planning/ files | For commits that Added new .planning/ files — `checkout HEAD` won't clean untracked files, `git clean` will. |
| `git commit -C <sha>` | Commit with reused message+author+timestamp | Preserves the original commit's message, author, and timestamp. Essential for maintaining attribution. |
| `git log --format='%H %P' <range>` | Get commit SHAs with parents | Detect merge commits (multiple parent SHAs). Used to skip or handle merges. |
| `git checkout -b <branch> <base>` | Create PR branch from base | Creates the clean branch starting from the merge-base with the target branch. |
| `git merge-base <branch1> <branch2>` | Find common ancestor | Determines where to start the PR branch — the point where the working branch diverged from the target. |
| `git branch -D <branch>` | Delete local branch | For re-runs: delete old PR branch before recreating. |
| `git diff --quiet` | Check for uncommitted changes | Exit code 0 = clean, 1 = dirty. Pre-flight check before operations. |

### Orchestration Layer: Node.js with child_process

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Node.js `child_process.execSync` | Built-in (Node >= 16.7) | Execute git commands | Zero-dependency, already used in GSD hooks. `execSync` is synchronous which matches the sequential nature of git operations. |
| Node.js `child_process.spawnSync` | Built-in (Node >= 16.7) | Execute git commands with streaming | Better for commands that may produce large output. Already used in existing hooks. |

**Rationale for Node.js orchestration over pure bash:**

1. **Commit classification logic** (pure planning / mixed / code-only) involves string parsing of file lists — cleaner in JS than bash arrays
2. **GSD integration** requires Node.js for the slash command wrapper layer anyway
3. **Error handling** — Node.js try/catch is more robust than bash `set -e` + trap for complex multi-step operations
4. **Cross-platform** — While git itself is cross-platform, bash scripts have portability issues (macOS ships bash 3.2 due to GPL licensing)
5. **Re-run detection** (does the PR branch already exist? is it up-to-date?) is state logic better suited to JS

**Rationale against pure bash:**

- macOS ships bash 3.2 (2007, pre-associative-arrays) due to GPLv3 licensing. Would need to target sh/POSIX or require bash 4+.
- The project already uses Node.js `child_process` in hooks — this is the established pattern.

### Slash Command Layer: Markdown-as-Code

| Technology | Purpose | Why |
|------------|---------|-----|
| Markdown command file | `/gsd:pr-branch` slash command | Follows existing GSD pattern (`commands/gsd/*.md`). Orchestrates the Node.js script. |

## Approach Comparison: How to Filter Commits

### ✅ RECOMMENDED: Cherry-Pick with Split

**Approach:** Iterate over commits in the source branch, classify each, and selectively cherry-pick onto a new branch.

**Algorithm:**
```
1. base = git merge-base main working-branch
2. commits = git rev-list --reverse base..working-branch  (oldest first)
3. git checkout -b pr-branch base
4. For each commit:
   a. planning_files = git diff-tree ... <sha> -- '.planning/'
   b. code_files = git diff-tree ... <sha> -- ':!.planning/'
   c. If only planning_files → SKIP (pure planning commit)
   d. If only code_files → git cherry-pick <sha> (straight cherry-pick)
   e. If both → SPLIT:
      i.   git cherry-pick -n <sha>
      ii.  git reset HEAD -- .planning/
      iii. git checkout HEAD -- .planning/ (for modified/deleted)
      iv.  git clean -fd .planning/ (for newly added)
      v.   git commit -C <sha>
```

**Strengths:**
- Preserves individual commit history (not squashing)
- Handles all three commit types cleanly
- Each operation uses well-understood git commands
- Cherry-pick handles rename detection, binary files, etc.
- Conflict detection is built into cherry-pick

**Weaknesses:**
- Sequential (one commit at a time) — but branch filtering is inherently sequential
- Conflicts possible if .planning/ changes interleave with code changes (rare in practice)

**Confidence:** HIGH — all git commands verified locally against git 2.52.0 man pages

### ❌ NOT RECOMMENDED: git filter-branch

**What it does:** Rewrites entire branch history through filters.

**Why not:**
1. **Officially deprecated** by git itself — the git 2.52.0 man page opens with a WARNING section recommending `git filter-repo` instead
2. **Overkill** — designed for permanent history rewriting (removing secrets, changing emails). We need a new branch with selected commits, not rewriting the source branch.
3. **Abysmal performance** — git's own documentation calls it out
4. **Dangerous** — modifies refs, can corrupt history if misused
5. **Wrong mental model** — we don't want to rewrite the working branch, we want to create a NEW branch with filtered content

**Confidence:** HIGH — verified via `git help filter-branch` which shows the deprecation warning

### ❌ NOT RECOMMENDED: git filter-repo

**What it does:** Modern replacement for filter-branch. Python-based tool for history rewriting.

**Why not:**
1. **External dependency** — not bundled with git (verified: `which git-filter-repo` returns "not found" locally). Would need `pip install` or `brew install`.
2. **Still overkill** — same "rewrite history" mental model as filter-branch. We want a new branch, not a rewritten one.
3. **Violates zero-dependency constraint** — GSD has zero runtime dependencies. Adding a Python dependency is a non-starter.
4. **Wrong tool** — filter-repo is for "remove this file from ALL history." We need "create a branch with some commits excluded."

**Confidence:** HIGH — verified not installed; conceptual mismatch confirmed by git docs

### ❌ NOT RECOMMENDED: git rebase --exec

**What it does:** Runs a command after each commit during an interactive rebase.

**Why not:**
1. **Requires interactive mode** — `git rebase -i` is interactive and not scriptable from `child_process`
2. **Rewrites the source branch** — rebase modifies the branch in-place, we need a separate branch
3. **Complex conflict handling** — rebase conflicts in automated context are hard to handle

**Confidence:** HIGH — verified via `git help rebase`

### ❌ NOT RECOMMENDED: git format-patch + git am

**What it does:** Export commits as patch files, then apply them selectively.

**Why not:**
1. **Unnecessary indirection** — cherry-pick does the same thing without the file I/O
2. **Splitting mixed commits** requires the same cherry-pick -n approach anyway
3. **Patch application can fail** on binary files or renames that cherry-pick handles natively

**Confidence:** MEDIUM — format-patch works but cherry-pick is strictly simpler for this use case

### ❌ NOT RECOMMENDED: Node.js git libraries (isomorphic-git, nodegit, simple-git)

| Library | Why Not |
|---------|---------|
| `isomorphic-git` | Pure JS git implementation — massive dependency, doesn't support all git features needed (cherry-pick is limited) |
| `nodegit` | libgit2 bindings — native compilation, heavy dependency, project is zero-dependency |
| `simple-git` | Wrapper around git CLI — adds dependency for what `execSync` already does |

**Confidence:** HIGH — violates zero-dependency constraint; `execSync('git ...')` is simpler and already established

## What NOT to Use

| Technology | Why Not |
|------------|---------|
| `git filter-branch` | Officially deprecated, dangerous, wrong mental model |
| `git filter-repo` | External Python dependency, overkill for this use case |
| `isomorphic-git` / `nodegit` / `simple-git` | Violates zero-dependency constraint |
| Pure bash script | macOS bash 3.2 portability issues, weaker error handling |
| `git rebase -i --exec` | Interactive, modifies source branch, hard to automate |
| `git diff ... | git apply` | Doesn't handle binary files, renames, or file deletions properly |

## Critical Git Commands Reference

### Classifying a Commit

```bash
# Get all files changed by a commit
git diff-tree --no-commit-id --name-only -r $SHA

# Get only .planning/ files changed
git diff-tree --no-commit-id --name-only -r $SHA -- '.planning/'

# Get only non-.planning/ files changed
git diff-tree --no-commit-id --name-only -r $SHA -- ':!.planning/'

# Get file statuses (A=added, M=modified, D=deleted)
git diff-tree --no-commit-id --name-status -r $SHA
```

**Classification logic:**
```
planning_files = diff-tree ... -- '.planning/'
code_files = diff-tree ... -- ':!.planning/'

if planning_files && !code_files → PURE_PLANNING (skip)
if !planning_files && code_files → CODE_ONLY (cherry-pick directly)
if planning_files && code_files → MIXED (needs splitting)
if !planning_files && !code_files → EMPTY (skip — shouldn't happen)
```

### Splitting a Mixed Commit

```bash
# 1. Apply commit without creating a commit
git cherry-pick -n $SHA

# 2. Unstage .planning/ changes
git reset HEAD -- .planning/

# 3. Revert .planning/ changes in working tree
git checkout HEAD -- .planning/     # handles modified/deleted files
git clean -fd .planning/            # removes newly added files

# 4. Commit with original message and attribution
git commit -C $SHA
```

### Detecting Merge Commits

```bash
# Merge commits have >1 parent
PARENTS=$(git log --format='%P' -1 $SHA)
PARENT_COUNT=$(echo $PARENTS | wc -w)
if [ $PARENT_COUNT -gt 1 ]; then
  echo "Merge commit — skip or handle specially"
fi
```

### Re-run Detection

```bash
# Check if PR branch already exists
git rev-parse --verify pr-branch 2>/dev/null && echo "EXISTS" || echo "NEW"

# Delete and recreate for re-runs
git branch -D pr-branch 2>/dev/null
git checkout -b pr-branch $(git merge-base main working-branch)
```

## Node.js Implementation Pattern

```javascript
const { execSync } = require('child_process');

function git(cmd) {
  return execSync(`git ${cmd}`, { encoding: 'utf8' }).trim();
}

function getChangedFiles(sha, pathspec = '') {
  const cmd = `diff-tree --no-commit-id --name-only -r ${sha}${pathspec ? ` -- '${pathspec}'` : ''}`;
  const output = git(cmd);
  return output ? output.split('\n') : [];
}

function classifyCommit(sha) {
  const planningFiles = getChangedFiles(sha, '.planning/');
  const codeFiles = getChangedFiles(sha, ':!.planning/');
  
  if (planningFiles.length > 0 && codeFiles.length === 0) return 'PURE_PLANNING';
  if (planningFiles.length === 0 && codeFiles.length > 0) return 'CODE_ONLY';
  if (planningFiles.length > 0 && codeFiles.length > 0) return 'MIXED';
  return 'EMPTY';
}
```

**This follows GSD conventions:**
- CommonJS (`require`)
- `execSync` from `child_process` (already used in hooks)
- camelCase functions
- Zero external dependencies

## Installation

```bash
# No installation needed — zero dependencies
# Uses only Node.js built-ins and system git
```

## Sources

All findings verified locally against installed tools:

- `git version 2.52.0` — all commands tested via `git help <command>` and local execution
- `git help cherry-pick` — verified `-n`/`--no-commit` flag, `-C` message reuse (**HIGH confidence**)
- `git help diff-tree` — verified `--name-only`, `--name-status`, pathspec filtering (**HIGH confidence**)
- `git help filter-branch` — verified deprecation WARNING in man page (**HIGH confidence**)
- `git help rev-list` — verified range syntax for commit enumeration (**HIGH confidence**)
- `git help reset` — verified pathspec support for selective unstaging (**HIGH confidence**)
- `git help restore` — verified `--staged --worktree` flags for file restoration (**HIGH confidence**)
- `git help commit` — verified `-C` flag for message/author/timestamp reuse (**HIGH confidence**)
- `git help clean` — verified `-fd` for removing untracked files and directories (**HIGH confidence**)
- `node -e "require('child_process').execSync('git --version')"` — verified Node.js→git integration (**HIGH confidence**)
- Existing GSD codebase: `hooks/gsd-check-update.js` uses `spawn` from `child_process` (**HIGH confidence**)
- Existing GSD codebase: `bin/install.js` uses `execSync` from `child_process` (**HIGH confidence**)
- `git filter-repo` — verified NOT installed (`which git-filter-repo` returns not found)
- macOS bash version: 3.2 (GPLv3 licensing constraint — verified common knowledge, **MEDIUM confidence** on exact version)

---

*Stack research: 2026-02-06*
