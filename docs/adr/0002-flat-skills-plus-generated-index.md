# ADR-0002 — Flat skill directories + generated index

- **Date:** 2026-07-27 · **Status:** accepted

## Context

We want the repo navigable by knowledge domain (technical / business / planning / protection /
user-knowledge), but Agent Skills hosts discover skills by the `skills/<name>/SKILL.md` convention
(Claude Code plugins; Codex `.agents/skills`). Nested layouts are not guaranteed portable across
hosts.

## Decision

Skill directories are **flat** under `plugins/reply/skills/`. The domain taxonomy lives in
`metadata.category` frontmatter and is *presented* through the **generated** `INDEX.md` (grouped by
category, one line per skill). `INDEX.md` is never edited by hand; CI fails when it is stale.

## Consequences

- Portability across every SKILL.md host with zero adaptation.
- Discoverability rests on frontmatter quality + the index — the same one-fetch-full-map pattern
  as docs.reply.io's `llms.txt`.
- Category is data, so re-categorizing is a frontmatter edit, not a file move.

## Reassess when

A future host convention makes nested discovery portable, or the catalog outgrows a single flat
directory (~50+ skills).
