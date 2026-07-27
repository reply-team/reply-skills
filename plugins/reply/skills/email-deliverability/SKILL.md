---
name: email-deliverability
description: >
  Protect sender reputation and inbox placement: domain authentication, warm-up, sending
  cadence, bounce interpretation and recovery. Use before launching significant email
  volume, when bounce rates rise, when open rates collapse, or when a sending account
  or domain is new.
metadata:
  version: 0.1.0
  category: protection
  maturity: draft
  status: active
  owner: outbound-experts
  tags: [deliverability, reputation, warm-up, protection]
  tools: [reply-cli]
  api: [email-accounts, contacts]
  relations:
    recommends: [launch-outreach, analyze-performance]
---

# Email deliverability

> **Expert skeleton.** Structure is final; numbers and playbooks below need validation by
> Reply's deliverability experts before this skill can leave `draft`. Every unvalidated spot is
> marked `TODO(expert)`.

## Purpose

Deliverability is an asset that burns fast and rebuilds slowly. This skill encodes the guardrails
an agent must respect so automated outreach never damages the user's domain reputation, and the
recovery moves when signals degrade.

## When to use / when NOT to use

- Use before any significant send volume, for fresh domains/accounts, and whenever bounce/open
  metrics degrade.
- Not a substitute for `analyze-performance` — this skill is about *sending health*, not
  campaign effectiveness.

## Prerequisites

`channels:read` to inspect email accounts; access to the user's DNS knowledge (or the user
themselves) for authentication checks.

## Planning guidance

Before a launch, answer: Is the domain authenticated (SPF, DKIM, DMARC)? How old/warmed is the
sending account? What daily volume is it ready for? Is the list clean (validated emails)? If any
answer is unknown — resolve it BEFORE sending, not after.

- TODO(expert): recommended warm-up ramp (duration, daily volume curve) per account age.
- TODO(expert): safe daily send ceilings per provider (Google Workspace / M365 / SMTP).

## Execution guidance

1. **Account health check:** `reply api /v3/email-accounts` — connection status, configured
   limits. Disconnected or erroring accounts are a hard stop.
2. **Authentication check:** confirm SPF/DKIM/DMARC exist for the sending domain (ask the user or
   check DNS). Missing DKIM/DMARC → fix before volume. TODO(expert): recommended DMARC policy
   progression (none → quarantine → reject) and monitoring guidance.
3. **List hygiene:** validate emails before sending (the API's email-validation endpoints —
   check availability in the docs) and purge hard bounces from lists.
   TODO(expert): validation thresholds and re-validation cadence.
4. **Cadence:** spread sends over the schedule window; avoid volume spikes.
   TODO(expert): concrete ramp-up rules after pauses / for new segments.

## Validation

Watch after changes: bounce rate, spam-complaint signals, open-rate trend by provider.
TODO(expert): alert thresholds (bounce % / complaint %) at which sending must pause automatically.

## Reporting

Record: sending account(s) used, volumes, bounce/complaint numbers, actions taken. Deliverability
incidents always produce a report — they are the highest-value evidence this category has.

## Failure modes

- Rising hard bounces mid-campaign → pause the affected sequence first, diagnose second
  (list quality vs domain reputation). Pausing is reversible; a burned domain is not.
- TODO(expert): blocklist recovery playbook (identification, delisting, cool-down).

## Safety

When deliverability signals cross danger thresholds, the protective action (pause) is taken
FIRST and the user informed immediately — this is the one case where acting before asking is
right, because inaction is the destructive choice. Resuming always requires user confirmation.

## Related skills

- `launch-outreach` — consults this skill before going live.
- `analyze-performance` — routes deliverability diagnoses here.

## Changelog

- 0.1.0 (2026-07-27): expert skeleton — structure + safety posture; numbers pending expert
  validation.
