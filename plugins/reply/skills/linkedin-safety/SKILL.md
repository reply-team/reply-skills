---
name: linkedin-safety
description: >
  Keep LinkedIn accounts safe under automation: invitation pacing, messaging cadence,
  daily limits and recovery when LinkedIn flags activity. Use before any LinkedIn outreach
  volume, when configuring LinkedIn account limits, or when an account shows warnings.
metadata:
  version: 0.1.0
  category: protection
  maturity: draft
  status: active
  owner: outbound-experts
  tags: [linkedin, limits, safety, protection]
  tools: [reply-cli]
  api: [linkedin-accounts]
  relations:
    recommends: [launch-outreach]
---

# LinkedIn safety

> **Expert skeleton.** Structure is final; pacing numbers and recovery playbooks need validation
> by Reply's experts before this skill can leave `draft`. Unvalidated spots are marked
> `TODO(expert)`.

## Purpose

A restricted LinkedIn account can cost a user their network. Automation must stay well inside
LinkedIn's behavioral limits — this skill encodes those guardrails and what to do when warnings
appear.

## When to use / when NOT to use

- Use before enabling LinkedIn steps in sequences, when setting account limits, and on any
  account warning.
- Email-only campaigns don't need this skill.

## Prerequisites

`channels:read` (+ `channels:operate` for limit changes). LinkedIn account connected in Reply.

## Planning guidance

Answer before enabling LinkedIn steps: account age and standing? Sales Navigator or basic?
Current daily limits configured in Reply vs account maturity?

- TODO(expert): recommended daily caps (connection requests, messages, InMails, profile views)
  by account maturity tier.
- TODO(expert): safe weekly invitation totals and acceptance-rate floor below which pausing is
  mandatory.

## Execution guidance

1. **Inspect the account:** `reply api /v3/linkedin-accounts` (status, limits, usage — see the
   LinkedIn-accounts doc pages). Alerts/disconnections are a hard stop.
2. **Configure conservative limits** via the update-limits endpoint per docs.
   TODO(expert): concrete starting values and ramp rules.
3. **Cadence:** human-plausible pacing, business-hours schedules, no bursts.
4. **Watch acceptance rate:** low acceptance on invitations is the leading indicator of trouble.
   TODO(expert): thresholds and cool-down durations.

## Validation

After configuration: re-read account limits and usage; confirm no alert flags.

## Reporting

Volumes per action type, acceptance rates, any warnings observed, limit changes made.

## Failure modes

- Account flagged/restricted → stop ALL automation on that account immediately; recovery is
  manual and slow. TODO(expert): recovery playbook and safe-return criteria.
- Pending connection pile-up → withdraw stale invitations. TODO(expert): aging threshold.

## Safety

Same protective-first rule as deliverability: on account warnings the agent pauses LinkedIn
activity FIRST, informs the user immediately; resuming requires explicit confirmation.
Voice messages and InMails to real prospects always require per-message user approval.

## Related skills

- `launch-outreach` — consults this skill before enabling LinkedIn steps.

## Changelog

- 0.1.0 (2026-07-27): expert skeleton — structure + safety posture; numbers pending expert
  validation.
