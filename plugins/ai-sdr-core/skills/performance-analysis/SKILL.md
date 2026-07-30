---
name: performance-analysis
description: >
  An honest read on outreach performance: account and per-campaign figures over a stated
  window, a diagnosis that separates deliverability from copy from targeting, and one or two
  high-impact recommendations. Use when the user asks how campaigns are performing, what is
  underperforming, what to fix or pause, or wants outreach analytics.
metadata:
  version: 2.0.0
  pack: ai-sdr-core
  category: strategy
  maturity: draft
  status: active
  owner: outbound-experts
  tags: [analytics, diagnosis, optimization, evidence]
  tools: []
  api: []
  relations:
    depends-on: [sdr-operations]
    recommends: [sending-guardrails, campaign-launch, inbox-triage, approval-boundaries]
---

# Performance analysis

> **Partly an expert skeleton.** The diagnostic method is complete. The benchmark numbers
> below are explicitly heuristics carried over from the prototype and are marked
> `TODO(expert)` — they need validation against Reply's own data before this skill leaves
> `draft`. Treat them as rules of thumb, never as law.

## Purpose

Turn raw figures into a diagnosis and one or two concrete actions. Read-only by default:
nothing changes until the user approves a change. The value is not the numbers — the user can
see those — it is correctly attributing a problem to deliverability, copy or targeting,
because each has a different fix.

## When to use / when NOT to use

- Use for performance questions, optimisation, and pause-or-fix decisions.
- Do NOT use to launch or change campaigns — that is `campaign-launch`.
- Do NOT use to work replies — that is `inbox-triage`.

## Prerequisites

- Enough volume to say anything. Below roughly a hundred delivered messages, say the sample
  is too small and stop there rather than dressing noise as insight.
- Operations used: `metrics.account-overview`, `metrics.sequence`,
  `metrics.channel-efficiency`, `sender.health`. All reads. Measurement is commonly
  rate-limited harder than everything else — sequential, cached, never polled.

## Planning guidance

**Anchor the window first.** Every figure is meaningless without the period it covers; agree
last week, last month or a specific range with the user before pulling anything.

**Compare campaigns to each other**, not only to published benchmarks. The user's own
best-performing campaign is a far better yardstick than an industry average, because it shares
their audience, domain and voice.

## Execution guidance

1. **Account overview** (`metrics.account-overview`) for the agreed window.
2. **Per campaign** (`metrics.sequence`), then look closer at the outliers — best and worst.
3. **Diagnose.** Heuristic bands for cold outbound — TODO(expert): validate every number
   here: delivered ≥ ~95%, opened ~40–60%, replied ~2–8%, interested ~10–30% of replies.
   - **Deliverability problem** — bounces above ~3%, or delivered below ~95%. The cause is
     list quality or sender health, not the message. Check `sender.health` and go to
     `sending-guardrails`.
   - **Copy problem** — delivery and opens healthy, replies below ~1%. The plumbing works and
     the message is not earning a response.
   - **Targeting problem** — replies exist but almost nobody is interested. The message is
     reaching people it should not reach: an audience mismatch, so go back to
     `audience-building`.
   - **Caveat on opens.** Open tracking is distorted by privacy proxies that fetch images
     automatically or block them entirely, so open rate is the weakest signal in the set.
     Never diagnose on opens alone; prefer delivered and replied.
     - TODO(expert): how much to discount open rate, and whether to report it at all.
   - Correlation is not causation. When the data is thin, say so — an honest "we cannot tell
     yet" is worth more than a confident wrong answer.
4. **Recommend one or two actions**, highest impact first: pause the worst performer
   (reversible, cheap), rewrite an opener modelled on a campaign that is working, clean the
   bad addresses out of a list, spread volume across another sender.
5. **Only on explicit approval, act.** Pausing is reversible and still confirmed; anything
   that starts or removes things inherits the gates in `campaign-launch`.

## Validation

Every recommendation quotes the actual figures and the window that justify it. After any
approved change, re-read the affected campaign's state to confirm the change took effect. If
findings confirm or contradict guidance in another skill, that is evidence worth recording —
see the reporting conventions of whichever runtime the user has.

## Reporting

A compact table: campaign / delivered / opened % / replied % / interested. One or two
sentences of diagnosis per problem campaign, naming which of the three causes it is and why.
Actions taken with identifiers. A single highest-impact next step. Always the window.

## Failure modes

- **Over-reading a small sample.** The commonest way analysis does harm: a recommendation
  built on twelve sends sends the user off in the wrong direction.
- **Diagnosing on open rate**, which is the least trustworthy figure available.
- **Reporting numbers without a window**, which makes them unusable and uncomparable.
- **Parallelising measurement reads** and hitting rate limits, then retrying harder.
- **Recommending five things.** Two get done; five get ignored.
- **Treating a benchmark as a target.** These bands are rules of thumb pending validation, and
  a campaign below one is not automatically broken.

## Safety

Read-only until the user approves a change. Pausing is reversible and is the recommended first
move when something is actively going wrong. Never bulk-delete contacts as an
"optimisation" — that destroys data to improve a percentage. Full rules:
`approval-boundaries`.

## Related skills

- `sdr-operations` — the metrics operations and their rate-limit character.
- `sending-guardrails` — where a deliverability diagnosis goes next.
- `audience-building` — where a targeting diagnosis goes next.
- `campaign-launch` — applying fixes that involve new or changed campaigns.

## Changelog

- 2.0.0 (2026-07-30): renamed from `analyze-performance` and rewritten vendor-neutral for the
  `ai-sdr-core` pack — Reply reporting endpoints and scopes moved to
  `reply-operations-mapping`. Diagnostic method and heuristic bands preserved; open-rate
  caveat added; every benchmark explicitly marked for expert validation.
- 1.0.0 (2026-07-27): ported from the prototype workflow as `analyze-performance`.
