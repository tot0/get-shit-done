---
phase: quick-001
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - get-shit-done/workflows/discuss-phase.md
  - commands/gsd/discuss-phase.md
autonomous: true

must_haves:
  truths:
    - "Non-Opus models (e.g. GPT-5.3-Codex) continue processing the next area after user selects 'Next area' without ending their turn"
    - "The discussion loop completes all selected areas in a single continuous flow"
    - "After all areas are exhausted, the model asks 'Ready to create context?'"
  artifacts:
    - path: "get-shit-done/workflows/discuss-phase.md"
      provides: "Updated discuss_areas step with explicit continuation instructions"
      contains: "MUST NOT end your turn"
    - path: "commands/gsd/discuss-phase.md"
      provides: "Updated command with explicit loop continuation language"
      contains: "continue"
  key_links:
    - from: "discuss_areas step"
      to: "next area iteration"
      via: "explicit continuation instruction after tool response"
      pattern: "(MUST NOT end|MUST continue|DO NOT stop|immediately proceed)"
---

<objective>
Fix the discuss-phase workflow so that non-Opus models (e.g. GPT-5.3-Codex) correctly continue processing the next discussion area after receiving a "Next area" tool response, instead of ending their turn.

Purpose: The current workflow uses implicit continuation language that Opus interprets correctly but other models treat as a natural stopping point. Adding explicit "do not end your turn" instructions ensures cross-model compatibility.

Output: Updated `get-shit-done/workflows/discuss-phase.md` and `commands/gsd/discuss-phase.md`
</objective>

<execution_context>
@/Users/lupickup/.config/Claude/get-shit-done/workflows/execute-plan.md
@/Users/lupickup/.config/Claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@get-shit-done/workflows/discuss-phase.md
@commands/gsd/discuss-phase.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add explicit continuation instructions to the discuss_areas step in the workflow</name>
  <files>get-shit-done/workflows/discuss-phase.md</files>
  <action>
In `get-shit-done/workflows/discuss-phase.md`, modify the `discuss_areas` step (lines ~228-276) to add explicit continuation language that prevents models from ending their turn mid-loop.

Specific changes:

1. **Add a prominent continuation warning at the top of the step** (after `<step name="discuss_areas">`):
   Add a `**CRITICAL: Loop continuation**` block that states:
   - This step is a LOOP over all selected areas. You MUST NOT end your turn until ALL selected areas have been discussed AND the final "Ready to create context?" question has been asked.
   - After receiving ANY tool response (including "Next area"), you MUST immediately continue processing — do NOT end your turn or wait for further input.

2. **Modify the "After 4 questions, check" section (around lines 248-254)**:
   After the existing text about "If 'Next area' → proceed to next selected area", add explicit instruction:
   - "**DO NOT end your turn here.** Immediately announce the next area and begin asking questions for it. The user's selection of 'Next area' is NOT a signal to stop — it is a signal to continue to the next iteration of this loop."

3. **Modify the "After all areas complete" section (around lines 256-259)**:
   Add: "This is the ONLY point where the discussion loop naturally pauses for user input about completion."

Keep all existing content intact — these are additions, not replacements. The goal is to make implicit continuation explicit without changing the workflow's logic or behavior.
  </action>
  <verify>
Read the updated file and confirm:
- The CRITICAL continuation warning exists near the top of the discuss_areas step
- The "Next area" handling has explicit "DO NOT end your turn" language
- The "After all areas complete" section clarifies it's the only natural pause point
- All original workflow content is preserved
  </verify>
  <done>The discuss_areas step contains explicit, prominent instructions that prevent models from ending their turn mid-loop, while preserving all original workflow logic</done>
</task>

<task type="auto">
  <name>Task 2: Add matching continuation language to the command definition</name>
  <files>commands/gsd/discuss-phase.md</files>
  <action>
In `commands/gsd/discuss-phase.md`, update the `<process>` section's probing depth bullet points (lines ~66-70) to include explicit continuation language.

Current text (around lines 66-70):
```
**Probing depth:**
- Ask 4 questions per area before checking
- "More questions about [area], or move to next?"
- If more → ask 4 more, check again
- After all areas → "Ready to create context?"
```

Replace with:
```
**Probing depth (CRITICAL — do not end turn mid-loop):**
- Ask 4 questions per area before checking
- "More questions about [area], or move to next?"
- If more → ask 4 more, check again
- If next → **immediately continue** to the next area (do NOT end your turn — this is a loop)
- After ALL areas discussed → "Ready to create context?" (this is the only natural stopping point)
```

This ensures the command-level instructions match the workflow-level instructions, reinforcing the continuation behavior from both entry points.
  </action>
  <verify>
Read the updated file and confirm:
- The probing depth section has "(CRITICAL — do not end turn mid-loop)" in its header
- "If next" bullet explicitly says "immediately continue" and "do NOT end your turn"  
- "After ALL areas" bullet clarifies it's the only natural stopping point
  </verify>
  <done>The command definition's process section contains explicit continuation language matching the workflow file</done>
</task>

</tasks>

<verification>
1. Read both modified files end-to-end to verify no content was lost or corrupted
2. Verify the continuation language is prominent and unambiguous
3. Verify the workflow logic (4 questions → check → next area loop → final question) is unchanged
</verification>

<success_criteria>
- Both files contain explicit "do not end your turn" / "immediately continue" instructions in the discussion loop sections
- The original workflow logic and all existing content is fully preserved
- The continuation instructions are prominent enough that any LLM would recognize them as mandatory behavioral constraints
</success_criteria>

<output>
After completion, create `.planning/quick/001-fix-discuss-phase-auto-continuation-for-/001-SUMMARY.md`
</output>
