# Phase 5: Migration & Workflow Integration - Research

**Researched:** 2026-03-07
**Domain:** Hierarchical workspace migration, write-path integration, and governance artifacts (decisions/deltas/contracts)
**Confidence:** HIGH

## User Constraints

No `*-CONTEXT.md` exists for this phase directory. There are no additional locked user decisions beyond ROADMAP/REQUIREMENTS scope.

## Summary

Phase 5 is the first write-path phase after the resolver foundation shipped in Phase 4. The codebase now has working layout detection and resolver APIs in `core.cjs`, and select read-path commands already consume them. But the migration/write surface is still mostly flat-path-coupled across workflow markdown and several CLI modules (`init`, `milestone`, `verify`, portions of `phase`).

Planning should treat this phase as a coordinated integration pass with four parallel deliverables: (1) add an idempotent migrate command, (2) route write-path workflows through resolver-selected canonical targets, (3) add machine-parseable primitives (`DECISIONS.md`, spec-deltas, contracts), and (4) preserve PR hygiene behavior for nested hierarchical artifacts. The highest risk is partial migration producing mixed layouts where some commands write flat and others read hierarchical.

The existing tests are strong for Phase 4 read behavior but still encode flat assumptions for several commands (notably `init new-milestone` and milestone archive behavior). The plan should explicitly add/adjust tests for flat, hierarchical, and mixed states for every write-path workflow and every new primitive.

**Primary recommendation:** Implement a single migration + artifact-path contract in `core.cjs`/`init.cjs`, then migrate workflow writers and governance artifacts on top of that contract with compatibility tests before adding new behavior.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js runtime | `>=16.7.0` | CLI runtime for `gsd-tools.cjs` | Repo runtime floor in `package.json`; no runtime change needed |
| `fs`/`path` (Node built-ins) | Built-in | Migration moves/copies, existence checks, path normalization | Already used across all command modules |
| Resolver APIs (`resolveLayout`, `resolveArtifactPath`) | In-repo (`core.cjs`) | Canonical path selection + conflict metadata | Existing source of truth from Phase 4 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `node:test` + `assert` | Built-in | CLI behavior and regression tests | All migration/workflow compatibility tests |
| Existing frontmatter utilities | In-repo (`frontmatter.cjs`) | Machine-readable metadata extraction for md artifacts | For stable queue/delta/contract metadata envelopes |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| In-repo resolver + built-ins | New external migration/path library | Unnecessary dependency surface and integration risk |
| Deterministic hierarchical-first in mixed layouts | mtime/newest-wins conflict policy | Non-deterministic and harder to test/debug |
| Markdown artifacts with structured frontmatter/blocks | New DB/state store | Over-scoped for current CLI and workflow architecture |

**Installation:**
```bash
npm test
```

## Architecture Patterns

### Recommended Project Structure
```
get-shit-done/bin/lib/
├── core.cjs          # artifact registry, layout detection, migration orchestration
├── init.cjs          # workflow init payloads with resolver-selected write/read targets
├── milestone.cjs     # archive/new-milestone write behavior (hierarchical-aware)
└── verify.cjs        # health/consistency checks for both layouts + new primitives

get-shit-done/workflows/
├── discuss-phase.md
├── plan-phase.md
├── execute-phase.md
├── verify-work.md
├── new-project.md
├── new-milestone.md
└── complete-milestone.md
```

### Pattern 1: Idempotent Migration Operation Log
**What:** Add one migration command that maps flat artifacts to hierarchical targets and returns structured operations/conflicts without destructive overwrite.
**When to use:** `MIGR-01`/`MIGR-03` implementation and repeated migration runs.
**Example:**
```javascript
// Source: get-shit-done/bin/lib/core.cjs + ROADMAP/REQUIREMENTS migration criteria
const mapping = {
  '.planning/PROJECT.md': '.planning/project/PROJECT.md',
  '.planning/ROADMAP.md': '.planning/workspace/current/ROADMAP.md',
  '.planning/STATE.md': '.planning/workspace/current/STATE.md',
  '.planning/REQUIREMENTS.md': '.planning/workspace/current/REQUIREMENTS.md',
  '.planning/phases': '.planning/workspace/current/phases',
  '.planning/research': '.planning/workspace/current/research'
  // todos remain at .planning/todos
};
```

### Pattern 2: Resolver-Driven Write Targets in Workflow Init
**What:** Workflow agents consume paths emitted by `init` payloads; they do not hardcode `.planning/...` write targets.
**When to use:** discuss/plan/execute/verify/new-project/new-milestone/complete-milestone workflow updates.
**Example:**
```javascript
// Source: get-shit-done/bin/lib/init.cjs
const artifacts = {
  state: resolveArtifactPath(cwd, 'stateFile'),
  roadmap: resolveArtifactPath(cwd, 'roadmapFile'),
  requirements: resolveArtifactPath(cwd, 'requirementsFile'),
  project: resolveArtifactPath(cwd, 'projectFile'),
  phases: resolveArtifactPath(cwd, 'phasesDir')
};
```

### Pattern 3: Queue + Delta + Contract Artifacts as Structured Markdown
**What:** Keep markdown-native artifacts, but enforce machine-parseable metadata and index/entry conventions.
**When to use:** `DEC-01/02`, `DELTA-01/02`, `CONT-01/02`.
**Example:**
```markdown
<!-- Source: .planning/workspace/current/DESIGN-workspace-enhancements.md -->
---
id: DELTA-20260304-2310
scope: phase
phase: "4"
plan: "04-02"
status: open
---
```

### Anti-Patterns to Avoid
- **Flat literals in workflow docs:** hardcoded `.planning/...` writes will bypass resolver and break mixed-layout repos.
- **Migration overwrite semantics:** never overwrite when both flat + hierarchical versions exist; report conflicts.
- **Partial contract migration:** updating `init` paths without updating workflow write/commit globs creates split-brain behavior.
- **Unindexed decision/delta/contract files:** freeform notes are not machine-actionable for planner/verifier.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Path routing per workflow | Ad hoc `.planning/...` string assembly in each workflow | `resolveArtifactPath` + init-emitted paths | Central policy already exists and is tested |
| Migration conflict policy | One-off command-specific precedence logic | Single migration engine + structured conflict list | Ensures idempotency and debuggability |
| Decision/spec feedback tracking | Unstructured bullet lists in STATE.md | Dedicated `DECISIONS.md` + `spec-deltas/` artifacts | Supports linking, propagation, and audits |
| PR artifact filtering for hierarchy | Naive single-level pattern matching | Recursive glob/pathspec semantics (`**`) and explicit tests | Nested hierarchy must still be filtered reliably |

**Key insight:** Phase 5 should compose existing resolver foundations; writing new parallel path logic is regression-prone and unnecessary.

## Common Pitfalls

### Pitfall 1: Mixed-layout write split
**What goes wrong:** Reads come from hierarchical canonical paths, but writes still land in flat roots.
**Why it happens:** Some workflows/modules still hardcode `.planning/ROADMAP.md`, `.planning/phases`, `.planning/milestones`.
**How to avoid:** Add resolver-derived write targets to init outputs and migrate workflow references in one pass.
**Warning signs:** Duplicate artifacts in flat and hierarchical locations after running commands.

### Pitfall 2: False idempotency in migration
**What goes wrong:** Second migration run mutates files again or creates duplicate/moved content unexpectedly.
**Why it happens:** Migration implemented as blind rename without target-exists/conflict checks.
**How to avoid:** Treat each mapping as `noop|moved|copied|conflict`; rerun should produce `noop` for already-migrated state.
**Warning signs:** Diff appears on repeated migrate run with no user edits.

### Pitfall 3: Workflow contract drift (`init` vs markdown)
**What goes wrong:** `init` emits canonical paths, but workflow markdown still references old literals or commit globs.
**Why it happens:** Updating code and workflow docs separately.
**How to avoid:** For each workflow, update init schema + markdown references + tests in the same task.
**Warning signs:** Runtime succeeds in one layout and fails in another, especially around commits.

### Pitfall 4: Namespace drift in archive paths
**What goes wrong:** Some commands still write `.planning/milestones/*` while hierarchy expects `.planning/archive/milestones/*`.
**Why it happens:** Legacy milestone code/test assumptions remain flat.
**How to avoid:** Use `archiveMilestonesDir` resolver artifact in milestone + health/verify paths.
**Warning signs:** Archive files created in both namespaces.

### Pitfall 5: Non-parseable governance artifacts
**What goes wrong:** DECISIONS/deltas/contracts exist but cannot be consumed programmatically.
**Why it happens:** Inconsistent entry format or missing IDs/links/status fields.
**How to avoid:** Enforce required metadata schema and index sections; test parser round-trips.
**Warning signs:** Planner/verifier cannot resolve linked requirement/phase references.

## Code Examples

Verified patterns from current code and design docs:

### Resolver canonical/fallback registry
```javascript
// Source: get-shit-done/bin/lib/core.cjs
const ARTIFACT_REGISTRY = {
  projectFile: { canonical: '.planning/project/PROJECT.md', fallback: '.planning/PROJECT.md' },
  roadmapFile: { canonical: '.planning/workspace/current/ROADMAP.md', fallback: '.planning/ROADMAP.md' },
  stateFile: { canonical: '.planning/workspace/current/STATE.md', fallback: '.planning/STATE.md' },
  requirementsFile: { canonical: '.planning/workspace/current/REQUIREMENTS.md', fallback: '.planning/REQUIREMENTS.md' },
  phasesDir: { canonical: '.planning/workspace/current/phases', fallback: '.planning/phases' },
  archiveMilestonesDir: { canonical: '.planning/archive/milestones', fallback: '.planning/milestones' }
};
```

### Existing mixed-layout expectation (test contract)
```javascript
// Source: tests/init.test.cjs
assert.strictEqual(output.state_path, '.planning/workspace/current/STATE.md');
assert.strictEqual(output.roadmap_path, '.planning/workspace/current/ROADMAP.md');
assert.strictEqual(output.layout_mode, 'ambiguous');
assert.ok(output.layout_conflicts.length > 0);
```

### Current flat-coupled milestone write path to migrate
```javascript
// Source: get-shit-done/bin/lib/milestone.cjs
const archiveDir = path.join(cwd, '.planning', 'milestones');
const phasesDir = path.join(cwd, '.planning', 'phases');
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Flat-only path assumptions across read/write code | Resolver-backed read-path behavior in core/init/phase/roadmap/progress | Phase 4 (verified 2026-03-06) | Foundation exists for write-path migration |
| No layout diagnostics | `none|flat|hierarchical|ambiguous` with confidence/conflicts | Phase 4 | Mixed-state behavior is visible and testable |
| No migration command | Still absent in repo CLI surface | Current state | `MIGR-01`/`MIGR-03` remain unimplemented |
| No decisions/spec-deltas/contracts primitives | Design format exists; no code artifacts or commands yet | Current state | `DEC-*`, `DELTA-*`, `CONT-*` all pending |

**Deprecated/outdated:**
- New direct writes to flat roots (`.planning/ROADMAP.md`, `.planning/phases`, `.planning/milestones`) in workflow-integrated commands.
- Any new workflow docs that hardcode artifact paths instead of using init/resolver fields.

## Open Questions

1. **`WORK-03` ownership in this repo**
   - What we know: Requirement demands pr-branch nested filtering compatibility; this repo CLI help surface currently has no `pr-branch` subcommand.
   - What's unclear: Whether `WORK-03` implementation lives in this repo branch or external/fork runtime.
   - Recommendation: Plan a traceability task first to identify authoritative pr-branch implementation location, then add/update tests there.

2. **Machine-parse contract for DECISIONS/deltas/contracts**
   - What we know: Design doc proposes concrete markdown+YAML shapes.
   - What's unclear: Whether to parse via existing `frontmatter.cjs` only or new dedicated parsers for entry blocks.
   - Recommendation: Define minimal required fields + parser contract in tests before implementing write commands.

3. **Migration conflict policy detail**
   - What we know: Resolver is hierarchical-preferred and reports conflicts.
   - What's unclear: For migrate command, whether conflicts should block with non-zero exit or complete with warnings.
   - Recommendation: Use non-destructive completion with explicit conflict report and `changed=false` on unresolved conflicts.

## Sources

### Primary (HIGH confidence)
- `.planning/ROADMAP.md` - Phase 5 goal, dependencies, and success criteria.
- `.planning/REQUIREMENTS.md` - MIGR/WORK/DEC/DELTA/CONT requirement definitions.
- `.planning/workspace/current/DESIGN-workspace-enhancements.md` - migration, decisions queue, spec-deltas, contract formats, rollout mapping.
- `get-shit-done/bin/lib/core.cjs` - resolver registry and layout conflict behavior.
- `get-shit-done/bin/lib/init.cjs` - current resolver-backed and still-flat init workflow payloads.
- `get-shit-done/bin/lib/milestone.cjs` - current flat archive/write behavior.
- `get-shit-done/bin/lib/verify.cjs` - health checks still coupled to flat roots.
- `get-shit-done/bin/gsd-tools.cjs` - current CLI command surface (no migration command listed).
- `get-shit-done/workflows/discuss-phase.md`, `get-shit-done/workflows/plan-phase.md`, `get-shit-done/workflows/execute-phase.md`, `get-shit-done/workflows/verify-work.md`, `get-shit-done/workflows/new-project.md`, `get-shit-done/workflows/new-milestone.md`, `get-shit-done/workflows/complete-milestone.md` - write-path hardcoded references.
- `tests/init.test.cjs`, `tests/core.test.cjs`, `tests/milestone.test.cjs`, `tests/helpers.cjs` - current behavior contracts and flat assumptions.

### Secondary (MEDIUM confidence)
- Node.js fs docs (`https://nodejs.org/api/fs.html`) - authoritative behavior for mkdir/rename/copy/idempotent filesystem operations.
- Git ignore/path semantics (`https://git-scm.com/docs/gitignore`, `https://git-scm.com/docs/gitglossary#Documentation/gitglossary.txt-pathspec`) - recursive glob/pathspec behavior relevant to nested planning filtering.

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** - directly constrained by current repo runtime and modules.
- Architecture: **HIGH** - requirements, roadmap, design, code, and tests all align on remaining work.
- Pitfalls: **HIGH** - verified by concrete hardcoded-path occurrences and test expectations.

**Research date:** 2026-03-07
**Valid until:** 2026-04-06 (30 days; internal architecture scope)
