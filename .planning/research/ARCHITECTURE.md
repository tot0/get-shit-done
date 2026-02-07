# Architecture Patterns

**Domain:** Git commit filtering pipeline for PR branch creation
**Researched:** 2026-02-06
**Confidence:** HIGH (based on direct codebase analysis + verified git primitives)

## System Overview

The PR branch filter is a **commit processing pipeline** that transforms a working branch (with planning commits interleaved) into a clean PR branch (code-only commits preserved individually). It operates as a read-only consumer of the working branch — it never modifies the source, only creates/updates a derived output branch.

The pipeline has four distinct stages, each with a clear input/output contract:

```
Working Branch (source, never modified)
    │
    ├─ 1. DISCOVERY: Find divergence point, enumerate commits
    │     Input:  branch name, base branch name
    │     Output: ordered list of commit SHAs since divergence
    │
    ├─ 2. CLASSIFICATION: Categorize each commit
    │     Input:  list of commit SHAs
    │     Output: classified commits (planning-only | code-only | mixed)
    │
    ├─ 3. TRANSFORMATION: Split mixed commits, drop planning-only
    │     Input:  classified commits
    │     Output: sequence of "clean" commits (code changes only)
    │
    └─ 4. APPLICATION: Build the filtered branch
          Input:  sequence of clean commits + target branch name
          Output: PR branch with code-only commit history
```

## Recommended Architecture

### Component Boundaries

| Component | Responsibility | Communicates With | Implementation |
|-----------|---------------|-------------------|----------------|
| **CLI Entry Point** | Parse args, validate state, invoke pipeline | Pipeline Orchestrator | `bin/gsd-pr-branch.js` (standalone) + `commands/gsd/pr-branch.md` (slash command) |
| **Pipeline Orchestrator** | Sequence the 4 stages, handle errors, report results | All pipeline stages | Core JS module |
| **Branch Resolver** | Find merge-base, enumerate commits on branch | Git (via child_process) | Pure function: `(currentBranch, baseBranch) → { mergeBase, commits[] }` |
| **Commit Classifier** | Inspect each commit's changed files, classify | Git (via child_process) | Pure function: `(commitSHA) → { type, planningFiles[], codeFiles[] }` |
| **Commit Splitter** | For mixed commits, produce a code-only patch | Git (via child_process) | Pure function: `(commitSHA, codeFiles[]) → patch` |
| **Branch Builder** | Create/reset PR branch, apply clean commits | Git (via child_process) | Stateful: manages branch lifecycle |
| **Git Adapter** | Thin wrapper around `child_process.execSync` for git | OS | Shared utility, all components use it |
| **Hook (optional)** | Auto-trigger pipeline on post-commit/post-push | Pipeline Orchestrator | `hooks/gsd-pr-sync.js` |

### Component Dependency Graph

```
CLI Entry Point
    │
    ▼
Pipeline Orchestrator
    │
    ├──▶ Branch Resolver ──▶ Git Adapter
    │
    ├──▶ Commit Classifier ──▶ Git Adapter
    │
    ├──▶ Commit Splitter ──▶ Git Adapter
    │
    └──▶ Branch Builder ──▶ Git Adapter
```

**Key property:** Every pipeline stage depends only on the Git Adapter, not on each other. The Orchestrator sequences them and passes data between stages. This makes each stage independently testable and replaceable.

## Data Flow

### Stage 1: Branch Resolution

```
Input:  workingBranch = "feat/my-feature"
        baseBranch = "main" (or auto-detected)

Git operations:
  git merge-base main feat/my-feature  →  abc123 (divergence point)
  git rev-list abc123..feat/my-feature  →  [sha1, sha2, sha3, ...] (oldest first)

Output: {
  mergeBase: "abc123",
  commits: ["sha1", "sha2", "sha3", ...]  // chronological order
}
```

**Why `git merge-base` + `git rev-list`:** This is the canonical git approach for "commits on this branch since it diverged from base." It handles rebases, merges, and force-pushes correctly. Using `git log base..HEAD` is equivalent but rev-list is more scriptable.

**Base branch detection:** Check for `main`, then `master`, then the branch's upstream tracking branch. Allow explicit override via CLI arg.

### Stage 2: Commit Classification

For each commit SHA, inspect the files changed:

```
Input:  commitSHA = "sha1"

Git operation:
  git diff-tree --no-commit-id -r --name-only sha1
  → [".planning/phases/01/01-01-PLAN.md",
     "src/api/auth.ts",
     "src/types/user.ts"]

Classification logic:
  planningFiles = files.filter(f => f.startsWith('.planning/'))
  codeFiles = files.filter(f => !f.startsWith('.planning/'))

  if (codeFiles.length === 0)     → "planning-only"  (DROP)
  if (planningFiles.length === 0) → "code-only"       (KEEP as-is)
  else                            → "mixed"           (SPLIT)

Output: {
  sha: "sha1",
  type: "mixed",
  planningFiles: [".planning/phases/01/01-01-PLAN.md"],
  codeFiles: ["src/api/auth.ts", "src/types/user.ts"],
  message: "feat(01-01): create user auth endpoint",
  author: "Dev <dev@example.com>",
  date: "2026-02-06T10:00:00"
}
```

**Why `.planning/` prefix check is sufficient:** The PROJECT.md explicitly standardizes on `.planning/` as the only planning file location. This is listed in Out of Scope: "Supporting non-`.planning/` planning file locations — standardized on `.planning/`."

**Preserving commit metadata:** The classifier extracts author, date, and message alongside the file classification. This metadata must be preserved when splitting mixed commits so the code-only version retains proper attribution.

### Stage 3: Commit Transformation

Three paths based on classification:

```
planning-only → DROPPED (not included in output sequence)

code-only → PASSED THROUGH (cherry-pick directly)

mixed → SPLIT:
  1. Generate a patch containing only code file changes:
     git diff-tree -p sha1 -- src/api/auth.ts src/types/user.ts
     (produces a patch that excludes .planning/ file changes)

  2. Package as a "synthetic commit" descriptor:
     {
       type: "split",
       originalSha: "sha1",
       patch: <diff content>,
       message: "feat(01-01): create user auth endpoint",
       author: "Dev <dev@example.com>",
       authorDate: "2026-02-06T10:00:00"
     }
```

**Why `git diff-tree -p` with explicit paths:** This is the most reliable way to get a patch for a subset of a commit's changes. It works even for merge commits and produces a clean, applicable patch. Alternative approaches like `git format-patch` + manual editing are more fragile.

### Stage 4: Branch Application

Build the filtered branch from the transformation output:

```
Input: transformedCommits = [
  { type: "cherry-pick", sha: "sha2" },        // code-only: cherry-pick directly
  { type: "split", patch: ..., message: ... },  // mixed: apply patch as new commit
  { type: "cherry-pick", sha: "sha5" },         // code-only
]

Process:
  1. Create or reset the PR branch:
     git checkout -B feat/my-feature-pr abc123  (start from merge-base)

  2. For each transformed commit (in order):
     - cherry-pick: git cherry-pick sha2
     - split: git apply patch && git add . && git commit (with preserved metadata)

  3. Return to original branch:
     git checkout feat/my-feature

Output: {
  prBranch: "feat/my-feature-pr",
  totalCommits: 10,
  kept: 5,
  dropped: 3,
  split: 2
}
```

**Why start from merge-base:** Starting the PR branch from the same divergence point as the working branch ensures the PR diff against base is exactly the code changes — no extra context, no missing context.

**Why `cherry-pick` for code-only (not `format-patch`):** Cherry-pick preserves the full commit object — author, committer, date, message, and parent relationship. It's the simplest correct approach for commits that need no modification. If it conflicts, that's a signal of a real problem (dropped planning commit had code dependencies), which should fail loudly.

**Why `git apply` for split commits (not `cherry-pick` with path filter):** Git doesn't support `cherry-pick --paths`. The clean approach is to apply a pre-extracted patch. `git apply` is designed for this — it applies a diff without creating a commit, giving us control over commit metadata.

## Integration with Existing GSD Architecture

### Where This Fits

The PR branch filter is a **new tool category** in GSD — it's the first component that is both an AI-invokable slash command AND a standalone developer CLI tool. This dual-use pattern requires careful integration:

```
Existing GSD Architecture:
┌─────────────────────────────────────────────────┐
│  Layer 1: Commands (commands/gsd/*.md)          │
│  Layer 2: Workflows (get-shit-done/workflows/)  │
│  Layer 3: Agents (agents/gsd-*.md)              │
│  Layer 4: Templates (get-shit-done/templates/)  │
│  Layer 5: References (get-shit-done/references/)│
│  Layer 6: Hooks (hooks/gsd-*.js)                │
│  Layer 7: Installer (bin/install.js)            │
└─────────────────────────────────────────────────┘

NEW: PR Branch Filter additions:
┌─────────────────────────────────────────────────┐
│  bin/gsd-pr-branch.js      ← standalone CLI     │
│  commands/gsd/pr-branch.md ← slash command       │
│  hooks/gsd-pr-sync.js     ← optional auto-sync  │
│  bin/install.js            ← modified (new hook) │
│  scripts/build-hooks.js   ← modified (new hook) │
└─────────────────────────────────────────────────┘
```

### Integration Points

**1. Slash Command (`commands/gsd/pr-branch.md`)**

The slash command wraps the standalone tool. It reads the pipeline from `bin/gsd-pr-branch.js` (or a shared lib module) and presents results using GSD's UI patterns (stage banners, offer_next routing).

```yaml
---
name: gsd:pr-branch
description: Create/update a filtered PR branch without planning files
argument-hint: "[base-branch]"
allowed-tools:
  - Read
  - Bash
  - Write
---
```

The slash command invokes the pipeline via `Bash` tool:
```bash
node ~/.claude/bin/gsd-pr-branch.js --base main
```

This is simpler than embedding pipeline logic in the markdown prompt. The command file handles presentation; the JS file handles logic.

**2. Standalone CLI (`bin/gsd-pr-branch.js`)**

Developers invoke directly from terminal:
```bash
npx gsd-pr-branch              # auto-detect base branch
npx gsd-pr-branch --base main  # explicit base
npx gsd-pr-branch --dry-run    # show what would happen
```

Must follow existing conventions:
- CommonJS (`require()`, not `import`)
- Zero external dependencies (only Node.js builtins + child_process for git)
- `#!/usr/bin/env node` shebang
- Same ANSI color scheme as `bin/install.js`
- Silent failure for non-critical issues, loud failure for data integrity issues

**3. Hook (`hooks/gsd-pr-sync.js`)**

Optional post-commit hook that auto-triggers the pipeline:
- Follows existing hook patterns (read from stdin, silent error handling)
- Registered via `bin/install.js` the same way `gsd-check-update.js` is registered
- Added to `scripts/build-hooks.js` HOOKS_TO_COPY array
- Configurable via `.planning/config.json` (new `pr_branch.auto_sync` boolean)

**4. Config Integration**

New config section in `.planning/config.json`:
```json
{
  "pr_branch": {
    "enabled": true,
    "base_branch": "main",
    "suffix": "-pr",
    "auto_sync": false
  }
}
```

Follows existing config patterns: grep-based parsing (regrettable but consistent), with fallback defaults.

**5. Installer Updates (`bin/install.js`)**

- Add `gsd-pr-branch.js` to the `bin` section in `package.json` for npx access
- Add `gsd-pr-sync.js` to hook copying in the installer
- Register the hook in settings.json under a new event type (or PostCommit if supported)

### File Locations (following existing conventions)

| New File | Location | Convention Source |
|----------|----------|-------------------|
| `bin/gsd-pr-branch.js` | `bin/` | Same as `bin/install.js` (CLI entry point) |
| `commands/gsd/pr-branch.md` | `commands/gsd/` | Same as all slash commands |
| `hooks/gsd-pr-sync.js` | `hooks/` | Same as `gsd-statusline.js`, `gsd-check-update.js` |

## Patterns to Follow

### Pattern 1: Pipeline with Pure Stage Functions

**What:** Each pipeline stage is a pure function that takes data in and returns data out, with git commands as the only side effect (reads in stages 1-3, writes only in stage 4).

**When:** Always. This is the core architectural pattern.

**Why:** Pure functions are testable without git repos (mock the Git Adapter). The pipeline can be dry-run by skipping stage 4. Stages can be run independently for debugging.

**Example:**
```javascript
// Each stage is a function with a clear contract
function resolveCommits(gitAdapter, currentBranch, baseBranch) {
  const mergeBase = gitAdapter.mergeBase(baseBranch, currentBranch);
  const shas = gitAdapter.revList(`${mergeBase}..${currentBranch}`);
  return { mergeBase, commits: shas };
}

function classifyCommit(gitAdapter, sha) {
  const files = gitAdapter.diffTreeNameOnly(sha);
  const planningFiles = files.filter(f => f.startsWith('.planning/'));
  const codeFiles = files.filter(f => !f.startsWith('.planning/'));
  // ... return classification
}

// Orchestrator sequences them
function runPipeline(gitAdapter, currentBranch, baseBranch) {
  const { mergeBase, commits } = resolveCommits(gitAdapter, currentBranch, baseBranch);
  const classified = commits.map(sha => classifyCommit(gitAdapter, sha));
  const transformed = classified.flatMap(c => transformCommit(gitAdapter, c));
  return buildBranch(gitAdapter, transformed, mergeBase, targetBranch);
}
```

### Pattern 2: Git Adapter (Thin Shell Wrapper)

**What:** A single module that wraps all `child_process.execSync` calls to git, providing typed returns and consistent error handling.

**When:** Every git operation goes through this adapter. No raw `execSync` calls scattered in pipeline stages.

**Why:** 
- Single point for error handling (git command failures)
- Single point for dry-run mode (log command instead of executing)
- Testable (mock the adapter, not child_process)
- Consistent encoding/trimming of git output

**Example:**
```javascript
class GitAdapter {
  constructor(options = {}) {
    this.cwd = options.cwd || process.cwd();
    this.dryRun = options.dryRun || false;
  }

  exec(args) {
    const cmd = `git ${args}`;
    if (this.dryRun && this.isWrite(args)) {
      console.log(`[dry-run] ${cmd}`);
      return '';
    }
    return execSync(cmd, { cwd: this.cwd, encoding: 'utf8' }).trim();
  }

  mergeBase(a, b) { return this.exec(`merge-base ${a} ${b}`); }
  revList(range) { return this.exec(`rev-list ${range}`).split('\n').filter(Boolean); }
  diffTreeNameOnly(sha) { return this.exec(`diff-tree --no-commit-id -r --name-only ${sha}`).split('\n').filter(Boolean); }
  cherryPick(sha) { return this.exec(`cherry-pick ${sha}`); }
  // ...
}
```

### Pattern 3: Fail Loudly on Conflicts

**What:** When a cherry-pick or patch application fails (conflict), stop the pipeline immediately and report exactly what happened, which commit caused it, and why.

**When:** Any git operation in Stage 4 (Branch Application) encounters a conflict or error.

**Why:** Silent continuation could produce a broken branch missing critical commits. The user needs to know so they can manually resolve. This is explicitly called out in the project requirements.

**Example:**
```javascript
function applyCommit(gitAdapter, commit) {
  try {
    if (commit.type === 'cherry-pick') {
      gitAdapter.cherryPick(commit.sha);
    } else {
      gitAdapter.apply(commit.patch);
      gitAdapter.commitWithMetadata(commit.message, commit.author, commit.authorDate);
    }
  } catch (err) {
    // Abort the cherry-pick to leave repo clean
    gitAdapter.exec('cherry-pick --abort');
    // Return to working branch
    gitAdapter.exec(`checkout ${workingBranch}`);
    throw new PipelineError(
      `Conflict applying commit ${commit.originalSha}: ${commit.message}\n` +
      `This usually means a dropped planning commit contained code dependencies.\n` +
      `Resolution: Manually restructure the commit on your working branch.`
    );
  }
}
```

### Pattern 4: Idempotent Re-runs

**What:** Running the pipeline again produces the same result, and running it after new commits on the working branch updates the PR branch correctly.

**When:** Every invocation.

**Why:** The tool must support "fix review feedback, re-run" workflow. Starting from merge-base each time (rather than trying to incrementally update) is simpler and guarantees correctness.

**Implementation:** Always `git checkout -B` (force-create) the PR branch from the merge-base. This replaces the old PR branch entirely. Simple, correct, idempotent. The tradeoff is re-processing all commits each time, but branch histories are typically <100 commits, so this completes in seconds.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Incremental PR Branch Updates

**What:** Trying to detect "what's new since last sync" and only processing new commits on the working branch.

**Why bad:** Fragile. If the working branch was rebased, or commits were amended, the incremental approach misses changes or double-applies commits. The mapping between working branch commits and PR branch commits becomes a maintenance nightmare.

**Instead:** Rebuild the PR branch from scratch each time. Start from merge-base, process all commits. This is simple, correct, and fast enough for typical branch sizes (<100 commits).

### Anti-Pattern 2: Modifying the Working Branch

**What:** Rewriting working branch history to separate planning commits.

**Why bad:** Destructive. Changes commit SHAs. Breaks force-push safety. The user explicitly wants their working branch untouched — the PR branch is a read-only derivative.

**Instead:** The PR branch is always derived, never merged back. The working branch is the source of truth.

### Anti-Pattern 3: Using `.gitattributes` or `.gitignore` for Filtering

**What:** Trying to use git's built-in mechanisms to hide `.planning/` files from diffs or commits.

**Why bad:** `.gitignore` prevents tracking (but files are already tracked). `.gitattributes` with `export-ignore` only affects `git archive`, not branches. Neither produces a clean commit history — they just hide files from view while they remain in the tree.

**Instead:** Build a genuinely separate branch with genuinely separate commits that don't contain planning files.

### Anti-Pattern 4: Squashing Commits on the PR Branch

**What:** Combining all code commits into a single squash commit on the PR branch.

**Why bad:** Loses the granular per-task commit history that GSD carefully creates. The project requirements explicitly state: "Preservation of individual code commit history (cherry-pick style, not squash)."

**Instead:** Cherry-pick or apply each code commit individually, preserving the one-commit-per-task structure.

### Anti-Pattern 5: Shell Script Implementation

**What:** Implementing the pipeline as a bash script.

**Why bad:** The existing GSD toolkit is Node.js CommonJS. A shell script would be a different runtime, different error handling patterns, different testing approach, and different cross-platform story. Shell scripts also can't participate in the installer's file copying and hook registration system.

**Instead:** Node.js CommonJS, consistent with `bin/install.js`, `hooks/*.js`, and `scripts/*.js`. Use `child_process.execSync` for git commands (same pattern as `hooks/gsd-check-update.js`).

## Suggested Build Order

Build order follows the dependency graph — each stage is usable and testable before the next is built.

### Phase 1: Git Adapter + Branch Resolution (Foundation)

Build the Git Adapter wrapper and the Branch Resolver. These are the lowest-level components with no dependencies on other pipeline stages.

**Delivers:** Can enumerate commits on a branch since divergence from base. Testable independently.

**Why first:** Every other component depends on the Git Adapter. Branch resolution is the simplest stage and validates the overall git plumbing approach.

### Phase 2: Commit Classification

Build the Commit Classifier. Takes commit SHAs (from Phase 1 output) and categorizes them.

**Delivers:** Can analyze a branch and report: "N planning-only, M code-only, K mixed commits." This is already useful as a diagnostic tool even without the rest of the pipeline.

**Why second:** Classification is pure logic over git reads. No writes, no side effects on the repo. Can be tested with real repos.

### Phase 3: Commit Splitting + Branch Building

Build the Commit Splitter and Branch Builder together. These are the "write" side of the pipeline.

**Delivers:** Full pipeline — can create a filtered PR branch. End-to-end functionality.

**Why together:** The splitter's output format is dictated by what the builder can consume. Designing them together avoids format mismatches.

### Phase 4: CLI Entry Point + Slash Command

Build the standalone CLI tool and the GSD slash command wrapper.

**Delivers:** User-facing tool, invokable from terminal or AI agent.

**Why last:** The pipeline must work before wrapping it in user interfaces. The CLI is thin — arg parsing + pipeline invocation + result formatting.

### Phase 5: Hook + Installer Integration

Build the auto-sync hook and update the installer to register it.

**Delivers:** Optional auto-sync on commit/push.

**Why last:** This is an enhancement, not core functionality. The tool must work on-demand before adding automation. Also requires understanding the hook event model (PostCommit vs PostPush) which may need experimentation.

## Scalability Considerations

| Concern | Typical (10-50 commits) | Large (100-500 commits) | Extreme (1000+ commits) |
|---------|------------------------|------------------------|------------------------|
| Pipeline runtime | <2 seconds | 5-15 seconds | 30-60 seconds |
| Cherry-pick conflicts | Rare | Possible | Likely |
| Memory (patch content) | Negligible | <10MB | May need streaming |
| Git operations | N×3 calls | N×3 calls | Consider batching |

**Practical note:** GSD projects typically have 2-4 commits per plan, 2-5 plans per phase, and 5-10 phases per milestone. A full milestone is ~50-200 commits. A single branch for PR would typically be 10-50 commits from a few phases. The "rebuild from scratch" approach is well within acceptable performance for this scale.

**If performance becomes an issue:** The Git Adapter pattern makes it straightforward to batch operations (e.g., `git diff-tree --stdin` reads multiple SHAs from stdin) without changing the pipeline stages.

## Sources

- **Codebase analysis (HIGH confidence):** Direct reading of all files in the GSD repository — `bin/install.js`, `hooks/*.js`, `scripts/build-hooks.js`, `commands/gsd/*.md`, `.planning/codebase/ARCHITECTURE.md`, `.planning/codebase/STRUCTURE.md`, `.planning/codebase/CONVENTIONS.md`, `.planning/codebase/INTEGRATIONS.md`, `.planning/codebase/STACK.md`, `.planning/codebase/CONCERNS.md`, `.planning/PROJECT.md`
- **Git primitives (HIGH confidence):** `git merge-base`, `git rev-list`, `git diff-tree`, `git cherry-pick`, `git apply` — verified available on system (git 2.52.0). These are stable, long-standing git commands.
- **GSD conventions (HIGH confidence):** Naming patterns, hook registration, installer structure, config.json schema — all derived from reading existing source code.

---

*Architecture research: 2026-02-06*
