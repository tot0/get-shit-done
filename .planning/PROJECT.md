# GSD Multi-Runtime Compatibility

## What This Is

Making the GSD (Get Shit Done) planning system work reliably across multiple AI coding runtimes (Claude Code, OpenCode, Gemini CLI) and multiple model families (Anthropic Claude, OpenAI GPT/Codex, Google Gemini). Currently GSD is authored for Claude Code with Claude models — workflows contain implicit continuation patterns that break on non-Claude models, model resolution returns Claude-specific tier names, and reference documentation uses Claude-specific language that can confuse other models.

## Core Value

Any supported model on any supported runtime can execute GSD workflows without breaking — the system adapts to the model and runtime, not the other way around.

## Requirements

### Validated

- Multi-runtime installer already handles path rewriting, frontmatter conversion, tool name mapping, and command naming across Claude Code / OpenCode / Gemini — existing
- Per-project model profiles (quality/balanced/budget) with agent-to-tier mapping — existing
- Quick-001 established the pattern for fixing implicit continuation loops — existing

### Active

- [ ] All implicit continuation loops use explicit "do not end turn" language (belt-and-suspenders)
- [ ] Model resolution returns abstract tier names (reasoning/standard/fast) not Claude model names
- [ ] Provider-specific model mapping table translates tiers to actual model IDs per runtime
- [ ] Per-invocation model override via GSD_MODEL environment variable
- [ ] All user-facing references use abstract tier names instead of Claude model names
- [ ] Runtime detection in gsd-tools.js for auto-resolving provider

### Out of Scope

- Abstracting `Task()` / subagent spawning across runtimes — each runtime has its own mechanism, the installer already handles frontmatter conversion, and workflow body conversion would require a multi-day rewrite with unclear value
- Model capability detection (context window, tool support) — useful but a separate project
- Comprehensive cross-runtime test suite — separate milestone
- Changes to the installer itself — installer already handles conversion well; this project fixes what the installer can't (runtime behavior, model resolution, content language)

## Context

- The discuss-phase broke on GPT-5.3-Codex due to implicit continuation assumptions (fixed in quick-001 on the planning-rules branch)
- A comprehensive audit (quick-002 on planning-rules branch) identified 42 model-sensitive patterns across 6 categories, with 19 P0 breaking issues
- The gsd-opencode community fork was analyzed — it validated that the installer's conversion approach works but didn't solve the hard problems (model resolution, continuation patterns, reference language)
- The user wants to use GPT-5.3-Codex with GSD, which requires these changes
- The installer already handles: path rewriting (~/.claude/ → target), frontmatter conversion, tool name mapping, command naming structure, /gsd: → /gsd- replacement in content

## Constraints

- **No installer changes**: The installer already does its job well. This project fixes runtime behavior and content language.
- **Belt-and-suspenders**: Continuation fixes should always be explicit, not model-conditional. Extra cues don't hurt capable models.
- **Backward compatible**: Changes must not break existing Claude Code usage. Abstract tiers must resolve correctly back to opus/sonnet/haiku on Claude Code.
- **Zero new dependencies**: Consistent with GSD's zero-dependency JavaScript philosophy.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Abstract tiers (reasoning/standard/fast) over Claude names | Model-agnostic, maps cleanly to any provider's lineup | — Pending |
| Belt-and-suspenders continuation cues | Simpler than model-quirks files, no maintenance burden | — Pending |
| GSD_MODEL env var for per-invocation override | Shell-native, composable, no per-command parsing needed | — Pending |
| Separate branch/worktree from PR Branch Filter work | Different concerns, different scope, parallel development | — Pending |

---
*Last updated: 2026-02-07 after initialization*
