# Phase 2: Model Abstraction - Research

**Researched:** 2026-02-08
**Domain:** Runtime detection, abstract model tier mapping, environment variable detection
**Confidence:** HIGH

## Summary

Phase 2 modifies `gsd-tools.js` to replace Claude-specific model names (`opus`, `sonnet`, `haiku`) with abstract capability tiers (`reasoning`, `standard`, `fast`) and adds a provider mapping layer that translates tiers to runtime-specific model IDs. The file is a single 643-line Node.js CLI tool with no external dependencies. All changes are contained within this one file.

The current `MODEL_PROFILES` table (lines 26-38) directly stores Claude model names. The `cmdResolveModel` function (lines 352-370) reads the profile from config and returns a model name from the table. The change is straightforward: rename the tier values in `MODEL_PROFILES`, add a `PROVIDER_MODELS` lookup table, add a `detectRuntime()` function, and modify `cmdResolveModel` to check `GSD_MODEL` env var first, then compose the tier through `PROVIDER_MODELS`.

**Primary recommendation:** Modify `gsd-tools.js` in-place with four additions: abstract tier values in `MODEL_PROFILES`, a `PROVIDER_MODELS` mapping, a `detectRuntime()` function, and updated `cmdResolveModel` logic with `GSD_MODEL` override support.

## Standard Stack

### Core

No new libraries needed. This is a pure refactor of existing Node.js code in `gsd-tools.js` using only `process.env` for environment detection.

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js built-in `process.env` | N/A | Runtime detection via environment variables | Zero-dependency, available in all contexts |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Env var detection | Config file `GSD_RUNTIME` setting | More explicit but requires user setup; env vars are automatic |
| Hardcoded provider table | External JSON config file | Flexibility vs simplicity; hardcoded is fine for 3 providers |

## Architecture Patterns

### Current Code Structure (what planner needs to modify)

```
get-shit-done/bin/gsd-tools.js (643 lines)
├── MODEL_PROFILES table (lines 26-38)     ← MODIFY: Change opus/sonnet/haiku → reasoning/standard/fast
├── loadConfig() (lines 42-91)             ← NO CHANGE
├── cmdResolveModel() (lines 352-370)      ← MODIFY: Add GSD_MODEL override, runtime detection, provider mapping
└── main() CLI router (lines 561-642)      ← NO CHANGE
```

### Pattern 1: Current MODEL_PROFILES (before)

**What:** Direct Claude model names stored as tier values
**Current code at lines 26-38:**

```javascript
const MODEL_PROFILES = {
  'gsd-planner':              { quality: 'opus', balanced: 'opus',   budget: 'sonnet' },
  'gsd-roadmapper':           { quality: 'opus', balanced: 'sonnet', budget: 'sonnet' },
  'gsd-executor':             { quality: 'opus', balanced: 'sonnet', budget: 'sonnet' },
  'gsd-phase-researcher':     { quality: 'opus', balanced: 'sonnet', budget: 'haiku' },
  'gsd-project-researcher':   { quality: 'opus', balanced: 'sonnet', budget: 'haiku' },
  'gsd-research-synthesizer': { quality: 'sonnet', balanced: 'sonnet', budget: 'haiku' },
  'gsd-debugger':             { quality: 'opus', balanced: 'sonnet', budget: 'sonnet' },
  'gsd-codebase-mapper':      { quality: 'sonnet', balanced: 'haiku', budget: 'haiku' },
  'gsd-verifier':             { quality: 'sonnet', balanced: 'sonnet', budget: 'haiku' },
  'gsd-plan-checker':         { quality: 'sonnet', balanced: 'sonnet', budget: 'haiku' },
  'gsd-integration-checker':  { quality: 'sonnet', balanced: 'sonnet', budget: 'haiku' },
};
```

### Pattern 2: Target MODEL_PROFILES (after)

**What:** Abstract tier names replace Claude-specific names
**Example:**

```javascript
const MODEL_PROFILES = {
  'gsd-planner':              { quality: 'reasoning', balanced: 'reasoning', budget: 'standard' },
  'gsd-roadmapper':           { quality: 'reasoning', balanced: 'standard',  budget: 'standard' },
  'gsd-executor':             { quality: 'reasoning', balanced: 'standard',  budget: 'standard' },
  'gsd-phase-researcher':     { quality: 'reasoning', balanced: 'standard',  budget: 'fast' },
  'gsd-project-researcher':   { quality: 'reasoning', balanced: 'standard',  budget: 'fast' },
  'gsd-research-synthesizer': { quality: 'standard',  balanced: 'standard',  budget: 'fast' },
  'gsd-debugger':             { quality: 'reasoning', balanced: 'standard',  budget: 'standard' },
  'gsd-codebase-mapper':      { quality: 'standard',  balanced: 'fast',      budget: 'fast' },
  'gsd-verifier':             { quality: 'standard',  balanced: 'standard',  budget: 'fast' },
  'gsd-plan-checker':         { quality: 'standard',  balanced: 'standard',  budget: 'fast' },
  'gsd-integration-checker':  { quality: 'standard',  balanced: 'standard',  budget: 'fast' },
};
```

### Pattern 3: PROVIDER_MODELS mapping table (new)

**What:** Maps abstract tiers to provider-specific model identifiers
**Example:**

```javascript
const PROVIDER_MODELS = {
  'claude': {
    reasoning: 'opus',
    standard:  'sonnet',
    fast:      'haiku',
  },
  'opencode': {
    reasoning: 'claude-opus-4-6',
    standard:  'claude-sonnet-4-6',
    fast:      'claude-haiku-3-5',
  },
  'gemini': {
    reasoning: 'gemini-2.5-pro',
    standard:  'gemini-2.5-flash',
    fast:      'gemini-2.0-flash-lite',
  },
};
```

### Pattern 4: Runtime detection (new)

**What:** Auto-detect which runtime is executing the tool
**Example:**

```javascript
function detectRuntime() {
  // GSD_RUNTIME env var takes highest priority (explicit override)
  if (process.env.GSD_RUNTIME) {
    return process.env.GSD_RUNTIME;
  }

  // OpenCode sets OPENCODE=1 in child process environment
  if (process.env.OPENCODE === '1') {
    return 'opencode';
  }

  // Gemini CLI: detect via GEMINI_API_KEY or Google-specific env vars
  if (process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_USE_VERTEXAI) {
    return 'gemini';
  }

  // Claude Code sets CLAUDE_CODE_SSE_PORT in child process environment
  if (process.env.CLAUDE_CODE_SSE_PORT) {
    return 'claude';
  }

  // Fallback: default to claude (backward compatible)
  return 'claude';
}
```

### Pattern 5: Updated cmdResolveModel (modified)

**What:** Compose the full resolution chain: GSD_MODEL override -> profile -> tier -> provider -> model ID
**Example:**

```javascript
function cmdResolveModel(cwd, agentType, raw) {
  if (!agentType) {
    error('agent-type required');
  }

  // 1. GSD_MODEL override takes absolute precedence
  const overrideModel = process.env.GSD_MODEL;
  if (overrideModel) {
    const result = { model: overrideModel, profile: 'override', runtime: 'override' };
    output(result, raw, overrideModel);
    return;
  }

  // 2. Resolve tier from profile
  const config = loadConfig(cwd);
  const profile = config.model_profile || 'balanced';

  const agentModels = MODEL_PROFILES[agentType];
  if (!agentModels) {
    // Unknown agent: use standard tier
    const runtime = detectRuntime();
    const providerModels = PROVIDER_MODELS[runtime] || PROVIDER_MODELS['claude'];
    const model = providerModels['standard'];
    const result = { model, profile, runtime, tier: 'standard', unknown_agent: true };
    output(result, raw, model);
    return;
  }

  const tier = agentModels[profile] || agentModels['balanced'] || 'standard';

  // 3. Map tier to provider-specific model ID
  const runtime = detectRuntime();
  const providerModels = PROVIDER_MODELS[runtime] || PROVIDER_MODELS['claude'];
  const model = providerModels[tier] || tier; // fallback to raw tier if no mapping

  const result = { model, profile, runtime, tier };
  output(result, raw, model);
}
```

### Anti-Patterns to Avoid

- **Changing the output contract**: Callers use `--raw` to get a single model string. The raw output must remain a plain model identifier string. Adding JSON metadata is fine for non-raw mode only.
- **Breaking unknown agent fallback**: Currently returns `'sonnet'` for unknown agents (line 363). Must remain backward-compatible — return the provider-equivalent of `standard` tier.
- **Detection order sensitivity**: OpenCode currently also has `CLAUDE_CODE_SSE_PORT` in the environment (because OpenCode proxies Claude's SSE). Check `OPENCODE=1` BEFORE `CLAUDE_CODE_SSE_PORT` to avoid misdetecting OpenCode as Claude Code.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Complex provider plugin system | Extensible provider registry with plugin loading | Simple hardcoded `PROVIDER_MODELS` object | Only 3 providers, all known upfront. Adding a 4th is one line. |
| Sophisticated env detection | Process tree inspection, binary path analysis | Simple env var checks | Env vars are reliable, stable, and testable |

**Key insight:** This is a lookup table refactor, not an architecture change. Keep it simple. The three providers are well-known and the mapping is static.

## Common Pitfalls

### Pitfall 1: OpenCode Misdetection as Claude Code

**What goes wrong:** OpenCode runs Claude models behind a proxy and exposes `CLAUDE_CODE_SSE_PORT` in the environment. If runtime detection checks for `CLAUDE_CODE_SSE_PORT` first, OpenCode will be misidentified as Claude Code.
**Why it happens:** OpenCode spawns Claude Code's SSE backend and inherits/sets the same env vars.
**How to avoid:** Check `OPENCODE=1` before `CLAUDE_CODE_SSE_PORT` in the detection order.
**Warning signs:** `resolve-model` returns `opus` instead of `claude-opus-4-6` when running under OpenCode.
**Confidence:** HIGH — verified empirically. Current environment shows both `OPENCODE=1` and `CLAUDE_CODE_SSE_PORT=62231`.

### Pitfall 2: Gemini CLI Environment Detection Uncertainty

**What goes wrong:** Gemini CLI may not set a distinctive `GEMINI_CLI=1` env var. Detection may need to rely on `GEMINI_API_KEY` or other Google-specific vars.
**Why it happens:** Gemini CLI is newer and its env var conventions are less established.
**How to avoid:** Use multiple signals: `GEMINI_API_KEY`, `GOOGLE_GENAI_USE_VERTEXAI`, or add `GSD_RUNTIME=gemini` as a fallback config option.
**Warning signs:** Gemini runtime falls through to Claude default.
**Confidence:** MEDIUM — no Gemini CLI installation available to verify empirically. `GSD_RUNTIME` explicit override covers this gap.

### Pitfall 3: OpenCode Model ID Format

**What goes wrong:** OpenCode model IDs may differ from what the LLM provider expects. The model ID format (e.g., `claude-opus-4-6` vs `anthropic/claude-opus-4-6`) depends on the OpenCode backend configuration.
**Why it happens:** OpenCode supports multiple providers and model routing.
**How to avoid:** The model ID returned by `resolve-model` is passed to `Task()` calls in workflows. For Claude Code, `Task()` accepts `opus`/`sonnet`/`haiku` shorthand. For OpenCode, the Task equivalent may accept different formats. Research the actual model parameter format OpenCode expects.
**Warning signs:** Task spawning fails with "model not found" errors.
**Confidence:** MEDIUM — OpenCode's Task model parameter format needs validation during implementation. However, `GSD_MODEL` override provides an escape hatch.

### Pitfall 4: Default Fallback Behavior

**What goes wrong:** If runtime detection fails entirely (unknown environment), the system must still work.
**Why it happens:** New runtimes, CI environments, or manual invocation without a runtime.
**How to avoid:** Default to `'claude'` provider mapping, which preserves current behavior exactly.
**Warning signs:** None (silent backward compatibility).
**Confidence:** HIGH — this is by design.

## Code Examples

### Empirical Environment Variables (verified)

Running under OpenCode v1.1.53, the environment contains:

```
OPENCODE=1           # Set by OpenCode — reliable detection signal
AGENT=1              # Set by OpenCode agent mode
CLAUDE_CODE_SSE_PORT=62231  # Also present under OpenCode (proxy)
```

Running under Claude Code natively, the environment contains:

```
CLAUDE_CODE_SSE_PORT=XXXXX  # Set by Claude Code
# OPENCODE is NOT present
# AGENT may or may not be present
```

### Runtime Detection Priority Order

```
1. GSD_RUNTIME env var (explicit override, highest priority)
2. OPENCODE=1 → 'opencode'
3. GEMINI_API_KEY or GOOGLE_GENAI_USE_VERTEXAI → 'gemini'
4. CLAUDE_CODE_SSE_PORT → 'claude'
5. Fallback → 'claude'
```

### Success Criteria Verification Commands

```bash
# SC1: MODEL_PROFILES uses abstract tiers
grep -c 'reasoning\|standard\|fast' get-shit-done/bin/gsd-tools.js  # Should find them
grep -c "'opus'\|'sonnet'\|'haiku'" get-shit-done/bin/gsd-tools.js  # Only in PROVIDER_MODELS

# SC2: PROVIDER_MODELS table exists
grep 'PROVIDER_MODELS' get-shit-done/bin/gsd-tools.js

# SC3: Runtime auto-detected
node get-shit-done/bin/gsd-tools.js resolve-model gsd-planner  # Should include runtime in JSON

# SC4: GSD_MODEL override
GSD_MODEL=gpt-5.3-codex node get-shit-done/bin/gsd-tools.js resolve-model gsd-planner --raw
# Expected: gpt-5.3-codex

# SC5: Backward compatibility on Claude Code
# (When OPENCODE is not set and CLAUDE_CODE_SSE_PORT is set)
node get-shit-done/bin/gsd-tools.js resolve-model gsd-planner --raw
# Expected: opus (for quality profile)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Claude-specific model names | Abstract capability tiers | This phase | Enables multi-runtime support |
| No runtime detection | Env var-based runtime detection | This phase | Automatic provider selection |
| No model override | GSD_MODEL env var | This phase | Per-invocation model switching |

## Open Questions

1. **OpenCode model ID format for Task() calls**
   - What we know: OpenCode's Task/agent spawning system accepts a model parameter
   - What's unclear: Does it accept `claude-opus-4-6` format? Or does it use `anthropic/claude-opus-4-6`? Or does it proxy through to Claude Code's format?
   - Recommendation: Start with `claude-opus-4-6` format. If wrong, `GSD_MODEL` override provides immediate workaround. Validate during implementation.
   - Confidence: MEDIUM

2. **Gemini CLI model parameter format for agents**
   - What we know: Gemini CLI supports `-m gemini-2.5-flash` for model selection
   - What's unclear: How agent/sub-agent model selection works in Gemini CLI (experimental feature)
   - Recommendation: Use standard Gemini model IDs (`gemini-2.5-pro`, `gemini-2.5-flash`, `gemini-2.0-flash-lite`). Gemini CLI's agent system is experimental and may not support per-agent model control yet.
   - Confidence: LOW

3. **Gemini CLI runtime detection env var**
   - What we know: Gemini CLI uses `GEMINI_API_KEY` for auth. No known `GEMINI_CLI=1` env var.
   - What's unclear: Whether Gemini CLI sets any identifying env var in child processes
   - Recommendation: Check `GEMINI_API_KEY` as primary signal, add `GSD_RUNTIME=gemini` as documented fallback. If Gemini team adds a CLI detection var later, add it to detection order.
   - Confidence: MEDIUM

## Sources

### Primary (HIGH confidence)

- **gsd-tools.js source** (lines 26-38, 352-370) — Direct reading of current implementation
- **install.js source** (lines 1-1500+) — Runtime-specific installation logic, confirms 3 runtimes: claude, opencode, gemini
- **Empirical env var dump** — Captured from running OpenCode v1.1.53 session, verified `OPENCODE=1` and `CLAUDE_CODE_SSE_PORT` co-exist

### Secondary (MEDIUM confidence)

- **Gemini CLI README** (GitHub) — Model selection via `-m` flag, auth via `GEMINI_API_KEY`, `GOOGLE_GENAI_USE_VERTEXAI`
- **OpenCode SDK** (`@opencode-ai/sdk`) — Sets `OPENCODE_CONFIG_CONTENT` env var for child processes

### Tertiary (LOW confidence)

- **Gemini CLI env vars for child processes** — Not verified empirically (no local Gemini CLI installation). Detection strategy is best-effort with `GSD_RUNTIME` fallback.
- **OpenCode model ID format** — Not verified which exact model ID strings OpenCode's agent system accepts

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies, pure code modification
- Architecture: HIGH — patterns derived directly from reading current code and verified env vars
- Pitfalls: HIGH for OpenCode detection, MEDIUM for Gemini detection, MEDIUM for model ID formats

**Research date:** 2026-02-08
**Valid until:** 2026-03-08 (stable — env var conventions change slowly)
