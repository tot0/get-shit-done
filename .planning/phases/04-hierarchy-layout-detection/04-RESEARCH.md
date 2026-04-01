# Phase 4: Hierarchy & Layout Detection - Research

**Researched:** 2026-03-04
**Domain:** GSD planning layout resolution (flat + hierarchical compatibility)
**Confidence:** HIGH

## User Constraints

No phase `CONTEXT.md` exists yet for Phase 4. There are no additional locked decisions beyond roadmap/requirements scope.

## Summary

Phase 4 is a foundation refactor, not a migration phase. The key planning outcome is a resolver contract that centralizes all planning artifact paths and layout detection, then switches read-path consumers (`init`, progress, roadmap/phase lookup) to use that contract. Current code is heavily flat-path-coupled (`.planning/...`) across `core.cjs`, `init.cjs`, `phase.cjs`, `roadmap.cjs`, `state.cjs`, and `verify.cjs`.

The v2 requirements and design docs are already aligned on target behavior: detect `none|flat|hierarchical|ambiguous`, return confidence plus conflict signals, prefer hierarchical reads with flat fallback, and keep flat repos working unchanged. This means Phase 4 should avoid write-path migrations and instead ship deterministic read semantics + diagnostics for mixed states.

Current code and tests imply high regression risk if output shapes change abruptly. Existing workflows rely on repo-relative path fields from `init` commands, and tests assert exact legacy values. Plan for compatibility shims (legacy keys preserved, resolver-backed values added) and a test matrix covering flat, hierarchical, mixed, and empty `.planning` states.

**Primary recommendation:** Implement a single canonical artifact registry + `resolveLayout()` / `resolveArtifactPath()` APIs in `core.cjs` first, then migrate read-path callers behind compatibility-preserving output fields.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js runtime | `>=16.7.0` | CLI + filesystem operations | Existing repo constraint in `package.json`; no runtime change needed |
| `fs` (`node:fs`) | Built-in | Existence checks, directory scans, file reads | Already used everywhere in GSD tooling |
| `path` (`node:path`) | Built-in | Cross-platform path joins/normalization | Required for POSIX/Windows-safe behavior |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `node:test` + `assert` | Built-in | Unit/integration CLI behavior tests | All resolver + init/progress compatibility tests |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Built-in `fs`/`path` only | External fs/glob/path utility libs | Adds dependency surface against current zero-dependency philosophy |
| Convention-first detection | Manifest-only (`layout.json`) detection | Breaks backward compatibility for flat repos without migration |
| Deterministic precedence | mtime-based winner selection | Non-deterministic behavior in mixed states; harder to reason/test |

**Installation:**
```bash
npm test
```

## Architecture Patterns

### Recommended Project Structure
```
get-shit-done/bin/lib/
├── core.cjs                # resolver APIs + artifact registry (single source)
├── init.cjs                # consume resolver outputs, keep existing keys
├── phase.cjs               # phase lookup through resolver phase roots
├── roadmap.cjs             # roadmap reads through resolver
└── state.cjs               # state reads through resolver
```

### Pattern 1: Canonical Artifact Registry
**What:** Define one artifact map that knows hierarchical canonical path, flat fallback path, and scope (`project`, `workspace/current`, `archive/milestones`, `todos`).
**When to use:** Any command needing a planning artifact path.
**Example:**
```javascript
// Source: .planning/workspace/current/DESIGN-workspace-enhancements.md (resolver contract)
const ARTIFACTS = {
  project: { hier: '.planning/project/PROJECT.md', flat: '.planning/PROJECT.md' },
  roadmap: { hier: '.planning/workspace/current/ROADMAP.md', flat: '.planning/ROADMAP.md' },
  state: { hier: '.planning/workspace/current/STATE.md', flat: '.planning/STATE.md' },
  requirements: { hier: '.planning/workspace/current/REQUIREMENTS.md', flat: '.planning/REQUIREMENTS.md' },
  phasesDir: { hier: '.planning/workspace/current/phases', flat: '.planning/phases' },
  todosDir: { hier: '.planning/todos', flat: '.planning/todos' }
};
```

### Pattern 2: Two-step Resolution API
**What:** `resolveLayout(cwd)` computes mode/confidence/signals; `resolveArtifactPath(cwd, artifact)` returns the selected path + fallback/conflict metadata.
**When to use:** Read-path commands and metadata-rich init output.
**Example:**
```javascript
// Source: .planning/workspace/current/DESIGN-workspace-enhancements.md:115
const layout = resolveLayout(cwd);
const roadmap = resolveArtifactPath(cwd, 'roadmap');
// => { path, source: 'hierarchical|flat', fallbackUsed, conflict }
```

### Pattern 3: Compatibility-first Command Output
**What:** Keep legacy output keys (`roadmap_path`, `state_path`, etc.) while populating values from resolver.
**When to use:** `init` commands and other machine-consumed JSON.
**Example:**
```javascript
// Source: tests/init.test.cjs (strict path assertions)
result.roadmap_path = toRepoRelative(roadmap.path);
result.state_path = toRepoRelative(state.path);
result.layout_mode = layout.mode;
result.layout_confidence = layout.confidence;
result.layout_conflicts = layout.signals.conflicts;
```

### Anti-Patterns to Avoid
- **Path literals spread across modules:** creates drift; current repo has ~154 `.planning` literals in `bin/lib/*.cjs`.
- **Mode-dependent `if/else` per command:** duplicates policy; all fallback/conflict logic must live in resolver.
- **Silent fallback without signal:** makes mixed-state debugging impossible; always emit fallback/conflict metadata.
- **Manifest as hard requirement:** violates WORK-04 backward compatibility.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Per-command path logic | New ad hoc `path.join(cwd, '.planning', ...)` in each module | Central artifact registry + resolver APIs | Avoids regression and policy drift |
| Mixed-layout conflict policy | One-off mtime checks and inline precedence | Explicit hierarchical-preferred fallback rules + conflict signals | Deterministic behavior across commands |
| Detection state spread | Command-specific heuristics | Single `resolveLayout` scoring + confidence model | One truth for `flat/hierarchical/ambiguous/none` |
| Consumer breakage handling | Big-bang output schema replacement | Compatibility shim preserving legacy keys | Existing tests and workflows depend on current keys |

**Key insight:** custom logic per command is the main risk multiplier; centralization is the feature here.

## Common Pitfalls

### Pitfall 1: Archive path namespace drift
**What goes wrong:** Some code expects `.planning/milestones`, other code expects `.planning/archive`, while requirements specify `.planning/archive/milestones`.
**Why it happens:** Historical flat structure + evolving v2 design names.
**How to avoid:** Canonicalize archive artifact names in registry and make old paths fallbacks with conflict signals.
**Warning signs:** Different commands report different archive existence or miss archived phases.

### Pitfall 2: Breaking init/progress JSON contracts
**What goes wrong:** Orchestrators/tests fail after path field changes.
**Why it happens:** Existing tests assert exact keys/values from `init` commands.
**How to avoid:** Preserve legacy field names and semantics while sourcing values through resolver.
**Warning signs:** `tests/init.test.cjs` regressions on `*_path` fields.

### Pitfall 3: False ambiguity for sparse repos
**What goes wrong:** Empty or partially initialized `.planning/` classified inconsistently.
**Why it happens:** Overweighting weak signals or missing explicit `none`/empty handling.
**How to avoid:** Separate `none` (no `.planning`) from `ambiguous` (exists but insufficient signals), with confidence bands.
**Warning signs:** Flaky mode on repeated runs without filesystem changes.

### Pitfall 4: Hidden fallback behavior
**What goes wrong:** Reads silently pick flat files, masking migration debt.
**Why it happens:** Fallback implemented as plain path substitution.
**How to avoid:** Return structured fallback metadata (`fallbackUsed`, `from`, `to`, conflict list).
**Warning signs:** Users see stale data with no resolver warning.

## Code Examples

Verified patterns from internal design/contracts and current codebase:

### Layout detection skeleton
```javascript
// Source: .planning/workspace/current/DESIGN-workspace-enhancements.md:115
function resolveLayout(cwd) {
  if (!exists('.planning')) return { mode: 'none', confidence: 1.0, paths: null, signals: { hierarchical: [], flat: [], conflicts: [] } };

  const signals = collectSignals(cwd);
  const flatScore = weight(signals.flat);
  const hierScore = weight(signals.hierarchical);
  const mode = Math.abs(flatScore - hierScore) < THRESHOLD
    ? 'ambiguous'
    : (hierScore > flatScore ? 'hierarchical' : 'flat');

  return { mode, confidence: computeConfidence(mode, flatScore, hierScore, signals.conflicts), signals };
}
```

### Existing phase discovery entry point to migrate
```javascript
// Source: get-shit-done/bin/lib/core.cjs:259
function findPhaseInternal(cwd, phase) {
  const phasesDir = path.join(cwd, '.planning', 'phases');
  // TODO Phase 4: replace with resolver-provided phases root(s)
}
```

### Existing init output contract to preserve
```javascript
// Source: get-shit-done/bin/lib/init.cjs:129
const result = {
  state_path: '.planning/STATE.md',
  roadmap_path: '.planning/ROADMAP.md',
  requirements_path: '.planning/REQUIREMENTS.md'
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Flat hardcoded paths in each module | Resolver-first centralized path policy | Planned in Phase 4 (2026-03 roadmap) | Enables flat + hierarchical + mixed compatibility |
| Binary layout assumption | 4-mode detection (`none|flat|hierarchical|ambiguous`) with confidence/signals | Planned in v2 design (2026-03-04) | Better migration diagnostics and safer fallback |
| Implicit fallback | Explicit hierarchical-preferred, flat-fallback with conflict metadata | Planned in v2 design | Deterministic behavior, easier troubleshooting |

**Deprecated/outdated:**
- Scattering new `.planning/...` literals in command modules.
- Treating `.planning/milestones` and `.planning/archive` as interchangeable without explicit resolver mapping.

## Open Questions

1. **Conflict precedence finalization when both flat and hierarchical files exist**
   - What we know: design notes assume hierarchical-first.
   - What's unclear: whether this must ever be overridable per command.
   - Recommendation: lock hierarchical-first for Phase 4 and expose conflicts; defer override policy.

2. **`layout.json` policy in this phase**
   - What we know: manifest is optional/advisory in design.
   - What's unclear: whether Phase 4 writes it or only reads when present.
   - Recommendation: Phase 4 should read-if-present only; writing belongs with migration/new-project workflows.

3. **Backward compatibility key strategy**
   - What we know: existing tests assert legacy path keys.
   - What's unclear: whether planner should add new resolver metadata keys in same payload now.
   - Recommendation: additive fields only; never remove/rename legacy keys in Phase 4.

## Sources

### Primary (HIGH confidence)
- `.planning/ROADMAP.md` - Phase 4 scope, requirements, success criteria.
- `.planning/REQUIREMENTS.md` - HIER-01..04, MIGR-02, WORK-02, WORK-04 definitions.
- `.planning/workspace/current/DESIGN-workspace-enhancements.md` - resolver mode/confidence/signals design and rollout mapping.
- `get-shit-done/bin/lib/core.cjs` - current phase lookup and path helpers to refactor.
- `get-shit-done/bin/lib/init.cjs` - read-path command outputs that must become resolver-backed.
- `tests/init.test.cjs` and `tests/core.test.cjs` - existing contract expectations and compatibility constraints.
- `package.json` - runtime floor (`node >=16.7.0`).

### Secondary (MEDIUM confidence)
- Node.js docs: `https://nodejs.org/api/path.html#pathjoinpaths` - cross-platform join/posix behavior relevant to repo-relative path normalization.

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** - directly constrained by repo runtime and current implementation.
- Architecture: **HIGH** - requirements + roadmap + design doc are explicit and aligned.
- Pitfalls: **HIGH** - confirmed by current code/test coupling and path namespace inconsistencies.

**Research date:** 2026-03-04
**Valid until:** 2026-04-03 (30 days; internal architecture scope)
