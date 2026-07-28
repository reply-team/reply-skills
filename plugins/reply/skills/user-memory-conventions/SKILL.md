---
name: user-memory-conventions
description: >
  How agents store and reuse user-specific knowledge in the Reply workspace: preferences,
  ICP definitions, playbooks and durable memory. Use when learning something about the
  user worth keeping (tone, constraints, ICP), or before drafting content that should
  reflect their preferences.
metadata:
  version: 1.0.0
  category: user-knowledge
  maturity: draft
  status: active
  owner: skills-maintainers
  tags: [memory, workspace, preferences, icp]
  tools: []
  api: []
  relations:
    recommends: [outbound-campaign-planning, manage-replies]
---

# User memory conventions

## Purpose

Reply's skills carry general expertise; the USER's context — voice, ICP, rules, playbooks —
lives in their workspace `memory/`. This skill defines where things go and how agents read and
extend that memory without stepping on it.

## When to use / when NOT to use

- Use when the user states a durable preference ("never emoji", "always mention we're
  SOC2-compliant"), defines their ICP, or shares a repeatable play.
- Do NOT store session-scoped trivia, anything derivable from Reply data, or **secrets** —
  credentials never enter the workspace.

## Prerequisites

A workspace (`reply-workspace.yaml` marker). Create `memory/` on first need.

## Execution guidance

Layout inside `<workspace>/memory/`:

- `preferences.md` — tone, sign-offs, language, hard constraints, approval preferences. One
  bullet per fact, dated.
- `icp.md` — ideal customer profile(s): segments, titles, company criteria, disqualifiers.
- `playbooks/<name>.md` — repeatable user-specific plays (e.g. "webinar follow-up push").

Rules for writing:

1. **Read before writing** — extend or correct the existing entry, don't duplicate it.
2. Record facts, dated, in the user's terms; when correcting, replace the stale fact (memory is
   current-state, unlike reports which are immutable history).
3. Confirm with the user before persisting anything they said in passing.
4. Reference memory in drafts: `manage-replies` and `launch-outreach` copy should honor
   `preferences.md` automatically — mention when a draft applies a stored preference.

## Validation

Memory is healthy when a fresh session drafting in the user's name needs no re-asking of known
preferences.

## Reporting

When a campaign report reveals durable learning about the user's audience ("CTOs reply to plain
text"), propose promoting it into `memory/` (or into a shared skill if it generalizes).

## Failure modes

- Contradictory entries → ask the user which is current; keep one.
- Memory bloat → prune to facts that change behavior; delete trivia.

## Safety

Never store API keys, tokens, or third-party personal data beyond what outreach legitimately
needs. The workspace may be a git repo — assume it could be shared.

## Related skills

- `outbound-campaign-planning` — reads memory at plan time.

## Changelog

- 1.0.0 (2026-07-27): initial version.
