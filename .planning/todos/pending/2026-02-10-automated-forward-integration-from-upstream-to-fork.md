---
created: 2026-02-10T19:21:22.750Z
title: Automated forward-integration from upstream to fork
area: tooling
files:
  - get-shit-done/bin/gsd-tools.js
  - bin/install.js
---

## Problem

When maintaining a fork with custom features (e.g., `pr-branch` on `lupickup/get-shit-done` while upstream `glittercowboy/get-shit-done` continues evolving), forward-integrating upstream changes is a recurring manual chore:

1. `git fetch upstream` → `git merge upstream/main` or `git rebase upstream/main`
2. Resolve conflicts (especially in frequently-modified files like `gsd-tools.js`, `install.js`, `README.md`, `CHANGELOG.md`)
3. Verify custom features still work after integration
4. Repeat every time upstream ships a release

This gets worse with multiple custom feature branches — each needs independent forward-integration. The friction discourages staying current, leading to drift that makes future integration harder.

**Context from pr-branch-filter milestone:**
- The `pr-branch` tool already understands commit classification and cherry-picking
- The fork may carry features upstream doesn't want (pr-branch, personal workspace tooling)
- Upstream releases are tagged with semver — can use tags as integration points
- Some upstream changes will conflict with fork customizations in predictable files

## Solution

**Automated forward-integration command:** `/gsd:sync-upstream` or `node gsd-tools.js sync-upstream`

**Core flow:**
1. Fetch upstream (configurable remote name, default `upstream`)
2. Detect new upstream tags/commits since last sync (store last-sync marker)
3. Attempt merge/rebase automatically
4. On conflict: classify conflicts by file, auto-resolve where possible (e.g., CHANGELOG — append both), pause for human on genuine conflicts
5. Run verification: `node -c` on JS files, `npm run build:hooks`, any configured test commands
6. Report: what was integrated, what conflicted, what needs manual attention

**Configuration in `.planning/config.json`:**
```json
{
  "upstream": {
    "remote": "upstream",
    "strategy": "merge",
    "auto_resolve": ["CHANGELOG.md"],
    "verify_commands": ["node -c get-shit-done/bin/gsd-tools.js", "npm run build:hooks"],
    "sync_branch": "lupickup/main"
  }
}
```

**Integration with other todos:**
- **Personal dev workspace:** The sync target would be the user's workspace branch, not main directly
- **Multi-milestone:** Sync could trigger automatically when upstream tags a new release (hook/cron)
- **jj bookmarks:** jj's `jj git fetch` + rebase model may handle this more naturally than git

**Key questions for the planner:**
- Merge vs rebase for forward-integration? (Merge preserves fork history, rebase keeps it linear)
- Should this live in `gsd-tools.js` or as a standalone script? (gsd-tools if it's a GSD feature, standalone if it's fork-management)
- How to handle upstream changes that conflict with fork customizations — auto-resolve patterns or always pause?
- Can `pr-branch`'s cherry-pick engine be reused for selective upstream integration (only pick non-conflicting changes)?
