---
name: linkedin-guardrails
description: >
  Keep social accounts safe under automation: invitation pacing, messaging cadence, daily
  limits and recovery when the platform flags activity. Use before any LinkedIn outreach
  volume, when configuring account limits, or when an account shows a warning.
metadata:
  version: 0.2.0
  pack: ai-sdr-core
  category: protection
  maturity: draft
  status: active
  owner: outbound-experts
  tags: [linkedin, limits, pacing, protection]
  tools: []
  api: []
  relations:
    depends-on: [sdr-operations]
    recommends: [campaign-launch, approval-boundaries]
---

# LinkedIn guardrails

> **Expert skeleton.** Structure and safety posture are final. Every pacing number and every
> recovery playbook is `TODO(expert)` and needs validation by Reply's experts before this
> skill leaves `draft`.

## Purpose

A restricted social account can cost the user their professional network — an asset that is
not replaceable and not insured. Automation has to stay well inside platform behavioural
limits, with a wide margin rather than a narrow one. This skill encodes those constraints and
what to do when warnings appear.

## When to use / when NOT to use

- Use before enabling social steps in a sequence, when setting account limits, and on any
  account warning.
- Email-only campaigns do not need this skill.
- The specifics here are LinkedIn-shaped because that is the channel in use; the posture —
  wide margins, protective action first, manual recovery — generalises to any platform that
  polices automation.

## Prerequisites

- A connected account, and visibility of its state and limits (`sender.list`,
  `sender.health`, `sender.limits.read`).

## Planning guidance

Answer before enabling social steps:

- How old is the account, and what is its standing?
- What tier of the platform is it on — the allowances differ.
- What limits are currently configured, and are they appropriate for the account's maturity
  rather than for the campaign's ambition?

Open expert questions:

- TODO(expert): recommended daily caps — connection requests, messages, InMails, profile views
  — by account maturity tier.
- TODO(expert): safe weekly invitation totals, and the acceptance-rate floor below which
  pausing is mandatory.

## Execution guidance

1. **Inspect the account** (`sender.health`). Status, limits, current usage. An alert or a
   disconnection is a **hard stop**.
2. **Configure conservative limits** (`sender.limits.update`). Start below what the platform
   allows: the published limit is where enforcement begins, not where safety ends.
   - TODO(expert): concrete starting values and ramp rules.
3. **Pace like a person.** Activity spread through business hours, no bursts, no round-the-clock
   patterns. Automation is detected by rhythm as much as by volume.
4. **Watch acceptance rate.** Falling acceptance on invitations is the leading indicator of
   trouble — it degrades before the platform acts.
   - TODO(expert): thresholds and cool-down durations.

## Validation

After configuration: re-read limits and usage, confirm no alert flags. Ongoing: acceptance
rate, warning flags, and whether usage is tracking well below the configured caps rather than
pressing against them.

## Reporting

Volumes per action type, acceptance rates, any warnings observed, and limit changes made with
their reason. Account incidents always produce a report — like deliverability, this is a
category where the thresholds can only be learned from real evidence.

## Failure modes

- **Account flagged or restricted** → stop **all** automation on that account immediately.
  Recovery is manual, slow, and not guaranteed.
- **Pending invitation pile-up** → withdraw stale invitations rather than continuing to send.
  - TODO(expert): aging threshold for withdrawal.
- **Configuring limits from the campaign's needs** instead of the account's maturity.
- **Treating the platform's published limit as a target.**
- TODO(expert): recovery playbook and safe-return criteria after a restriction.

## Safety

Same protective-first rule as deliverability: on an account warning, social activity pauses
**first** and the user is told immediately; resuming requires explicit confirmation. Voice
messages and InMails to real people always require per-message approval — they are more
intrusive than email and less forgiving. Full rules: `approval-boundaries`.

## Related skills

- `campaign-launch` — consults this skill before enabling social steps.
- `approval-boundaries` — the protective-action exception and per-message approval.

## Changelog

- 0.2.0 (2026-07-30): renamed from `linkedin-safety` and made vendor-neutral for the
  `ai-sdr-core` pack — Reply endpoints moved to `reply-operations-mapping`. Framed as a
  channel instance of a general posture; safety defers to `approval-boundaries`. Still an
  expert skeleton: no pacing number has been validated.
- 0.1.0 (2026-07-27): expert skeleton — structure and safety posture.
