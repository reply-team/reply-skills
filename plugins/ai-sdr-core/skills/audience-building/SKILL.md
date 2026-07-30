---
name: audience-building
description: >
  Turn raw prospect data into a clean, deliberately-shaped audience: decide who belongs,
  map and sanity-check the incoming fields, choose a duplicate policy, and organise people
  into named lists. Use when the user wants to import contacts, build or extend a list,
  define a segment, or asks what to do about duplicates and messy data.
metadata:
  version: 2.0.0
  pack: ai-sdr-core
  category: strategy
  maturity: draft
  status: active
  owner: outbound-experts
  tags: [audience, icp, segmentation, lists, data-quality]
  tools: []
  api: []
  relations:
    depends-on: [sdr-operations]
    recommends: [campaign-launch, sending-guardrails, approval-boundaries]
---

# Audience building

> **Partly an expert skeleton.** The mechanics below are complete and safe to follow. The
> judgement calls — what makes a segment worth targeting, when a list is too dirty to send
> to — are marked `TODO(expert)` and need validation by outbound experts before this skill
> leaves `draft`.

## Purpose

Who you contact decides more about the outcome than what you write. This skill covers
turning a pile of data — a file, an export, a pasted block — into an audience you can
defend: a stated definition of who belongs, fields that mean what they claim, duplicates
resolved on purpose rather than by accident, and people organised into lists that later
campaigns can address.

## When to use / when NOT to use

- Use for imports, list building and extension, segment definition, and any question about
  duplicates or data quality.
- Use *before* `campaign-launch` — the audience is a precondition for the launch, not a
  step inside it.
- Do NOT use for finding **new** people the user does not already have. Discovery and
  enrichment are a named gap in the operation contract; say so honestly rather than
  improvising a substitute.
- Do NOT use for judging campaign results — that is `performance-analysis`.

## Prerequisites

- Data in hand, or a clear statement of where it comes from.
- The user's ICP if one exists — check their stored preferences and ICP notes before asking
  them to repeat it.
- Operations used: `contact.find`, `contact.create`, `contact.update`, `contact.list.create`,
  `contact.list.add`, `contact.deduplicate`. See `sdr-operations` for their classification;
  bulk writes carry an approval gate.

## Planning guidance

Decide these **with the user**, before touching anything:

1. **Who belongs.** State the segment in one sentence that could be checked against a row:
   "VP+ of engineering at 50–500 person B2B SaaS in EU/US". A segment nobody can check is a
   segment nobody can improve later.
   - TODO(expert): what makes a segment worth running versus too broad to learn from —
     minimum viable size, how many segments to run in parallel.
2. **Field mapping.** Inspect the actual headers rather than assuming them. Identity is the
   email address; everything else is optional enrichment. Show the user a two- or three-row
   sample with the proposed mapping — silent field mismatches poison a database in a way
   that is expensive to unwind.
3. **Duplicate policy.** A business decision, not a technical default:
   - *skip existing* — never overwrites stored data. The safe recommendation, and the right
     answer unless the user has a reason.
   - *update existing* — the incoming file is treated as more authoritative than what is
     stored. A deliberate choice with real consequences.
4. **Destination.** A new named list or an existing one. Reusing beats proliferating; a
   dozen near-identical lists is how audiences become unmanageable.
5. **Exclusions.** Anyone suppressed, anyone already in an active sequence, anyone contacted
   recently. Deciding this *now* is what prevents contacting the same person twice from two
   directions.

## Execution guidance

1. **Inspect locally first — zero writes.** Row count, headers, obvious junk: missing or
   malformed identities, empty rows, columns that are clearly mislabelled. Report what you
   found before proposing anything.
2. **Resolve the destination** (`contact.list.create`, or reuse an existing list).
3. **Show the plan and get approval.** Source, row count, field mapping, duplicate policy,
   destination, exclusions. This is a bulk write: it needs an explicit yes — see
   `approval-boundaries`.
4. **Create the contacts** (`contact.create`, in bulk). Large imports commonly complete
   asynchronously; the operation is done when the work is done, not when the request
   returns.
5. **Reconcile.** Created, updated, skipped and failed counts, plus the first few failure
   reasons verbatim. A high skip count under *skip existing* means duplicates were found —
   expected, not a fault. Never round a partial result up to success.
6. **Verify membership** by reading the list back and comparing counts against expectation.

### Data quality

- An unreachable identity is worse than a missing row: it costs sender reputation. Validate
  before sending, not after — see `sending-guardrails`.
- Remove known-bad addresses from lists rather than leaving them to bounce repeatedly.
- TODO(expert): acceptable bad-address ratio before an import should be rejected outright,
  and how often to re-validate an ageing list.

### Suppression and consent

People who asked not to be contacted stay excluded permanently, across every list and
campaign. Suppression is never inferred from silence and never reversed without the user
saying so explicitly. Where consent rules apply to a region or channel, they constrain the
audience definition itself — not a filter applied later.

- TODO(expert): the consent and record-keeping requirements the audience definition must
  satisfy per region.

## Validation

The audience is sound when: the segment is stated in checkable terms; the mapping was shown
and approved; the duplicate policy was chosen rather than defaulted; list membership counts
match expectation; and suppressed people are provably absent.

## Reporting

Segment definition as agreed. Counts created / updated / skipped / failed with reasons.
List identifiers and names. Exclusions applied and why. Anything about the data that should
change the next import — that is the part a future run actually benefits from.

## Failure modes

- **Importing before showing the mapping.** The damage is silent and discovered weeks later.
- **Defaulting the duplicate policy** instead of asking. *Update existing* chosen by
  accident overwrites data the user cared about.
- **A duplicate-heavy result** treated as an error: under *skip existing* it is the policy
  working. Confirm the user did not actually want updates.
- **Treating a partial import as complete.** State N succeeded, M failed, and why.
- **Building a list nobody can define.** If the segment cannot be stated in one checkable
  sentence, the campaign built on it cannot be learned from.

## Safety

Bulk creation and modification of contact data runs only after the user approved the exact
plan. Deletion and suppression are separate, consequential decisions and are never bundled
into an import. Prospect data is personal data: keep it where the user expects it and do not
copy it into reports or logs beyond what the outcome requires.

## Related skills

- `sdr-operations` — the contact and list operations this skill composes.
- `campaign-launch` — the usual next step once the audience exists.
- `sending-guardrails` — list quality is a deliverability input, not just a data concern.
- `approval-boundaries` — the gate on bulk writes.

## Changelog

- 2.0.0 (2026-07-30): renamed from `import-prospects` and rewritten vendor-neutral for the
  `ai-sdr-core` pack — Reply endpoint and CLI detail moved to `reply-operations-mapping` in
  the adapter pack. Scope widened from "import a file" to "shape an audience": segment
  definition, exclusions, suppression and consent added; expert judgement calls marked.
- 1.0.0 (2026-07-27): ported from the prototype workflow as `import-prospects`.
