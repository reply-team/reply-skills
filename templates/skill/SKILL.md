---
name: skill-name-in-kebab-case
description: >
  One to three sentences: what this skill does AND when a host should trigger it.
  Use when the user asks to <trigger phrases>. Hosts route on this text.
metadata:
  version: 0.1.0
  category: business        # technical | business | planning | protection | user-knowledge
  maturity: draft           # draft | reviewed | validated | production
  status: active            # active | deprecated | archived
  owner: skills-maintainers
  tags: []
  tools: []                 # e.g. [reply-cli, reply-mcp]
  api: []                   # docs.reply.io group slugs this skill touches
  relations:
    depends-on: []
    extends: []
    recommends: []
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
- Do NOT use when: … (point to the alternative skill)

## Prerequisites

- Auth / scopes required, data needed, skills to read first.

## Planning guidance

How to think about the task before acting: questions to answer, decomposition hints,
what to check in the workspace.

## Execution guidance

Concrete steps. Reference exact API doc pages (docs.reply.io) — never invent endpoint
paths or body shapes. Prefer `reply api /v3/...` calls; show expected outputs.

## Validation

How to verify the outcome: state checks, counts, IDs to confirm.

## Reporting

What the report for this work must capture (see templates/report.md).

## Failure modes

Known errors and recovery; honest gaps ("not available yet — say so").

## Safety

Actions that require explicit user confirmation in the conversation; irreversibility notes.

## Related skills

Prose complement to `relations:` — why/when a reader should look at each.

## Changelog

- 0.1.0 (YYYY-MM-DD): initial draft.
