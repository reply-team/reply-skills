---
name: analyze-performance
description: >
  Honest read on outreach performance: account overview, per-sequence stats, diagnosis
  (deliverability vs copy vs targeting) and one or two high-impact recommendations.
  Use when the user asks how campaigns are performing, what's underperforming, which
  sequences to fix or pause, or wants outreach analytics.
metadata:
  version: 1.0.0
  category: business
  maturity: draft
  status: active
  owner: outbound-experts
  tags: [analytics, reports, sequences, diagnosis]
  tools: [reply-cli]
  api: [reports, sequences, email-accounts]
  relations:
    depends-on: [reply-cli, reply-api]
    recommends: [email-deliverability, launch-outreach]
---

# Analyze performance

## Purpose

Turn raw outreach stats into a diagnosis and 1–2 concrete actions. Read-only by default —
nothing changes until the user approves a change.

## When to use / when NOT to use

- Use for performance questions, optimization, pause/fix decisions.
- Do NOT use to launch new campaigns (`launch-outreach`) or triage replies (`manage-replies`).

## Prerequisites

- Scopes: `reporting:read`, `sequences:read`, `channels:read` (+ `sequences:operate` only if the
  user approves changes).
- Doc pages: reports → *Get email reporting overview*, *Get channel efficiency overview*;
  sequences → *Get sequence stats* (`/v3/sequences/{id}/stats`), *Get stats for all sequences*
  (`/v3/sequences/stats`); email-accounts → *List email accounts*.
- **Rate-limit note:** reporting and sequence-stats endpoints have stricter limits — call
  sequentially, cache within the session, don't re-poll.

## Planning guidance

Anchor on a time window with the user (last week / last month / custom). Compare sequences to
each other, not only to global benchmarks. With low volume (< ~100 delivered) say the sample is
too small to conclude anything — don't dress noise as insight.

## Execution guidance

1. **Account overview:** email reporting overview for the agreed window.
2. **Per-sequence:** stats for all sequences, then deep-dive the outliers by ID.
3. **Diagnose** (heuristic benchmarks for cold email — treat as rules of thumb, not law:
   delivered ≥ 95%, opened 40–60%, replied 2–8%, interested ≈ 10–30% of replies):
   - **Deliverability problem:** bounced > ~3% or delivered < ~95% → list quality or sending
     account health. Check `reply api /v3/email-accounts` (connection status, limits) and read
     `email-deliverability`.
   - **Copy problem:** healthy delivery + opens, replies < ~1% → the message, not the plumbing.
   - **Targeting problem:** replies exist but ~zero interested → wrong audience (ICP mismatch).
   - Correlation ≠ causation; say so when the data is thin.
4. **Recommend 1–2 actions,** highest impact first: pause the worst performer (reversible),
   rewrite an opener modeled on a better-performing sequence, clean bounced contacts, spread
   volume across another account.
5. **Only on explicit confirmation, execute:** pause per the *Pause a sequence* doc page
   (reversible, still confirm); removals/starts inherit `launch-outreach` safety gates.

## Validation

After any approved change, re-read the sequence status. When recommending based on stats, quote
the actual numbers (and window) that justify it.

## Reporting

Compact table: sequence / delivered / opened% / replied% / interested. One-two sentence diagnosis
per problem sequence. Actions taken with IDs. Single highest-impact next step. If findings
confirm or contradict a skill's guidance, link the report in that skill's `validated-by`.

## Failure modes

- 429 on stats endpoints → stricter limits; slow down, don't parallelize.
- Empty/short windows → widen the window rather than over-reading small numbers.

## Safety

Read-only until the user approves a change. Pausing is reversible; starting/archiving anything
follows `launch-outreach` confirmation gates. Never bulk-delete contacts as an "optimization".

## Related skills

- `email-deliverability` — when the diagnosis points at sending health.
- `launch-outreach` — applying fixes that involve new/changed sequences.

## Changelog

- 1.0.0 (2026-07-27): ported from prototype workflow onto `reply api`; benchmarks kept as
  explicit heuristics pending expert validation.
