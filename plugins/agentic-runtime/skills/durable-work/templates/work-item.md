---
id: WI-000
goal: <goal-slug>
status: todo              # todo | in-progress | blocked | awaiting-approval | done | cancelled
depends-on: []
tools: []                 # e.g. [reply-cli]
operations: []            # the vendor-neutral operations this item performs, e.g. [campaign.enroll]
idempotency-key:          # generate BEFORE the first attempt — what recovers an ambiguous outcome
outputs: []               # artifact paths / created entity IDs — fill AS SOON as they exist
# approval:               # present only while status = awaiting-approval
#   question: "Exact yes/no question for the user"
history: []               # append-only: "- 2026-07-27T14:02Z started"
---

# WI-000 — <objective in one line>

## Objective

What done looks like for this item — observable, verifiable.

## Approach

Steps, skills and commands to use. Small enough to complete in one focused session.

## Completion criteria

- [ ] …

## Notes

Checkpoint state, partial results, links — everything a fresh session needs to resume
without redoing completed work.
