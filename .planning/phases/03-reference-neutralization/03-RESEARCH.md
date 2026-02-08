# Phase 3: Reference Neutralization - Research

**Researched:** 2026-02-08
**Domain:** Documentation text replacement (Claude model names → abstract tier names)
**Confidence:** HIGH

## Summary

Phase 3 is a purely textual find-and-replace operation across 7 files (6 in `get-shit-done/` + the root `README.md`). Phase 2 already built the abstract tier system in code (`MODEL_PROFILES` uses `reasoning`/`standard`/`fast`, `PROVIDER_MODELS` maps tiers to provider-specific IDs). The documentation files still reference the old Claude-specific names (Opus, Sonnet, Haiku) as if they were the canonical model identifiers. This phase updates all user-facing text to use tier language instead.

The work splits naturally into two concerns: (1) reference docs that describe the model system in detail (`model-profiles.md`, `model-profile-resolution.md`), and (2) workflow files that mention profiles in passing (`settings.md`, `set-profile.md`, `help.md`, `new-project.md`, `README.md`).

**Primary recommendation:** Systematic file-by-file replacement with exact old→new text mapping. No structural changes needed — just content updates.

## Standard Stack

Not applicable — this phase involves only markdown text edits. No libraries, no code changes.

## Architecture Patterns

### Pattern 1: Two-Tier Split (References vs Workflows)

**What:** Reference docs need full rewrites (new tables, new rationale sections). Workflow files need targeted string replacements in UI descriptions.

**When to use:** Always for this phase — the two file categories have different change complexity.

**Reference files (heavy changes):**
- `model-profiles.md` — full table rewrite + philosophy rewrite + rationale rewrite
- `model-profile-resolution.md` — add provider resolution flow documentation

**Workflow files (light changes):**
- `settings.md` — 3 description strings
- `set-profile.md` — example table values + purpose text
- `help.md` — 3 bullet point descriptions
- `new-project.md` — 3 description strings
- `README.md` — 1 section heading + table + introductory text

### Anti-Patterns to Avoid
- **Preserving Claude names "for familiarity":** The entire point is neutralization. Don't hedge with "e.g., Opus on Claude" in user-facing text — that belongs only in the PROVIDER_MODELS code table.
- **Changing PROVIDER_MODELS code comments:** The `gsd-tools.js` PROVIDER_MODELS table at lines 146-177 legitimately contains Claude model names. Don't touch it.

## Don't Hand-Roll

Not applicable — no libraries or tools needed. Pure text editing.

## Common Pitfalls

### Pitfall 1: Missing the README.md
**What goes wrong:** README.md lines 491-499 contain "Control which Claude model each agent uses" and a table with Opus/Sonnet/Haiku. Easy to forget since it's not listed in the requirements.
**Why it happens:** Requirements only name 6 files, but README.md also has model profile descriptions.
**How to avoid:** Include README.md in scope. Success criterion 4 says "No workflow, reference, or template file" — README.md is none of those, but it IS user-facing.
**Warning signs:** Post-change grep still finds Opus/Sonnet/Haiku outside PROVIDER_MODELS.

### Pitfall 2: Lowercase "opus"/"sonnet"/"haiku" in model-profiles.md Table
**What goes wrong:** The profile definitions table (model-profiles.md lines 7-19) uses lowercase `opus`, `sonnet`, `haiku` as cell values. These need to change to `reasoning`, `standard`, `fast` to match the code.
**Why it happens:** They look like code references, so you might think they should stay.
**How to avoid:** These ARE the values that need updating — the table should match `MODEL_PROFILES` in gsd-tools.js which already uses abstract tiers.

### Pitfall 3: set-profile.md Example Table is Illustrative, Not Real
**What goes wrong:** `set-profile.md` lines 57-61 show an example confirmation table with `opus`/`sonnet`/`haiku` values. This is a template showing what the runtime output would look like.
**Why it happens:** The actual runtime output is dynamically generated from gsd-tools.js MODEL_PROFILES, which already uses tier names.
**How to avoid:** Update the example to use tier names since that's what the code actually produces now.

### Pitfall 4: model-profile-resolution.md Needs Expansion, Not Just Find-Replace
**What goes wrong:** The current `model-profile-resolution.md` is minimal (33 lines). NEUT-02 requires it to "document the full resolution flow: profile → tier → provider detection → model ID."
**Why it happens:** Phase 2 built the resolution logic in code but didn't update the reference doc to describe the full multi-provider flow.
**How to avoid:** This file needs content ADDED, not just names swapped. Document the full flow: profile lookup → tier name → detectRuntime() → PROVIDER_MODELS lookup → model ID.

## Detailed File-by-File Change Specification

### File 1: `get-shit-done/references/model-profiles.md` (NEUT-01, NEUT-07)

**Line 3:** `Model profiles control which Claude model each GSD agent uses.`
→ `Model profiles control which AI model each GSD agent uses. Abstract capability tiers are resolved to provider-specific models at runtime.`

**Lines 7-19 (Profile Definitions table):** Replace all `opus` → `reasoning`, `sonnet` → `standard`, `haiku` → `fast`

Current:
```
| Agent | `quality` | `balanced` | `budget` |
|-------|-----------|------------|----------|
| gsd-planner | opus | opus | sonnet |
| gsd-roadmapper | opus | sonnet | sonnet |
...
```

Replacement:
```
| Agent | `quality` | `balanced` | `budget` |
|-------|-----------|------------|----------|
| gsd-planner | reasoning | reasoning | standard |
| gsd-roadmapper | reasoning | standard | standard |
| gsd-executor | reasoning | standard | standard |
| gsd-phase-researcher | reasoning | standard | fast |
| gsd-project-researcher | reasoning | standard | fast |
| gsd-research-synthesizer | standard | standard | fast |
| gsd-debugger | reasoning | standard | standard |
| gsd-codebase-mapper | standard | fast | fast |
| gsd-verifier | standard | standard | fast |
| gsd-plan-checker | standard | standard | fast |
| gsd-integration-checker | standard | standard | fast |
```

**Lines 23-37 (Profile Philosophy section):** Full rewrite

Current:
```
**quality** - Maximum reasoning power
- Opus for all decision-making agents
- Sonnet for read-only verification

**balanced** (default) - Smart allocation
- Opus only for planning (where architecture decisions happen)
- Sonnet for execution and research (follows explicit instructions)
- Sonnet for verification (needs reasoning, not just pattern matching)

**budget** - Minimal Opus usage
- Sonnet for anything that writes code
- Haiku for research and verification
```

Replacement:
```
**quality** - Maximum reasoning power
- Reasoning tier for all decision-making agents
- Standard tier for read-only verification
- Use when: quota available, critical architecture work

**balanced** (default) - Smart allocation
- Reasoning tier only for planning (where architecture decisions happen)
- Standard tier for execution and research (follows explicit instructions)
- Standard tier for verification (needs reasoning, not just pattern matching)
- Use when: normal development, good balance of quality and cost

**budget** - Minimal cost
- Standard tier for anything that writes code
- Fast tier for research and verification
- Use when: conserving quota, high-volume work, less critical phases
```

**Lines 39-48 (Resolution Logic section):** Update to reference abstract tiers

Current step 3: `3. Look up agent in table above`
→ `3. Look up agent's tier (reasoning/standard/fast) in table above`
Add step: `4. Resolve tier to provider-specific model ID (see model-profile-resolution.md)`
Renumber old step 4 to 5.

**Lines 61-73 (Design Rationale section — NEUT-07):** Full rewrite

Current:
```
**Why Opus for gsd-planner?**
Planning involves architecture decisions...

**Why Sonnet for gsd-executor?**
Executors follow explicit PLAN.md instructions...

**Why Sonnet (not Haiku) for verifiers in balanced?**
Verification requires goal-backward reasoning...

**Why Haiku for gsd-codebase-mapper?**
Read-only exploration and pattern extraction...
```

Replacement:
```
**Why reasoning-tier for gsd-planner?**
Planning involves architecture decisions, goal decomposition, and task design. This is where model quality has the highest impact.

**Why standard-tier for gsd-executor?**
Executors follow explicit PLAN.md instructions. The plan already contains the reasoning; execution is implementation.

**Why standard-tier (not fast) for verifiers in balanced?**
Verification requires goal-backward reasoning — checking if code *delivers* what the phase promised, not just pattern matching. Standard-tier models handle this well; fast-tier may miss subtle gaps.

**Why fast-tier for gsd-codebase-mapper?**
Read-only exploration and pattern extraction. No reasoning required, just structured output from file contents.
```

---

### File 2: `get-shit-done/references/model-profile-resolution.md` (NEUT-02)

This file needs significant expansion. Current content is 33 lines and only describes reading config + looking up a table.

**Line 1 purpose text stays.**

**Line 7-9 (Resolution Pattern):** Update bash command comment to be provider-neutral.

**Lines 14-25:** Expand to document the full flow. The current content references `model-profiles.md` and shows a Task call example with `"opus"`. Needs rewrite to show:
1. Read profile from config
2. Look up agent → tier in MODEL_PROFILES
3. detectRuntime() determines provider
4. PROVIDER_MODELS[runtime][tier] → model ID
5. GSD_MODEL override takes precedence over all

**Line 23:** `model="{resolved_model}"  # e.g., "opus" for quality profile`
→ `model="{resolved_model}"  # e.g., "reasoning" tier → "opus" on Claude Code`

Add new sections documenting:
- Tier definitions (reasoning/standard/fast — what they mean)
- Provider resolution (how runtime detection works)
- Override mechanism (GSD_MODEL env var)
- Backward compatibility (Claude Code still gets opus/sonnet/haiku)

---

### File 3: `get-shit-done/workflows/settings.md` (NEUT-03)

**Lines 45-47 (AskUserQuestion options):**

Current:
```
{ label: "Quality", description: "Opus everywhere except verification (highest cost)" },
{ label: "Balanced (Recommended)", description: "Opus for planning, Sonnet for execution/verification" },
{ label: "Budget", description: "Sonnet for writing, Haiku for research/verification (lowest cost)" }
```

Replacement:
```
{ label: "Quality", description: "Reasoning tier everywhere except verification (highest cost)" },
{ label: "Balanced (Recommended)", description: "Reasoning for planning, Standard for execution/verification" },
{ label: "Budget", description: "Standard for writing, Fast for research/verification (lowest cost)" }
```

---

### File 4: `get-shit-done/workflows/set-profile.md` (NEUT-04)

**Line 2:** `Switch the model profile used by GSD agents. Controls which Claude model each agent uses, balancing quality vs token spend.`
→ `Switch the model profile used by GSD agents. Controls which AI model tier each agent uses, balancing quality vs token spend.`

**Lines 57-63 (Example confirmation table):**

Current:
```
| Agent | Model |
|-------|-------|
| gsd-planner | opus |
| gsd-executor | sonnet |
| gsd-verifier | haiku |
```

Replacement:
```
| Agent | Tier |
|-------|------|
| gsd-planner | reasoning |
| gsd-executor | standard |
| gsd-verifier | fast |
```

---

### File 5: `get-shit-done/workflows/help.md` (NEUT-05)

**Lines 307-309 (set-profile descriptions):**

Current:
```
- `quality` — Opus everywhere except verification
- `balanced` — Opus for planning, Sonnet for execution (default)
- `budget` — Sonnet for writing, Haiku for research/verification
```

Replacement:
```
- `quality` — Reasoning tier everywhere except verification
- `balanced` — Reasoning for planning, Standard for execution (default)
- `budget` — Standard for writing, Fast for research/verification
```

---

### File 6: `get-shit-done/workflows/new-project.md` (NEUT-06)

**Lines 314-316 (Model Profile AskUserQuestion options):**

Current:
```
{ label: "Balanced (Recommended)", description: "Sonnet for most agents — good quality/cost ratio" },
{ label: "Quality", description: "Opus for research/roadmap — higher cost, deeper analysis" },
{ label: "Budget", description: "Haiku where possible — fastest, lowest cost" }
```

Replacement:
```
{ label: "Balanced (Recommended)", description: "Standard tier for most agents — good quality/cost ratio" },
{ label: "Quality", description: "Reasoning tier for research/roadmap — higher cost, deeper analysis" },
{ label: "Budget", description: "Fast tier where possible — fastest, lowest cost" }
```

---

### File 7: `README.md` (Not in requirements, but contains model names)

**Line 493:** `Control which Claude model each agent uses. Balance quality vs token spend.`
→ `Control which AI model tier each agent uses. Balance quality vs token spend.`

**Lines 495-499 (Model Profiles table):**

Current:
```
| Profile | Planning | Execution | Verification |
|---------|----------|-----------|--------------|
| `quality` | Opus | Opus | Sonnet |
| `balanced` (default) | Opus | Sonnet | Sonnet |
| `budget` | Sonnet | Sonnet | Haiku |
```

Replacement:
```
| Profile | Planning | Execution | Verification |
|---------|----------|-----------|--------------|
| `quality` | Reasoning | Reasoning | Standard |
| `balanced` (default) | Reasoning | Standard | Standard |
| `budget` | Standard | Standard | Fast |
```

## Edge Cases and Gotchas

### 1. PROVIDER_MODELS in gsd-tools.js — DO NOT TOUCH
The `PROVIDER_MODELS` table (gsd-tools.js lines 146-177) maps abstract tiers to provider-specific model names. Lines like `reasoning: 'opus'` and comments like "Claude Code: shorthand (opus, sonnet, haiku)" are **correct and should be preserved**. These are the only legitimate places for Claude model names.

### 2. README.md Is Not Listed in Requirements
NEUT-01 through NEUT-07 name 6 specific files. The README.md (lines 491-499) also contains the Opus/Sonnet/Haiku table. Success criterion 4 says "No workflow, reference, or template file contains 'Opus', 'Sonnet', or 'Haiku' as a model quality descriptor." README.md is technically none of those categories, but:
- It IS user-facing documentation
- It will confuse non-Claude models reading it
- The grep validation will catch it

**Recommendation:** Update README.md as part of this phase. The planner should include it.

### 3. model-profile-resolution.md Needs Content Addition
Unlike other files where we're replacing text, `model-profile-resolution.md` needs **new content** documenting the full resolution flow that Phase 2 built. The current 33-line file only describes reading config and looking up a table — it doesn't cover provider detection, PROVIDER_MODELS lookup, or GSD_MODEL override.

### 4. "model" Column Header in set-profile.md Example
The example table says "Model" as the column header — should change to "Tier" since the values will now be tier names not model names.

### 5. Lowercase vs Title Case
In the profile definitions table (model-profiles.md), values are lowercase: `reasoning`, `standard`, `fast` (matching code). In user-facing descriptions (help.md, settings.md), they appear as "Reasoning tier", "Standard tier" — capitalized and with "tier" suffix for clarity. In README.md table cells, title case without "tier": `Reasoning`, `Standard`, `Fast`.

### 6. Verification Strategy
After all changes, run:
```bash
grep -rn '\b[Oo]pus\b\|\b[Ss]onnet\b\|\b[Hh]aiku\b' get-shit-done/ --include='*.md'
```
This should return ZERO results. Then also check:
```bash
grep -rn '\b[Oo]pus\b\|\b[Ss]onnet\b\|\b[Hh]aiku\b' README.md
```
This should also return zero. The only legitimate occurrences are in `gsd-tools.js` (PROVIDER_MODELS).

## Open Questions

1. **Should README.md be in scope?**
   - What we know: It contains model names. It's user-facing. Requirements don't list it.
   - What's unclear: Whether the project owner considers README part of this phase.
   - Recommendation: Include it. The spirit of success criterion 4 demands it.

## Sources

### Primary (HIGH confidence)
- Direct file reads of all 7 target files in the codebase
- `gsd-tools.js` lines 125-177 — MODEL_PROFILES and PROVIDER_MODELS (verified source of truth for tier names)
- `.planning/ROADMAP.md` and `.planning/REQUIREMENTS.md` — phase goals and success criteria

### Secondary (MEDIUM confidence)
- Phase 2 research and verification docs — confirmed the abstract tier system was built as designed

## Metadata

**Confidence breakdown:**
- File identification: HIGH — exhaustive grep of all *.md files in repo for Opus/Sonnet/Haiku
- Change specification: HIGH — exact line numbers and before/after text verified by reading each file
- Edge cases: HIGH — verified PROVIDER_MODELS should be preserved; identified README gap

**Research date:** 2026-02-08
**Valid until:** 2026-03-08 (stable — content changes only, no dependency on external tools)
