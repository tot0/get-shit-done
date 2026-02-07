# Requirements: GSD Multi-Runtime Compatibility

**Defined:** 2026-02-07
**Core Value:** Any supported model on any supported runtime can execute GSD workflows without breaking.

## v1 Requirements

Requirements for this milestone. Each maps to roadmap phases.

### Continuation Patterns

- [ ] **CONT-01**: All implicit continuation loops in workflows include explicit "MUST NOT end your turn" / "DO NOT end your turn here" language matching the quick-001 pattern
- [ ] **CONT-02**: The new-project.md questioning loop (line ~118) and roadmap approval loop (line ~848) have explicit continuation cues
- [ ] **CONT-03**: The new-milestone.md roadmap approval loop (line ~309) has explicit continuation cues
- [ ] **CONT-04**: The transition.md auto-continuation patterns (lines ~433, ~478) have explicit continuation cues
- [ ] **CONT-05**: The verify-work.md test presentation loop (line ~255) has explicit continuation cues

### Model Resolution

- [ ] **MODL-01**: `MODEL_PROFILES` in gsd-tools.js uses abstract tier names (`reasoning`, `standard`, `fast`) instead of Claude-specific names (`opus`, `sonnet`, `haiku`)
- [ ] **MODL-02**: A `PROVIDER_MODELS` mapping table in gsd-tools.js translates abstract tiers to provider-specific model identifiers
- [ ] **MODL-03**: Runtime/provider is auto-detected from environment (Claude Code, OpenCode, Gemini CLI) with fallback to config
- [ ] **MODL-04**: `resolve-model` returns the correct provider-specific model ID based on detected runtime
- [ ] **MODL-05**: `GSD_MODEL` environment variable overrides profile-based resolution, enabling per-invocation model switching
- [ ] **MODL-06**: Existing Claude Code behavior is preserved — `reasoning` resolves to `opus`, `standard` to `sonnet`, `fast` to `haiku` on Claude Code runtime

### Reference Neutralization

- [ ] **NEUT-01**: `model-profiles.md` reference uses abstract tier names and provider-neutral language
- [ ] **NEUT-02**: `model-profile-resolution.md` reference documents the abstract tier → provider model resolution flow
- [ ] **NEUT-03**: `settings.md` workflow profile descriptions use abstract tier names instead of "Opus everywhere" etc.
- [ ] **NEUT-04**: `set-profile.md` workflow confirmation table uses abstract tier names
- [ ] **NEUT-05**: `help.md` profile descriptions use abstract tier names
- [ ] **NEUT-06**: `new-project.md` model profile question uses abstract tier descriptions
- [ ] **NEUT-07**: All design rationale sections explain tiers in model-neutral terms ("Why reasoning-tier for planning?" not "Why Opus for gsd-planner?")

## Out of Scope

| Feature | Reason |
|---------|--------|
| `Task()` abstraction across runtimes | Installer handles frontmatter; workflow body conversion is multi-day rewrite with unclear value |
| `@file` reference syntax unification | Installer already rewrites paths; syntax differences are runtime-level concerns |
| Model capability detection | Useful but separate project — context window, tool support vary but don't cause crashes |
| Cross-runtime test suite | Separate milestone — needs infrastructure that doesn't exist yet |
| Installer modifications | Installer already works well; this project fixes what it can't |
| `GSD_HOME` env var / path abstraction | Installer handles path rewriting at install time; runtime paths work after installation |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CONT-01 | Phase 1 | Pending |
| CONT-02 | Phase 1 | Pending |
| CONT-03 | Phase 1 | Pending |
| CONT-04 | Phase 1 | Pending |
| CONT-05 | Phase 1 | Pending |
| MODL-01 | Phase 2 | Pending |
| MODL-02 | Phase 2 | Pending |
| MODL-03 | Phase 2 | Pending |
| MODL-04 | Phase 2 | Pending |
| MODL-05 | Phase 2 | Pending |
| MODL-06 | Phase 2 | Pending |
| NEUT-01 | Phase 3 | Pending |
| NEUT-02 | Phase 3 | Pending |
| NEUT-03 | Phase 3 | Pending |
| NEUT-04 | Phase 3 | Pending |
| NEUT-05 | Phase 3 | Pending |
| NEUT-06 | Phase 3 | Pending |
| NEUT-07 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 18 total
- Mapped to phases: 18
- Unmapped: 0

---
*Requirements defined: 2026-02-07*
*Last updated: 2026-02-07 after initialization*
