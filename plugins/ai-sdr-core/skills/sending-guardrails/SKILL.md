---
name: sending-guardrails
description: >
  Protect sender reputation and inbox placement: domain authentication, warm-up, volume
  pacing, bounce interpretation and recovery. Use before launching significant email volume,
  when bounce rates rise, when replies collapse, or when a sending account or domain is new.
metadata:
  version: 0.2.0
  pack: ai-sdr-core
  category: protection
  maturity: draft
  status: active
  owner: outbound-experts
  tags: [deliverability, reputation, warm-up, volume, protection]
  tools: []
  api: []
  relations:
    depends-on: [sdr-operations]
    recommends: [campaign-launch, performance-analysis, approval-boundaries]
---

# Sending guardrails

> **Expert skeleton.** The structure, the safety posture and the decision points are final.
> Every number and every playbook is `TODO(expert)` and must be validated by Reply's
> deliverability experts before this skill leaves `draft`. Visible gaps are deliberate;
> invented thresholds would be worse than none.

## Purpose

Deliverability is an asset that burns in days and rebuilds over months. This skill encodes the
constraints automated outreach must respect so it never damages the user's domain, and the
moves to make when the signals start degrading.

## When to use / when NOT to use

- Use before any significant send volume, for new domains and new sending accounts, and
  whenever bounce or engagement metrics degrade.
- Use as a constraint on planning, not as a step in it: these limits shape what a campaign is
  allowed to be.
- Not a substitute for `performance-analysis` — that judges campaign *effectiveness*; this
  skill is about sending *health*. A campaign can be perfectly written and still be
  undeliverable.

## Prerequisites

- Visibility of the sending accounts (`sender.list`, `sender.health`, `sender.limits.read`).
- The user, or their DNS knowledge, for authentication checks — this part cannot be automated
  away.

## Planning guidance

Answer before sending anything. If an answer is unknown, resolve it **before** volume, not
after:

- Is the sending domain authenticated — SPF, DKIM, DMARC present and aligned?
- How old is the sending account, and how far into warm-up is it?
- What daily volume is this account actually ready for?
- Is the list clean — validated identities, hard bounces already removed?

Open expert questions:

- TODO(expert): recommended warm-up ramp — duration and daily volume curve — by account age.
- TODO(expert): safe daily ceilings per mailbox provider.
- TODO(expert): how many accounts to spread a given volume across, and when adding a domain is
  preferable to raising a limit.

## Execution guidance

1. **Account health check** (`sender.health`). Connection state and configured limits.
   A disconnected or erroring account is a **hard stop**, not a warning to work around.
2. **Authentication check.** Confirm SPF, DKIM and DMARC exist for the sending domain — ask
   the user or inspect DNS. Missing DKIM or DMARC must be fixed before volume.
   - TODO(expert): recommended DMARC policy progression and what to monitor at each stage.
3. **List hygiene.** Validate identities before sending and purge hard bounces from lists.
   Availability of automated validation varies by provider — check before promising it.
   - TODO(expert): validation thresholds, and re-validation cadence for an ageing list.
4. **Pacing.** Spread volume across the sending window; avoid spikes. A burst that clears a
   provider's rate limit can still damage reputation.
   - TODO(expert): concrete ramp rules after a pause, for a new segment, and after a
     deliverability incident.
5. **Watch and react.** Bounce rate, complaint signals, and the engagement trend by mailbox
   provider — reputation problems usually appear at one provider first.
   - TODO(expert): the alert thresholds at which sending must pause automatically.

## Validation

After any change: bounce rate, complaint signals and engagement trend by provider, measured
over a stated window. Guardrails are working when volume grows without those degrading — not
when nothing has visibly broken yet.

## Reporting

Sending accounts used, volumes per account, bounce and complaint figures, and any protective
action taken with the signal that triggered it. Deliverability incidents always produce a
report: they are the highest-value evidence this category has, and the only way the thresholds
above eventually stop being `TODO(expert)`.

## Failure modes

- **Rising hard bounces mid-campaign** → pause the affected sequence first, diagnose second.
  Pausing is reversible; a burned domain is not.
- **Fixing deliverability by rewriting copy.** If delivery is failing, the message is not the
  problem, and rewriting it wastes the window in which the domain could have been saved.
- **Raising a limit to hit a number.** Volume ceilings exist because of provider behaviour,
  not because of ambition.
- **Sending from a fresh account at full volume** — the single fastest way to burn a new domain.
- TODO(expert): blocklist recovery playbook — identification, delisting, cool-down.

## Safety

When a signal crosses a danger threshold, the protective action — pausing, lowering a limit —
is taken **first** and the user told immediately. This is the narrow case where acting before
asking is correct, because inaction is the destructive choice; it is defined in full in
`approval-boundaries`. Resuming afterwards always requires explicit confirmation. Raising a
limit is never covered by this exception.

## Related skills

- `campaign-launch` — consults this skill before going live.
- `performance-analysis` — routes deliverability diagnoses here.
- `approval-boundaries` — the protective-action exception in full.

## Changelog

- 0.2.0 (2026-07-30): renamed from `email-deliverability` and made vendor-neutral for the
  `ai-sdr-core` pack — Reply endpoints moved to `reply-operations-mapping`. Reframed as a
  constraint on planning rather than a workflow step; safety now defers to
  `approval-boundaries`. Still an expert skeleton: no threshold has been validated.
- 0.1.0 (2026-07-27): expert skeleton — structure and safety posture.
