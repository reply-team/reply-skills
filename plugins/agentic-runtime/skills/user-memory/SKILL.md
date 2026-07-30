---
name: user-memory
description: >
  How agents store and reuse knowledge about the user: preferences, ICP definitions, playbooks
  and other durable context, kept in the workspace so a fresh session does not have to ask
  again. Use when learning something about the user worth keeping — tone, constraints, ICP —
  or before drafting content that should reflect their preferences.
metadata:
  version: 2.0.0
  pack: agentic-runtime
  category: user-knowledge
  maturity: draft
  status: active
  owner: skills-maintainers
  tags: [memory, preferences, icp, playbooks]
  tools: []
  api: []
  relations:
    depends-on: [durable-work]
    recommends: [inbox-triage, campaign-planning, audience-building]
---

# User memory

## Purpose

The skills in this repository carry general expertise. The *user's* context — their voice,
their ICP, their hard rules, their plays that work — belongs to them and lives in their
workspace. This skill defines where that goes and how agents read and extend it without
trampling it.

The test of good memory is simple: a fresh session drafting in the user's name should not need
to re-ask anything they have already said.

## When to use / when NOT to use

- Use when the user states a durable preference ("never use emoji", "always mention we're
  SOC 2 compliant"), defines their ICP, or shares a repeatable play.
- Use before drafting anything in the user's voice — check memory first rather than guessing at
  tone.
- Do NOT store session trivia, anything derivable from the provider's own data, or **secrets**.
  Credentials never enter a workspace.
- Do NOT store organisational knowledge that generalises beyond this user — if it is true for
  everyone, it belongs in a skill, proposed via a pull request.

## Prerequisites

A workspace (`durable-work`). Create the memory directory on first need.

## Execution guidance

Memory lives in the workspace's `memory/` directory, described in the workspace specification
that ships with `durable-work`:

- **preferences** — tone, sign-offs, language, hard constraints, approval preferences. One
  dated fact per line.
- **ICP** — the ideal customer profile: segments, titles, company criteria, disqualifiers.
- **playbooks** — repeatable user-specific plays, one file each.

Rules for writing:

1. **Read before writing.** Extend or correct the existing entry; never append a second version
   of a fact that already exists.
2. **Record facts, dated, in the user's own terms.** When correcting, replace the stale fact —
   memory is current-state, unlike reports, which are immutable history.
3. **Confirm before persisting** anything the user said in passing. Something mentioned once is
   not necessarily a standing rule, and a wrong "always" is worse than no memory at all.
4. **Say when memory is applied.** When a draft honours a stored preference, mention it. Silent
   application of a rule the user forgot they set is indistinguishable from a strange choice.

## Validation

Memory is healthy when a fresh session drafting in the user's name needs no re-asking of known
preferences, and when nothing in it contradicts anything else in it.

## Reporting

When a run reveals durable learning about the user's audience — "CTOs reply to plain text" —
propose promoting it into memory. If it looks true beyond this user, propose it as a change to
a skill instead. Knowing which of the two it is, is the judgement this skill asks for.

## Failure modes

- **Contradictory entries.** Ask the user which is current, keep one. Two conflicting
  preferences make the agent's behaviour unpredictable.
- **Memory bloat.** Prune to facts that change behaviour; delete the rest. A file nobody reads
  is not memory.
- **Persisting a passing remark as a standing rule**, then applying it for months.
- **Storing what the provider already knows** — duplicating data that can be read on demand,
  and letting the copy go stale.
- **Applying memory silently**, so the user cannot tell why a draft reads the way it does.

## Safety

Never store API keys, tokens, or third-party personal data beyond what the outreach itself
legitimately requires. The workspace may be a git repository and may be shared — write
everything on that assumption. Memory shapes what an agent says on the user's behalf, so a
wrong entry is not a cosmetic problem: confirm before persisting, and make application visible.

## Related skills

- `durable-work` — the workspace this memory lives in.
- `campaign-planning` · `audience-building` (core pack) — read memory for ICP and constraints
  at planning time.
- `inbox-triage` (core pack) — reads preferences when drafting replies.

## Changelog

- 2.0.0 (2026-07-30): renamed from `user-memory-conventions` and moved into the
  `agentic-runtime` pack, where the workspace it depends on is defined. Layout description now
  points at the specification shipped in this pack rather than the repository root; the
  skill-versus-memory distinction made explicit.
- 1.0.0 (2026-07-27): initial version as `user-memory-conventions`.
