---
phase: quick-002
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - .planning/quick/002-audit-gsd-workflows-for-model-agnostic-c/002-AUDIT.md
autonomous: true

must_haves:
  truths:
    - "Every model-sensitive pattern across all GSD workflows and commands is catalogued with severity and affected files"
    - "A concrete proposal exists for making model-switching per-invocation rather than project-level config"
    - "The audit distinguishes between Claude-specific assumptions, continuation/loop patterns, and architectural constraints"
  artifacts:
    - path: ".planning/quick/002-audit-gsd-workflows-for-model-agnostic-c/002-AUDIT.md"
      provides: "Comprehensive audit document with issue catalog and architecture proposal"
      contains: "Model-Agnostic Compatibility Audit"
  key_links: []
---

<objective>
Audit all GSD workflows, commands, templates, and tooling for model-specific assumptions, and propose an architecture that makes switching models per-invocation trivial.

Purpose: The user discovered that discuss-phase broke with GPT-5.3-Codex due to implicit continuation assumptions (quick-001). Now they want a comprehensive catalogue of everything else that could break or needs adaptation, plus a design for making model-switching trivial (not project-level config).

Output: A single audit document (002-AUDIT.md) with: (1) categorized inventory of all model-sensitive patterns, (2) severity/effort ratings, (3) architecture proposal for per-invocation model switching.
</objective>

<execution_context>
@/Users/lupickup/.config/opencode/get-shit-done/workflows/execute-plan.md
@/Users/lupickup/.config/opencode/get-shit-done/templates/summary.md
</execution_context>

<context>
All GSD workflow files:
@get-shit-done/workflows/discuss-phase.md
@get-shit-done/workflows/execute-phase.md
@get-shit-done/workflows/execute-plan.md
@get-shit-done/workflows/plan-phase.md
@get-shit-done/workflows/new-project.md
@get-shit-done/workflows/new-milestone.md
@get-shit-done/workflows/quick.md
@get-shit-done/workflows/research-phase.md
@get-shit-done/workflows/verify-phase.md
@get-shit-done/workflows/verify-work.md
@get-shit-done/workflows/transition.md
@get-shit-done/workflows/map-codebase.md
@get-shit-done/workflows/diagnose-issues.md
@get-shit-done/workflows/audit-milestone.md
@get-shit-done/workflows/settings.md
@get-shit-done/workflows/set-profile.md
@get-shit-done/workflows/discovery-phase.md
@get-shit-done/workflows/complete-milestone.md

Key command files:
@commands/gsd/discuss-phase.md
@commands/gsd/execute-phase.md
@commands/gsd/plan-phase.md
@commands/gsd/research-phase.md
@commands/gsd/debug.md
@commands/gsd/new-project.md
@commands/gsd/quick.md
@commands/gsd/settings.md
@commands/gsd/set-profile.md

Tooling and references:
@get-shit-done/bin/gsd-tools.js
@get-shit-done/references/model-profiles.md
@get-shit-done/references/model-profile-resolution.md
@get-shit-done/references/continuation-format.md
@get-shit-done/templates/config.json
@get-shit-done/templates/planner-subagent-prompt.md

Prior fix context:
@.planning/quick/001-fix-discuss-phase-auto-continuation-for-/001-SUMMARY.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Audit all workflows and commands for model-sensitive patterns</name>
  <files>.planning/quick/002-audit-gsd-workflows-for-model-agnostic-c/002-AUDIT.md</files>
  <action>
Read EVERY workflow file in `get-shit-done/workflows/`, every command file in `commands/gsd/`, the tooling in `get-shit-done/bin/gsd-tools.js`, all templates and references. Systematically catalogue model-sensitive patterns into the following categories:

**Category 1: Continuation/Loop Patterns (like the quick-001 fix)**
Search for patterns where a model must continue processing without ending its turn. Locations to check:
- `discuss-phase.md` — already fixed (quick-001), but verify completeness
- `new-project.md` — has "Loop until 'Create PROJECT.md' selected" (line 118)
- `new-milestone.md` — has "loop until approved" (line 309, 848 area)
- `execute-phase.md` — has "Repeat until plan completes" (line 258)
- `verify-work.md` — has "revision_loop" step (line 441)
- `plan-phase.md` — has "Revision Loop (Max 3 Iterations)" (line 293)
- `transition.md` — has "Auto-continuing" patterns (lines 433, 478)
- Any other workflow with multi-step loops

For each, note: file, line range, current language, whether it uses implicit or explicit continuation cues.

**Category 2: Model Name Hardcoding**
- `gsd-tools.js` MODEL_PROFILES table uses "opus", "sonnet", "haiku" — these are Claude-specific model names
- `references/model-profiles.md` — entire file assumes Claude model family
- `settings.md` — profile descriptions reference "Opus everywhere", "Sonnet for execution"
- `set-profile.md` — quality/balanced/budget assumes Claude model family
- `help.md` — model profile descriptions
- Check if any workflow hardcodes a model name directly (not through resolve-model)

**Category 3: Claude-Specific Tool/Feature Assumptions**
- `Task()` tool usage for spawning subagents — this is Claude Code's Task tool. Does GPT-5.3-Codex / OpenCode have an equivalent? What's the abstraction?
- `AskUserQuestion` tool — used in discuss-phase. Is this universal or Claude Code-specific?
- `SlashCommand()` invocations in transition.md
- `@file` references — is this a universal convention or Claude Code-specific?
- `subagent_type` parameter in Task calls
- `model=` parameter in Task calls

**Category 4: Path Assumptions**
- ~80+ references to `~/.claude/get-shit-done/` across workflows — the installed path is actually `~/.config/opencode/get-shit-done/` when using OpenCode
- `~/.claude/agents/` references in plan-phase.md, new-project.md, research-phase.md
- Are these paths resolved by the host tool (OpenCode/Claude Code) or hardcoded?

**Category 5: Behavioral Assumptions About Model Capabilities**
- Workflows assume certain reasoning depth (e.g., goal-backward methodology, dependency graph construction)
- Context window size assumptions (the "Quality Degradation Curve" in planner agent, 50% context target)
- Instruction-following fidelity (complex XML-structured prompts, multi-step procedures)
- Structured output expectations (YAML frontmatter, specific markdown formats)
- Do any workflows assume the model knows about Claude-specific things?

**Category 6: Architecture Gaps for Multi-Model Support**
- `resolve-model` returns abstract names ("opus", "sonnet", "haiku") not actual model IDs
- No mechanism to map abstract names to provider-specific model IDs (e.g., "opus" → "claude-opus-4-6" or "gpt-5.3-codex")
- Model profile is project-level config (`config.json`) — user wants per-invocation switching
- No way to specify a model override when invoking a command (e.g., `/gsd:execute-phase 2 --model gpt-5.3-codex`)
- No model capability detection (context window size, tool support, structured output ability)

For each issue found, rate:
- **Severity:** breaking (workflow fails), degraded (works but worse), cosmetic (confusing but functional)
- **Effort:** trivial (text change), moderate (code change), significant (architectural change)
- **Priority:** P0 (must fix for basic multi-model), P1 (important for good experience), P2 (nice to have)

**Then write the architecture proposal section covering:**

1. **Per-invocation model switching** — How should the user specify which model to use? Options:
   - Environment variable (`GSD_MODEL=gpt-5.3-codex /gsd:plan-phase 2`)
   - Command flag (`/gsd:plan-phase 2 --model gpt-5.3-codex`)
   - Session-level setting (persists for the conversation but not the project)
   - Evaluate tradeoffs of each

2. **Model capability profiles** — Instead of quality/balanced/budget mapping to opus/sonnet/haiku, define abstract capability tiers and let providers map to them:
   - Tier: "reasoning" → Claude: opus, OpenAI: gpt-5.3-codex, etc.
   - Tier: "execution" → Claude: sonnet, OpenAI: gpt-4.1, etc.
   - Where does this mapping live? Who maintains it?

3. **Behavioral adaptation layer** — Based on the continuation pattern fix in quick-001, what patterns need model-specific behavioral instructions?
   - Could there be a model-quirks file that workflows load?
   - Should the continuation instructions always be explicit (belt-and-suspenders) rather than model-conditional?

4. **Path abstraction** — How to handle `~/.claude/` vs `~/.config/opencode/` etc.
   - Is this already handled by the host tool?
   - Does GSD need its own path resolution?

5. **Migration path** — What's the recommended order of changes? Which are quick wins vs architectural projects?

Write all findings to `.planning/quick/002-audit-gsd-workflows-for-model-agnostic-c/002-AUDIT.md` as a well-structured document.
  </action>
  <verify>
Read 002-AUDIT.md and verify:
- All 6 categories are present with specific file:line references
- Each issue has severity/effort/priority rating
- The architecture proposal covers all 5 sub-topics
- Total issue count is documented
- Quick-001 fix is referenced as context for the continuation pattern category
  </verify>
  <done>A comprehensive audit document exists cataloguing every model-sensitive pattern in GSD with severity ratings, and proposing an architecture for trivial per-invocation model switching</done>
</task>

</tasks>

<verification>
1. Read the audit document end-to-end
2. Spot-check 3-5 specific issues against the actual source files to verify accuracy
3. Verify the architecture proposal is concrete enough to plan implementation from
</verification>

<success_criteria>
- The audit document identifies at least 15 distinct model-sensitive patterns across the 6 categories
- Every pattern has a specific file reference (not just "some workflows")
- The architecture proposal for per-invocation model switching is actionable (could be turned into implementation tasks)
- The document serves as a single reference for planning the multi-model compatibility work
</success_criteria>

<output>
After completion, create `.planning/quick/002-audit-gsd-workflows-for-model-agnostic-c/002-SUMMARY.md`
</output>
