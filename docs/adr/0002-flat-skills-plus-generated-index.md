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

## Amended 2026-07-30 — flat within each pack

With three packs (ADR-0006) the rule becomes: skill directories are flat **within each pack**,
at `plugins/<pack>/skills/<name>/`. The pack boundary is an installation boundary, not a
taxonomy level, so this does not reintroduce the nested-discovery problem — a host still finds
`skills/<name>/SKILL.md` directly inside whatever it installed.

Two additions:

- Skill names must be unique **across all packs**, because hosts with a flat skills directory
  put every installed pack's skills into one namespace.
- The generated catalog is now two things: the root `INDEX.md` for people reading the
  repository, and a per-pack `CATALOG.md` that ships with the pack — because `INDEX.md` is not
  copied on install, so an agent inside an installed pack could not read it.

Category remains data (`metadata.category`) and now mirrors the architectural layer, so
re-categorising is still a frontmatter edit rather than a file move.
