# GSD Model-Agnostic Compatibility Audit

**Audited:** 2026-02-07
**Context:** After quick-001 fixed the discuss-phase continuation pattern for non-Opus models (GPT-5.3-Codex), this audit catalogues ALL model-sensitive patterns across the GSD system and proposes an architecture for trivial per-invocation model switching.

**Total issues found:** 42 distinct patterns across 6 categories

---

## Category 1: Continuation/Loop Patterns

Patterns where a model must continue processing without ending its turn. The quick-001 fix addressed ONE instance; several others exist with varying risk levels.

| # | File | Lines | Pattern | Language | Continuation Type | Severity | Effort | Priority |
|---|------|-------|---------|----------|-------------------|----------|--------|----------|
| 1.1 | `get-shit-done/workflows/discuss-phase.md` | 229–260 | Discussion area loop — iterate over selected gray areas with 4 questions each, then check | **Explicit** (fixed in quick-001): "MUST NOT end your turn", "DO NOT end your turn here" | Explicit after fix | ✓ Fixed | — | — |
| 1.2 | `get-shit-done/workflows/new-project.md` | 108–118 | "Loop until 'Create PROJECT.md' selected" — questioning loop with AskUserQuestion decision gate | **Implicit** — says "Loop until" but no explicit continuation cue | Implicit | breaking | moderate | P0 |
| 1.3 | `get-shit-done/workflows/new-project.md` | 820–848 | Roadmap approval loop — "If 'Adjust phases': Get notes, re-spawn roadmapper... Loop until user approves" | **Implicit** — says "Loop until" without explicit continuation | Implicit | breaking | moderate | P0 |
| 1.4 | `get-shit-done/workflows/new-milestone.md` | 304–309 | Roadmap approval loop — identical pattern to 1.3 | **Implicit** — "loop until approved" | Implicit | breaking | moderate | P0 |
| 1.5 | `get-shit-done/workflows/execute-phase.md` | 199–258 | Checkpoint handling loop — "Repeat until plan completes or user stops" | **Implicit** — but this is an orchestrator loop driving Task() spawns, less risky because each iteration is a fresh agent spawn | Implicit (orchestrator) | degraded | trivial | P1 |
| 1.6 | `get-shit-done/workflows/verify-work.md` | 441–490 | Revision loop — planner ↔ checker iterate max 3 times | **Explicit** — has counter (`iteration_count < 3`) and clear routing | Semi-explicit | degraded | trivial | P1 |
| 1.7 | `get-shit-done/workflows/plan-phase.md` | 293–343 | Revision Loop (Max 3 Iterations) — same planner ↔ checker pattern | **Explicit** — has counter and routing logic | Semi-explicit | degraded | trivial | P1 |
| 1.8 | `get-shit-done/workflows/transition.md` | 433, 478 | "Auto-continuing" in yolo mode — `SlashCommand("/gsd:plan-phase [X+1]")` | **Implicit** — relies on model invoking SlashCommand after outputting text | Implicit | breaking | moderate | P0 |
| 1.9 | `get-shit-done/workflows/verify-work.md` | 255–256 | "If more tests remain → Update Current Test, go to present_test" — test presentation loop | **Implicit** — "go to" navigation without explicit continuation cue | Implicit | breaking | moderate | P0 |
| 1.10 | `get-shit-done/workflows/new-project.md` | 598–719 | Requirements scoping loop — "For each category, use AskUserQuestion" then "If 'adjust': Return to scoping" | **Implicit** — multiple nested loops | Implicit | degraded | moderate | P1 |

**Summary:** 5 implicit breaking patterns (1.2, 1.3, 1.4, 1.8, 1.9) need the same explicit continuation language applied in quick-001. The orchestrator loops (1.5, 1.6, 1.7) are lower risk because they drive Task() spawns.

---

## Category 2: Model Name Hardcoding

All places where Claude-specific model names ("opus", "sonnet", "haiku") are used as identifiers.

| # | File | Lines | Pattern | Severity | Effort | Priority |
|---|------|-------|---------|----------|--------|----------|
| 2.1 | `get-shit-done/bin/gsd-tools.js` | 28–40 | `MODEL_PROFILES` table uses `opus`, `sonnet`, `haiku` as values for all 11 agent types × 3 profiles | breaking | significant | P0 |
| 2.2 | `get-shit-done/references/model-profiles.md` | 7–19 | Entire profile definition table uses Claude model family names | cosmetic (docs) | trivial | P1 |
| 2.3 | `get-shit-done/references/model-profiles.md` | 23–37 | Profile philosophy section references "Opus for all decision-making agents", "Sonnet for execution" | cosmetic (docs) | trivial | P2 |
| 2.4 | `get-shit-done/references/model-profiles.md` | 63–73 | Design rationale — "Why Opus for gsd-planner?", "Why Sonnet for gsd-executor?" | cosmetic (docs) | trivial | P2 |
| 2.5 | `get-shit-done/workflows/settings.md` | 42–44 | Profile descriptions: "Opus everywhere", "Opus for planning, Sonnet for execution", "Sonnet for writing, Haiku for research" | cosmetic | trivial | P1 |
| 2.6 | `get-shit-done/workflows/set-profile.md` | 57–61 | Confirmation table shows "opus", "sonnet", "haiku" model names | cosmetic | trivial | P1 |
| 2.7 | `get-shit-done/workflows/help.md` | 307–309 | `/gsd:set-profile` descriptions: "Opus everywhere", "Opus for planning, Sonnet for execution", "Sonnet for writing, Haiku for research" | cosmetic | trivial | P2 |
| 2.8 | `get-shit-done/workflows/new-project.md` | 296–299 | Model profile question: "Balanced", "Quality", "Budget" with Claude-specific descriptions | cosmetic | trivial | P1 |

**Summary:** The critical issue is 2.1 — `gsd-tools.js` returns "opus"/"sonnet"/"haiku" which get passed to `Task(model=...)`. These are Claude Code model identifiers that won't work on other runtimes. Everything else is cosmetic documentation.

---

## Category 3: Claude-Specific Tool/Feature Assumptions

Tools and features that may not exist or work differently on other AI coding environments.

| # | File | Pattern | What It Is | Portability | Severity | Effort | Priority |
|---|------|---------|------------|-------------|----------|--------|----------|
| 3.1 | 12+ workflow files | `Task()` tool with `subagent_type`, `model`, `run_in_background` parameters | Claude Code's subagent spawning mechanism — 47 total invocations across the codebase | Unknown. OpenCode may have equivalent. No abstraction layer exists. | breaking | significant | P0 |
| 3.2 | 15+ files | `AskUserQuestion` tool with `header`, `question`, `options`, `multiSelect` parameters | Claude Code's structured user interaction tool — 52 references | Unknown. OpenCode may call it `question`. No abstraction. | breaking | significant | P0 |
| 3.3 | `transition.md` | `SlashCommand()` invocations (lines 436, 481) | Claude Code's tool to invoke other slash commands programmatically | Unknown portability | breaking | moderate | P0 |
| 3.4 | All command files | `@file` reference syntax (e.g., `@~/.claude/get-shit-done/workflows/discuss-phase.md`) | File inclusion mechanism — loads referenced file into context | Different per runtime. Claude Code uses `@`, OpenCode may use different syntax. | breaking | significant | P0 |
| 3.5 | Command frontmatter | `allowed-tools: [Read, Write, Bash, Glob, Grep, AskUserQuestion]` | Tool permission declarations in YAML frontmatter | Claude Code-specific frontmatter format. OpenCode uses different format. | breaking | significant | P0 |
| 3.6 | All command files | Slash command naming: `/gsd:command-name` | Command invocation syntax | Claude Code uses `name: gsd:command-name`. Other runtimes may use different naming conventions. | breaking | significant | P0 |
| 3.7 | `execute-plan.md` | `resume` parameter in Task calls (line 96) | Ability to resume a previously interrupted subagent | Claude Code-specific. Not known if other runtimes support this. | degraded | trivial | P2 |

**Summary:** The `Task()`, `AskUserQuestion`, `SlashCommand`, `@file`, and frontmatter formats are the most impactful. These are the core orchestration primitives. Without abstraction, no workflow can run on a non-Claude-Code runtime.

**Note:** The existing installer (`install.js`) already handles some of this — it converts Claude Code command format to OpenCode format. But the WORKFLOW files (which are loaded at runtime, not installed) still contain these raw tool references.

---

## Category 4: Path Assumptions

Hardcoded paths that differ between runtimes.

| # | Pattern | Count | Files Affected | Resolution | Severity | Effort | Priority |
|---|---------|-------|----------------|------------|----------|--------|----------|
| 4.1 | `~/.claude/get-shit-done/` in bash commands | ~120+ | 30+ workflow and command files | Node invocations: `node ~/.claude/get-shit-done/bin/gsd-tools.js` | breaking | significant | P0 |
| 4.2 | `~/.claude/get-shit-done/` in `@` references | ~100+ | 30+ workflow and command files | File references: `@~/.claude/get-shit-done/workflows/execute-phase.md` | breaking | significant | P0 |
| 4.3 | `~/.claude/agents/` in Task prompts | 9 | `new-project.md`, `plan-phase.md`, `research-phase.md`, command `research-phase.md` | Agent file references: `read ~/.claude/agents/gsd-planner.md` | breaking | moderate | P0 |
| 4.4 | `~/.claude/cache/` | 2 | `hooks/gsd-check-update.js`, workflow `update.md` | Cache path for update checking | degraded | trivial | P1 |
| 4.5 | `~/.claude/settings.json` | 1 | Installer | Settings file path | breaking | moderate | P0 (installer) |

**Total path references in workflows + commands + references + templates: 221**

**Key question:** Are these resolved by the host tool before the workflow/command runs, or does the model literally execute `node ~/.claude/get-shit-done/bin/gsd-tools.js`?

**Answer from codebase analysis:** The model literally executes these paths in bash commands. `@` references are resolved by the host tool (Claude Code / OpenCode), but bash commands like `node ~/.claude/get-shit-done/bin/gsd-tools.js` are executed as-is. The installer copies files to the correct location per runtime (`~/.claude/` for Claude Code, `~/.config/opencode/` for OpenCode), but the workflow files still reference `~/.claude/`.

**This means:** When workflows are installed to `~/.config/opencode/get-shit-done/workflows/`, the bash commands INSIDE those files still say `node ~/.claude/get-shit-done/bin/gsd-tools.js`. This would fail on OpenCode unless symlinked or patched.

---

## Category 5: Behavioral Assumptions About Model Capabilities

Assumptions about model reasoning depth, context window, and instruction-following that may not hold for all models.

| # | File | Assumption | Risk | Severity | Effort | Priority |
|---|------|-----------|------|----------|--------|----------|
| 5.1 | `get-shit-done/templates/planner-subagent-prompt.md` | Goal-backward methodology — derives must-haves from phase goal, then plans tasks to deliver them | Requires strong multi-step reasoning | degraded | trivial | P2 |
| 5.2 | All plan files | Complex XML-structured prompts with `<task>`, `<verify>`, `<done>`, frontmatter YAML, nested context | Requires high instruction-following fidelity | degraded | trivial | P2 |
| 5.3 | `execute-phase.md` (implied) | Context window assumption — orchestrator expects subagents to have "fresh 200k" context | Claude models have 200k context. Other models may have less (GPT-4.1: 128k, some: 32k) | degraded | moderate | P1 |
| 5.4 | All workflow outputs | Structured output expectations — YAML frontmatter, specific markdown section headers, table formats | Requires consistent structured output capability | degraded | trivial | P2 |
| 5.5 | `verify-phase.md` | Three-level artifact verification (existence → substantive → wired) with specific line count thresholds and regex patterns | Sophisticated multi-step verification logic | degraded | trivial | P2 |
| 5.6 | `help.md` line 8 | "optimized for solo agentic development with Claude Code" — explicit Claude Code branding | cosmetic | trivial | P2 |
| 5.7 | Planning workflows | 50% context budget target (from planner agent) — assumes specific context budget constraints | Different models have different context economics | cosmetic | trivial | P2 |

**Summary:** Most behavioral assumptions are about instruction-following fidelity and structured output. These are "soft" issues — a less capable model will produce worse results but won't crash. The context window assumption (5.3) could cause actual failures if a model can't hold the full plan + context.

---

## Category 6: Architecture Gaps for Multi-Model Support

Structural limitations that prevent trivial model switching.

| # | Gap | Current State | Impact | Severity | Effort | Priority |
|---|-----|--------------|--------|----------|--------|----------|
| 6.1 | `resolve-model` returns abstract names, not model IDs | Returns "opus"/"sonnet"/"haiku" — these are Claude Code model selectors, not API model IDs | Other runtimes need actual model IDs (e.g., `gpt-5.3-codex`, `gpt-4.1`) | breaking | significant | P0 |
| 6.2 | No provider-to-model mapping layer | No mechanism to map "reasoning tier" → provider-specific model | Each provider has different model names and capabilities | breaking | significant | P0 |
| 6.3 | Model profile is project-level config only | Set in `.planning/config.json` — applies to all invocations | User wants per-invocation switching (e.g., use GPT-5.3 for planning, Claude for execution) | degraded | moderate | P0 |
| 6.4 | No model capability detection | No way to query: context window size, tool support, structured output ability | Can't adapt workflows to model capabilities | degraded | significant | P1 |
| 6.5 | No runtime detection | No mechanism to detect which AI coding tool is running (Claude Code vs OpenCode vs Gemini CLI) | Can't auto-resolve paths or tool syntax | breaking | moderate | P0 |
| 6.6 | No behavioral adaptation layer | No model-specific quirks file or behavioral overrides | Different models need different continuation cues, prompt styles | degraded | moderate | P1 |

---

## Architecture Proposal: Per-Invocation Model Switching

### 1. Per-Invocation Model Specification

**Recommended approach: Environment variable with command-flag override**

| Mechanism | Example | Pros | Cons | Verdict |
|-----------|---------|------|------|---------|
| Environment variable | `GSD_MODEL=gpt-5.3-codex /gsd:plan-phase 2` | Shell-native, works everywhere, composable | Not discoverable, easy to forget | **Primary** |
| Command flag | `/gsd:plan-phase 2 --model gpt-5.3-codex` | Discoverable, explicit | Requires parsing in every command | **Override** |
| Session-level setting | `GSD_MODEL=gpt-5.3-codex` (export for session) | Persists for session, no repeated typing | Can be surprising if forgotten | **Convenience** |
| Config file | `.planning/config.json: "model_override": "gpt-5.3-codex"` | Persistent, team-shareable | Too permanent, defeats "per-invocation" goal | **Not recommended** |

**Resolution order:**
1. Command flag `--model` (highest priority)
2. Environment variable `GSD_MODEL`
3. Config file `model_profile` mapping (current behavior)
4. Default: `balanced` profile

**Implementation in `gsd-tools.js`:**
```javascript
function cmdResolveModel(cwd, agentType, raw) {
  // 1. Check for explicit model override
  const envModel = process.env.GSD_MODEL;
  if (envModel) {
    // Return the override directly — it's a specific model ID
    output({ model: envModel, source: 'env_override' }, raw, envModel);
    return;
  }

  // 2. Fall back to profile-based resolution
  const config = loadConfig(cwd);
  const profile = config.model_profile || 'balanced';
  const tier = MODEL_PROFILES[agentType]?.[profile] || 'standard';
  
  // 3. Map tier to provider-specific model
  const model = resolveProviderModel(tier);
  output({ model, source: 'profile', tier }, raw, model);
}
```

### 2. Model Capability Profiles (Abstract Tiers)

Instead of mapping profiles → `opus/sonnet/haiku`, map to **abstract capability tiers**:

| Tier | Purpose | Claude | OpenAI | Gemini |
|------|---------|--------|--------|--------|
| `reasoning` | Architecture, planning, complex analysis | claude-opus-4 | gpt-5.3-codex | gemini-2.5-pro |
| `standard` | Execution, research, general tasks | claude-sonnet-4 | gpt-4.1 | gemini-2.5-flash |
| `fast` | Read-only, pattern extraction, simple tasks | claude-haiku-3.5 | gpt-4.1-mini | gemini-2.0-flash |

**Where the mapping lives:**

Option A: **In gsd-tools.js** — a `PROVIDER_MODELS` table alongside `MODEL_PROFILES`. The provider is detected from the runtime environment.

```javascript
const PROVIDER_MODELS = {
  'claude-code': {
    reasoning: 'opus',    // Claude Code uses abstract names
    standard: 'sonnet',
    fast: 'haiku',
  },
  'opencode': {
    reasoning: 'claude-opus-4',  // OpenCode needs full model IDs
    standard: 'claude-sonnet-4',
    fast: 'claude-haiku-3.5',
  },
  // User can override with GSD_PROVIDER_MODELS env var or config
};
```

Option B: **In a config file** — `~/.gsd/providers.json` or `.planning/providers.json`. More flexible but another file to manage.

**Recommendation:** Option A with Option B as override. The defaults in code cover 90% of cases; the config file handles custom setups.

### 3. Behavioral Adaptation Layer

Based on the quick-001 fix pattern, some models need different behavioral cues.

**Approach: Belt-and-suspenders (always explicit) rather than model-conditional**

The quick-001 fix added explicit continuation language that works for ALL models (Opus didn't need it but doesn't hurt). This is the preferred pattern:

- **Always include** explicit continuation cues in loops (not just for non-Opus)
- **Always include** structured output format expectations
- **Always include** "do not end your turn" markers at implicit continuation points

**Why not a quirks file?** Quirks files create maintenance burden (need updating per model release) and testing complexity (need to verify each quirk still applies). Belt-and-suspenders is simpler and more robust.

**Exception:** If a model genuinely can't handle a pattern even with explicit cues, a `model-quirks.json` could provide workflow-level overrides:

```json
{
  "gpt-4.1-mini": {
    "max_continuation_depth": 3,
    "prefer_sequential_over_parallel": true,
    "structured_output_format": "markdown_only"
  }
}
```

This would be consulted by orchestrators only when standard approaches fail, not as a primary mechanism.

### 4. Path Abstraction

**Current problem:** 221 hardcoded `~/.claude/` paths in workflow and command files.

**Is it handled by the host tool?** Partially:
- `@` references: Resolved by the host tool. But workflows still write `@~/.claude/...` which only works on Claude Code.
- Bash commands: NOT resolved. `node ~/.claude/get-shit-done/bin/gsd-tools.js` is executed literally.

**Proposed solution: Runtime-resolved base path**

1. **Add `GSD_HOME` environment variable** — set during installation:
   - Claude Code installer: `GSD_HOME=~/.claude/get-shit-done`
   - OpenCode installer: `GSD_HOME=~/.config/opencode/get-shit-done`
   - Gemini installer: `GSD_HOME=~/.gemini/get-shit-done`

2. **Replace hardcoded paths in workflows:**
   ```bash
   # Before:
   node ~/.claude/get-shit-done/bin/gsd-tools.js resolve-model gsd-planner --raw
   
   # After:
   node ${GSD_HOME}/bin/gsd-tools.js resolve-model gsd-planner --raw
   ```

3. **For `@` references**, the installer already handles path conversion. The workflow files use `~/.claude/` and the installer rewrites them for the target runtime.

4. **For agent references** (`~/.claude/agents/gsd-planner.md`), the installer places agents in the correct location. Workflow references need the same `${GSD_HOME}` or installer rewrite treatment.

**Alternative: gsd-tools.js `path` subcommand:**
```bash
GSD_BIN=$(node $(dirname "$0")/gsd-tools.js path bin --raw)
# Returns the absolute path to gsd-tools.js's parent directory
```

This is more complex but avoids requiring an environment variable.

### 5. Migration Path

**Quick wins (1-2 hours each):**

| Order | Change | Files | Effort | Impact |
|-------|--------|-------|--------|--------|
| 1 | Apply quick-001 continuation fix pattern to all implicit loops (1.2, 1.3, 1.4, 1.8, 1.9) | 4 workflow files | 1 hour | Fixes breaking continuation issues on all models |
| 2 | Add `GSD_MODEL` env var override to `resolve-model` in gsd-tools.js | 1 file | 30 min | Enables per-invocation model override |
| 3 | Change `MODEL_PROFILES` values from `opus/sonnet/haiku` to `reasoning/standard/fast` | 1 file | 30 min | Decouples from Claude model names |
| 4 | Add `PROVIDER_MODELS` mapping table to gsd-tools.js | 1 file | 30 min | Enables provider-specific model resolution |

**Moderate changes (half-day each):**

| Order | Change | Files | Effort | Impact |
|-------|--------|-------|--------|--------|
| 5 | Introduce `GSD_HOME` env var and update all bash paths in workflows | 30+ files | 4 hours | Fixes path resolution across runtimes |
| 6 | Add runtime detection to gsd-tools.js | 1 file | 2 hours | Enables auto-detection of Claude Code vs OpenCode |
| 7 | Update installer to set `GSD_HOME` during installation | 1 file | 1 hour | Supports path abstraction |
| 8 | Update documentation/help to be provider-neutral | 5 files | 2 hours | Removes Claude branding assumptions |

**Architectural projects (multi-day):**

| Order | Change | Files | Effort | Impact |
|-------|--------|-------|--------|--------|
| 9 | Abstract `Task()` / `AskUserQuestion` / `SlashCommand` behind provider-neutral function names | 30+ files | Multi-day | Full cross-runtime compatibility |
| 10 | Add model capability detection (context window, tool support) | 2-3 files | 1 day | Adaptive workflow behavior |
| 11 | Create comprehensive test suite for multi-model compatibility | New files | Multi-day | Prevents regressions |

**Recommended implementation order:** 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11

Changes 1–4 can be done in a single quick task session. Changes 5–8 are a planned phase. Changes 9–11 are a separate milestone.

---

## Cross-Reference: quick-001 Fix Pattern

The quick-001 fix established the pattern for addressing continuation issues:

1. **CRITICAL warning at top of step** — "This step is a LOOP... MUST NOT end your turn"
2. **Inline enforcement at transition points** — "DO NOT end your turn here"
3. **Only-natural-pause-point marker** — "This is the ONLY point where the loop naturally pauses"

This pattern should be applied to all implicit continuation points identified in Category 1 (issues 1.2, 1.3, 1.4, 1.8, 1.9).

---

## Issue Summary Table

| Category | Total Issues | Breaking | Degraded | Cosmetic | P0 | P1 | P2 |
|----------|-------------|----------|----------|----------|----|----|-----|
| 1. Continuation/Loop | 10 (1 fixed) | 5 | 4 | 0 | 5 | 4 | 0 |
| 2. Model Name Hardcoding | 8 | 1 | 0 | 7 | 1 | 3 | 4 |
| 3. Claude-Specific Tools | 7 | 6 | 1 | 0 | 5 | 0 | 2 |
| 4. Path Assumptions | 5 | 4 | 1 | 0 | 4 | 1 | 0 |
| 5. Behavioral Assumptions | 7 | 0 | 5 | 2 | 0 | 1 | 6 |
| 6. Architecture Gaps | 6 | 4 | 2 | 0 | 4 | 2 | 0 |
| **Total** | **42** (+ 1 fixed) | **20** | **13** | **9** | **19** | **11** | **12** |

**P0 issues (19):** Must fix for basic multi-model and multi-runtime support
**P1 issues (11):** Important for good experience across models
**P2 issues (12):** Nice-to-have improvements

---

*Audit produced by quick-002 task, referencing quick-001 context*
