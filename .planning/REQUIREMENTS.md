# Requirements: GSD PR Branch Filter

**Defined:** 2026-02-07
**Core Value:** Developers can use GSD planning freely without worrying about PR pollution — one command produces a clean branch for review.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Commit Filtering

- [ ] **FILT-01**: Tool classifies each commit since branch divergence as planning-only, code-only, or mixed based on whether files in `.planning/` (or configured paths) are touched
- [ ] **FILT-02**: Tool cherry-picks code-only commits onto the PR branch, preserving individual commit history
- [ ] **FILT-03**: Tool detects mixed commits (touching both planning and code files) and warns the user, skipping them by default

### Branch Management

- [ ] **BRCH-01**: Tool derives PR branch name automatically from source branch (e.g. `feature/foo` -> `feature/foo-pr`)
- [ ] **BRCH-02**: Tool never modifies the source/working branch — only creates or updates the derived PR branch
- [ ] **BRCH-03**: Tool performs incremental updates by finding the PR branch HEAD in the source branch history, then cherry-picking only new non-planning commits (stable PR history, no force-push needed)
- [ ] **BRCH-04**: Tool auto-detects the merge base where the feature branch diverged from the main branch (main, master, or configured)
- [ ] **BRCH-05**: Tool warns when PR branch has been pushed to remote and an update will require force-push (fallback rebuild scenario)

### User Experience

- [ ] **UX-01**: Tool supports dry-run mode that previews which commits would be included, excluded, or skipped without modifying any branches
- [ ] **UX-02**: Tool outputs a clear summary after each run showing commits included, excluded, skipped (mixed), and the resulting PR branch name
- [ ] **UX-03**: Tool fails loudly on cherry-pick conflicts — aborts PR branch update, reports the conflicting commit and files, leaves source branch untouched
- [ ] **UX-04**: Tool supports configurable filter paths beyond `.planning/` (e.g. `.notes/`, `TODO.md`) via config

### Integration

- [ ] **INTG-01**: Tool is implemented as a subcommand in `gsd-tools.js` (`node gsd-tools.js pr-branch`)
- [ ] **INTG-02**: Tool is invocable as a GSD slash command (`/gsd-pr-branch`)
- [ ] **INTG-03**: Tool supports auto-sync via post-commit git hook that updates the PR branch after each commit on the source branch
- [ ] **INTG-04**: Tool preserves original commit metadata (author, date, message) for all cherry-picked commits

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Commit Filtering

- **FILT-04**: Tool auto-splits mixed commits — creates a new commit with only code-file changes, preserving metadata
- **FILT-05**: Tool supports `--include-mixed` flag to include mixed commits as-is (with planning files)

### Branch Management

- **BRCH-06**: Tool supports configurable PR branch naming pattern (not just `-pr` suffix)

### Integration

- **INTG-05**: Tool registered as a git alias during GSD installation (`git gsd-pr`)

## Future Vision (Beyond v2)

Stacked PRs via jj — extend the PR branch filter into a full stacked PR workflow:

- **FUTR-01**: Agent workflow uses jj to create bookmarks grouping code commits by GSD phase
- **FUTR-02**: Bookmarks are pushed to GitHub as stacked PRs (one PR per phase)
- **FUTR-03**: Development continues linearly on a single branch; stacking is a read-only view for reviewers
- **FUTR-04**: User has jj research to bring in when this is reached

The current milestone establishes the core primitives (commit classification, cherry-pick engine) that the stacked PR workflow will reuse.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Interactive commit selection | Tool is fully automated — user fixes commits on source branch if they disagree with classification |
| Squash mode | User explicitly wants individual commits preserved |
| PR creation | GitHub CLI (`gh pr create`) handles this; our tool produces the branch |
| History rewriting on source branch | Dangerous — source branch is sacred and read-only |
| Auto-push to remote | Pushing is irreversible; user controls when to push |
| Merge commit handling | GSD uses linear history; tool fails with message to rebase first |
| Complex conflict resolution | Cherry-pick conflicts indicate deep dependencies; user must fix source commits |
| Planning files outside main repo | Acknowledged as potentially better long-term, explicitly deferred |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FILT-01 | Phase 1 | Pending |
| FILT-02 | Phase 2 | Pending |
| FILT-03 | Phase 2 | Pending |
| BRCH-01 | Phase 2 | Pending |
| BRCH-02 | Phase 2 | Pending |
| BRCH-03 | Phase 2 | Pending |
| BRCH-04 | Phase 1 | Pending |
| BRCH-05 | Phase 2 | Pending |
| UX-01 | Phase 1 | Pending |
| UX-02 | Phase 2 | Pending |
| UX-03 | Phase 2 | Pending |
| UX-04 | Phase 1 | Pending |
| INTG-01 | Phase 1 | Pending |
| INTG-02 | Phase 3 | Pending |
| INTG-03 | Phase 3 | Pending |
| INTG-04 | Phase 2 | Pending |

**Coverage:**
- v1 requirements: 16 total
- Mapped to phases: 16
- Unmapped: 0

---
*Requirements defined: 2026-02-07*
*Last updated: 2026-02-07 after roadmap creation*
