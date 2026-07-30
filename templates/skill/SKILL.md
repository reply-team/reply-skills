---
name: skill-name-in-kebab-case
description: >
  One to three sentences: what this skill does AND when a host should trigger it.
  Use when the user asks to <trigger phrases>. Hosts route on this text.
metadata:
  version: 0.1.0
  pack: ai-sdr-core         # must match plugins/<pack>/ — see docs/packs.md
  category: strategy        # operations | strategy | protection | execution | runtime | user-knowledge
  maturity: draft           # draft | reviewed | validated | production
  status: active            # active | deprecated | archived
  owner: skills-maintainers
  tags: []
  tools: []                 # execution surfaces — LEAVE EMPTY in vendor-neutral packs
  api: []                   # provider doc groups — LEAVE EMPTY in vendor-neutral packs
  relations:
    depends-on: []          # HARD — only skills in this pack or a pack it depends on
    extends: []             # HARD — same rule
    recommends: []          # SOFT — may cross packs; skill must work without the target
    validates: []
    validated-by: []
    supersedes: []
    alternative-to: []
---

# Skill Title

## Purpose

The problem this skill solves, in one paragraph.

## When to use / when NOT to use

- Use when: …
- Do NOT use when: … (point to the alternative skill, by name)

## Prerequisites

- Data needed, skills to read first, and the business operations this skill uses.
- Adapter skills only: credentials and scopes required.

## Planning guidance

How to think about the task before acting: what to decide with the user, decomposition hints,
which constraints shape the work.

## Execution guidance

Concrete steps.

- **Vendor-neutral packs**: name the **operations** from `sdr-operations`. No endpoints, no
  payloads, no tool names — that knowledge belongs in an adapter.
- **Adapter packs**: name the endpoint group and doc page and fetch it before calling. Never
  invent a path or a body shape from memory.

## Validation

How to verify the outcome: state checks, counts, identifiers to confirm.

## Reporting

What the report for this work must capture. Reference the `execution-reporting` skill by name —
never by path, since it may not be installed.

## Failure modes

Known errors and recovery; honest gaps ("not available yet — say so"). Use `TODO(expert):` for
knowledge that needs a domain expert rather than guessing.

## Safety

Actions requiring explicit user confirmation, and irreversibility notes. Defer to
`approval-boundaries` for the rules rather than restating them, so they cannot drift.

## Related skills

Prose complement to `relations:` — why and when a reader should look at each.

## Changelog

- 0.1.0 (YYYY-MM-DD): initial draft.
