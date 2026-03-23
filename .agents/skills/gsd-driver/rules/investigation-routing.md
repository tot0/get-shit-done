# Investigation Routing Rule

Use this rule for line-of-inquiry work where the goal is to gather evidence quickly.

## Trigger

Apply when user asks to:
- inspect codebase behavior
- trace symbol/file ownership
- grep/read many files
- diagnose likely root cause
- summarize architecture or dependency links

## Execution pattern

1. Define one inquiry in a single sentence
2. Gather only evidence relevant to that inquiry
3. Prefer read-only operations first
4. Summarize in 3 parts:
   - Key signal
   - Risk/uncertainty
   - Recommended next action

## Model preference

If runtime supports explicit model selection for sub-agents:
- prefer Sonnet-tier model for investigation/synthesis tasks

If not supported:
- use current model but reduce scope per subtask and increase parallel investigation depth

## Output compression

Never paste large raw output unless requested.
Use:
- top findings
- minimal quoted evidence
- referenced file paths

## Exit criteria

Investigation is complete when:
- a plausible root cause or decision-quality summary is produced
- next action is unambiguous
- user can choose: proceed with GSD phase step or continue ad-hoc
