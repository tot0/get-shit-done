# Phase 1: Continuation Fixes - Research

**Researched:** 2026-02-07
**Domain:** Markdown workflow authoring — implicit continuation loop patterns
**Confidence:** HIGH

## Summary

Phase 1 fixes 5 implicit continuation loops across 4 workflow files that break non-Claude models. The problem is well-understood: when a workflow says "Loop until X" or "go to step Y", Claude infers it should continue processing without ending its turn, but other models (GPT-5.3-Codex, Gemini) treat the end of their output as a natural stopping point and wait for user input — breaking the loop.

The fix pattern is already proven. Quick-001 applied it to `discuss-phase.md` on the `lupickup/planning-rules` branch and confirmed it works. The pattern has 3 components: (1) a CRITICAL warning at the top of the loop step, (2) inline enforcement at each transition point within the loop, and (3) an only-natural-pause-point marker at the legitimate stopping point. Each of the 5 remaining loops needs this same 3-component treatment adapted to its specific loop structure.

This is a pure text-editing task on markdown workflow files. No code changes, no dependencies, no architecture decisions. The risk is low and the pattern is prescriptive.

**Primary recommendation:** Apply the exact 3-component quick-001 pattern to each of the 5 identified loops, preserving surrounding context and structure exactly.

## Established Pattern (quick-001 Reference)

### The 3-Component Fix Pattern

Applied to `discuss-phase.md` `discuss_areas` step on the `lupickup/planning-rules` branch. This is the canonical reference for all continuation fixes.

**Component 1: CRITICAL warning at top of loop step**

Placed immediately after the step introduction, before any loop body:

```markdown
**CRITICAL: Loop continuation — This step is a LOOP over [items]. You MUST NOT end your turn until [completion condition]. After receiving ANY tool response (including "[option name]"), you MUST immediately continue processing — do NOT end your turn or wait for further input.**
```

**Component 2: Inline enforcement at transition points**

Placed at each point where the model might incorrectly stop:

```markdown
**DO NOT end your turn here.** Immediately [continue action]. The user's selection of "[option]" is NOT a signal to stop — it is a signal to continue to the next iteration of this loop.
```

**Component 3: Only-natural-pause-point marker**

Placed at the one legitimate stopping point in the loop:

```markdown
This is the ONLY point where [the loop/step] naturally pauses for user input.
```

### Pattern Rules

| Rule | Rationale |
|------|-----------|
| Use EXACT phrasing "MUST NOT end your turn" | Consistency across all workflows; belt-and-suspenders requires predictable language |
| Use EXACT phrasing "DO NOT end your turn here" | Same — these are the two canonical phrases |
| Place Component 1 BEFORE the loop body starts | Model needs the warning before it enters the loop, not mid-loop |
| Place Component 2 at EVERY transition point | Any place the model outputs text and then needs to continue is a risk |
| Place Component 3 at exactly ONE place | Clarifies where the loop legitimately yields control |
| Never remove existing text | These are additive insertions, not replacements |

## The 5 Loops That Need Fixing

### Loop 1: new-project.md — Questioning Loop (line ~106-118)

**File:** `get-shit-done/workflows/new-project.md`
**Step:** Step 3 (Deep Questioning), "Decision gate" section
**Current text:**
```
If "Keep exploring" — ask what they want to add, or identify gaps and probe naturally.

Loop until "Create PROJECT.md" selected.
```

**What breaks:** After user selects "Keep exploring" via AskUserQuestion, non-Claude models end their turn instead of asking follow-up questions. The "Loop until" instruction is implicit — it tells the model to loop but doesn't enforce continuation after receiving the tool response.

**Fix approach:**
- **Component 1:** Add CRITICAL warning before the Decision gate section (around line 106). The loop encompasses the entire questioning flow — from the AskUserQuestion through handling "Keep exploring" and looping back to ask again.
- **Component 2:** After "If 'Keep exploring'" line (line 116), add inline enforcement: the model must immediately ask follow-up questions, not stop.
- **Component 3:** Mark "Create PROJECT.md" selection as the only natural pause point (where the loop exits to Step 4).

**Surrounding context to preserve:** The "Decision gate" section is part of the larger Step 3 (Deep Questioning). The fix should not alter the questioning philosophy or the AskUserQuestion structure.

### Loop 2: new-project.md — Roadmap Approval Loop (line ~819-848)

**File:** `get-shit-done/workflows/new-project.md`
**Step:** Step 8 (Create Roadmap), roadmap approval section
**Current text:**
```
**If "Adjust phases":**
- Get user's adjustment notes
- Re-spawn roadmapper with revision context:
  [Task spawn code]
- Present revised roadmap
- Loop until user approves

**If "Review full file":** Display raw `cat .planning/ROADMAP.md`, then re-ask.
```

**What breaks:** After user selects "Adjust phases" and provides notes, the model re-spawns the roadmapper but then ends its turn instead of presenting the revised roadmap and re-asking for approval. Similarly, after "Review full file", the model displays the file but doesn't re-ask.

**Fix approach:**
- **Component 1:** Add CRITICAL warning before the AskUserQuestion (around line 819). The loop encompasses: present roadmap → ask approval → handle response → (if adjust: re-spawn, re-present, re-ask) → (if review: display, re-ask).
- **Component 2:** After the Task spawn in the "Adjust phases" block (line ~846-847), add enforcement: model must present the revised roadmap AND re-ask for approval. After the "Review full file" line (line 850), add enforcement: model must re-present the approval question.
- **Component 3:** Mark "Approve" as the only natural pause/exit point.

**Surrounding context to preserve:** The Task() spawn block and its formatting, the commit step after approval.

### Loop 3: new-milestone.md — Roadmap Approval Loop (line ~304-309)

**File:** `get-shit-done/workflows/new-milestone.md`
**Step:** Step 10 (Create Roadmap), approval section
**Current text:**
```
**If "Adjust":** Get notes, re-spawn roadmapper with revision context, loop until approved.
**If "Review":** Display raw ROADMAP.md, re-ask.
```

**What breaks:** Identical pattern to Loop 2 but more compact. The "loop until approved" is a single-line instruction that non-Claude models don't treat as a continuation requirement.

**Fix approach:**
- **Component 1:** Add CRITICAL warning before the AskUserQuestion (around line 304). Same loop structure as new-project.md but condensed.
- **Component 2:** Expand the one-liner "If 'Adjust'" to include explicit enforcement after re-spawning. Add enforcement after "If 'Review'" to ensure re-asking.
- **Component 3:** Mark "Approve" as the only natural exit point.

**Note:** This loop is structurally identical to Loop 2. The fix should use the same language, adapted for the more compact format of this file.

### Loop 4: transition.md — Auto-Continuation (lines ~433, ~478)

**File:** `get-shit-done/workflows/transition.md`
**Step:** `offer_next_phase` step, Route A (yolo mode) and Route B (yolo mode)
**Current text (Route A):**
```
⚡ Auto-continuing: Plan Phase [X+1] in detail
```
Exit skill and invoke SlashCommand("/gsd:plan-phase [X+1]")

**Current text (Route B):**
```
⚡ Auto-continuing: Complete milestone and archive
```
Exit skill and invoke SlashCommand("/gsd:complete-milestone {version}")

**What breaks:** The model outputs "Auto-continuing" text, then is expected to invoke a SlashCommand. Non-Claude models may treat the output text as the end of their turn and not invoke the SlashCommand. The text output followed by a tool invocation is an implicit continuation — the model must not stop between outputting text and calling the tool.

**Fix approach:**
- **Component 2 only (no loop):** These aren't loops — they're single-shot continuations. Add inline enforcement after the banner text: "DO NOT end your turn after displaying the above message. You MUST immediately invoke the SlashCommand below."
- No Component 1 (no loop to warn about) and no Component 3 (no natural pause point — the entire sequence must execute without stopping).

**Note:** These are the simplest fixes. The continuation is text → tool call, not a loop. But the pattern is the same: explicit instruction that the model must not stop.

### Loop 5: verify-work.md — Test Presentation Loop (line ~255)

**File:** `get-shit-done/workflows/verify-work.md`
**Step:** `process_response` step
**Current text:**
```
If more tests remain → Update Current Test, go to `present_test`
If no more tests → Go to `complete_session`
```

**What breaks:** After processing a user's test response and updating the file, the model ends its turn instead of continuing to the next test. The "go to `present_test`" is an implicit continuation — it tells the model to jump to another step but doesn't enforce that the jump happens without ending the turn.

**Fix approach:**
- **Component 1:** Add CRITICAL warning at the top of `process_response` step (or reinforce in `present_test`). The loop spans: present test → wait for response → process response → (if more: go to present_test). The entire test-response-test cycle must be treated as a single continuous loop.
- **Component 2:** At line 255, after "If more tests remain", add enforcement: "DO NOT end your turn here. Immediately update the Current Test section and present the next test."
- **Component 3:** Mark "If no more tests" / complete_session as the only natural exit point. Also, the `present_test` step itself naturally pauses for user input (waiting for test response) — this is a legitimate pause within the loop, but the pause is for USER input to the test, not for ending the turn.

**Subtlety:** This loop has a legitimate pause point WITHIN the loop (waiting for user test response at `present_test`), but the transition from `process_response` back to `present_test` must not include an extra turn-ending. The fix should clarify: "After processing the response, immediately present the next test — do not end your turn between processing a response and presenting the next test."

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Continuation enforcement | Custom XML tags, model-conditional logic, or runtime-specific handling | The quick-001 3-component text pattern | Proven to work, belt-and-suspenders philosophy, zero complexity |
| Loop detection | Automated tools to scan for implicit loops | The 5-loop audit list from quick-002 | The audit is comprehensive; scanning tools would add false positives |

**Key insight:** This is a text-editing task, not an engineering task. The "technology" is specific English phrasing that has been empirically validated to keep models in-loop. Don't over-engineer it.

## Common Pitfalls

### Pitfall 1: Placing Component 1 Too Late

**What goes wrong:** The CRITICAL warning is placed inside the loop body instead of before it. By the time the model reads it, it may have already decided to end its turn.
**Why it happens:** It feels natural to put the warning near the transition point rather than at the top of the step.
**How to avoid:** Component 1 goes BEFORE the loop body begins — at the top of the step or section, before any loop logic.
**Warning signs:** The warning appears after the first AskUserQuestion in the loop.

### Pitfall 2: Missing a Transition Point

**What goes wrong:** One of the branches within a loop doesn't get a Component 2 inline enforcement, and that branch becomes the one that breaks.
**Why it happens:** Loops often have multiple paths (e.g., "Adjust" AND "Review full file" in the roadmap approval loop). It's easy to fix one and miss the other.
**How to avoid:** For each loop, enumerate ALL branches that lead back to the top of the loop. Each needs Component 2.
**Warning signs:** Testing shows the loop works for some user responses but breaks for others.

### Pitfall 3: Accidentally Removing the Legitimate Pause Point

**What goes wrong:** The fix is so aggressive about "MUST NOT end your turn" that it also prevents the model from stopping at the ONE legitimate stopping point.
**Why it happens:** Copy-pasting enforcement language without marking the natural exit.
**How to avoid:** Always include Component 3 to mark where the loop SHOULD stop. This gives the model a clear signal: "here you may stop; everywhere else you must not."
**Warning signs:** The model never stops and loops infinitely.

### Pitfall 4: Changing the Meaning of Existing Text

**What goes wrong:** The fix rephrases or restructures the existing workflow text, introducing subtle behavioral changes.
**Why it happens:** Wanting to "clean up" while adding continuation cues.
**How to avoid:** These are ADDITIVE insertions only. Never delete, rephrase, or reorder existing text. The fix adds new lines; it doesn't change old ones.
**Warning signs:** Diff shows deletions or modifications to existing lines (should only show additions).

### Pitfall 5: Inconsistent Phrasing Across Loops

**What goes wrong:** Different loops use slightly different continuation language, reducing the belt-and-suspenders effectiveness.
**Why it happens:** Writing each fix independently without referencing the canonical pattern.
**How to avoid:** Copy the exact phrasing from the quick-001 discuss-phase.md fix and adapt minimally for context.
**Warning signs:** Grep for "MUST NOT end your turn" finds variations rather than the canonical phrase.

## Architecture Patterns

### Edit Pattern for Each Loop

Every fix follows this structure:

1. **Identify the loop boundary** — where does the loop start and end?
2. **Identify all transition points** — where within the loop might the model incorrectly stop?
3. **Identify the natural exit** — where SHOULD the loop stop?
4. **Insert Component 1** at the top of the loop boundary
5. **Insert Component 2** at each transition point
6. **Insert Component 3** at the natural exit
7. **Verify** the fix is purely additive (no existing text changed)

### File Edit Summary

| File | Loops | Insertions | Complexity |
|------|-------|------------|------------|
| `get-shit-done/workflows/new-project.md` | 2 (questioning + roadmap approval) | ~6-8 lines per loop | Medium — two distinct loop patterns |
| `get-shit-done/workflows/new-milestone.md` | 1 (roadmap approval) | ~4-6 lines | Low — structurally identical to new-project.md Loop 2 |
| `get-shit-done/workflows/transition.md` | 2 (auto-continuation, Route A + B) | ~2-3 lines each | Low — single-shot continuations, not loops |
| `get-shit-done/workflows/verify-work.md` | 1 (test presentation) | ~4-6 lines | Medium — loop with legitimate internal pause |

**Total:** 5 loops across 4 files, approximately 20-30 lines of additions.

## Code Examples

### Example 1: discuss-phase.md Quick-001 Fix (CANONICAL REFERENCE)

Source: `git diff lupickup/multi-runtime-compat..lupickup/planning-rules -- get-shit-done/workflows/discuss-phase.md`

**Component 1 (top of step):**
```markdown
**CRITICAL: Loop continuation — This step is a LOOP over all selected areas. You MUST NOT end your turn until ALL selected areas have been discussed AND the final "Ready to create context?" question has been asked. After receiving ANY tool response (including "Next area"), you MUST immediately continue processing — do NOT end your turn or wait for further input.**
```

**Component 2 (at transition point):**
```markdown
   **DO NOT end your turn here.** Immediately announce the next area and begin asking questions for it. The user's selection of "Next area" is NOT a signal to stop — it is a signal to continue to the next iteration of this loop.
```

**Component 3 (at natural exit):**
```markdown
   This is the ONLY point where the discussion loop naturally pauses for user input about completion.
```

### Example 2: Adapted Pattern for Roadmap Approval Loop

How the pattern would adapt for new-project.md Loop 2:

**Component 1:**
```markdown
**CRITICAL: Loop continuation — This is a LOOP for roadmap approval. You MUST NOT end your turn until the user selects "Approve". After receiving ANY tool response (including "Adjust phases" or "Review full file"), you MUST immediately continue processing — do NOT end your turn.**
```

**Component 2 (after Adjust phases re-spawn):**
```markdown
**DO NOT end your turn here.** Immediately present the revised roadmap inline and re-ask the approval question. The user's selection of "Adjust phases" is NOT a signal to stop — it is a signal to revise and re-present.
```

**Component 2 (after Review full file):**
```markdown
**DO NOT end your turn here.** After displaying the file, immediately re-ask the approval question.
```

**Component 3:**
```markdown
This is the ONLY point where the roadmap approval loop exits. Proceed to commit.
```

### Example 3: Adapted Pattern for Auto-Continuation (transition.md)

**Inline enforcement (no Component 1/3 — not a loop):**
```markdown
**DO NOT end your turn after displaying the above message.** You MUST immediately invoke the SlashCommand below. The "Auto-continuing" message is NOT the end of your turn — it is a preamble to the tool invocation that follows.
```

## Open Questions

1. **Other "Go to" patterns in progress.md and execute-phase.md**
   - What we know: These use "Go to Route A/B/C" language but are routing/decision-tree patterns, not loops. They direct the model to output a specific section once, not to loop back.
   - What's unclear: Whether these could also break on non-Claude models (model might not "go to" the indicated section).
   - Recommendation: Out of scope for Phase 1 per the audit. The audit specifically identified 5 loops; the routing patterns are a different category. If they break, they'd be a separate fix.

2. **verify-work.md revision loop (lines ~441-490)**
   - What we know: There's a planner ↔ checker revision loop (max 3 iterations) in the gap closure flow. It uses "After planner returns → spawn checker again" language.
   - What's unclear: Whether this loop has the same implicit continuation problem.
   - Recommendation: The audit identified line 255 (test presentation loop) as the specific verify-work.md issue. The revision loop involves subagent spawning (Task()) which is a different mechanism — the continuation there is driven by Task() return handling, not by model turn-ending. Lower risk, but worth noting.

## Sources

### Primary (HIGH confidence)
- `git diff lupickup/multi-runtime-compat..lupickup/planning-rules -- get-shit-done/workflows/discuss-phase.md` — the canonical quick-001 fix showing the exact 3-component pattern
- `get-shit-done/workflows/new-project.md` lines 106-118, 819-848 — source files read directly
- `get-shit-done/workflows/new-milestone.md` lines 304-309 — source file read directly
- `get-shit-done/workflows/transition.md` lines 426-437, 471-482 — source files read directly
- `get-shit-done/workflows/verify-work.md` lines 248-257 — source file read directly
- `.planning/ROADMAP.md` — phase definition and success criteria
- `.planning/REQUIREMENTS.md` — CONT-01 through CONT-05 requirement definitions

### Secondary (MEDIUM confidence)
- Phase context provided by orchestrator — audit findings, loop descriptions, requirement mappings (cross-verified against source files)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no libraries; this is pure markdown editing
- Architecture: HIGH — the 3-component pattern is directly observable in the quick-001 diff
- Pitfalls: HIGH — pitfalls derived from analyzing the pattern and the specific loop structures
- Loop identification: HIGH — all 5 loops verified by reading the source files directly and matching against the audit descriptions

**Research date:** 2026-02-07
**Valid until:** Indefinite — the pattern and source files are stable; this is not a fast-moving domain
