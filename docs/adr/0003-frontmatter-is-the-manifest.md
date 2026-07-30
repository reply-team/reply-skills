# ADR-0003 — Frontmatter is the manifest

- **Date:** 2026-07-27 · **Status:** accepted

## Context

The skill contract needs structured metadata (version, category, maturity, owner, relations…).
Options: a companion `manifest.json` per skill, a central registry file, or extended SKILL.md
frontmatter. Hosts only require `name` + `description` and ignore unknown frontmatter keys.

## Decision

The SKILL.md frontmatter **is** the manifest: standard host keys + a `metadata:` block for the
Reply contract. No companion JSON, no central registry. CI validates the schema
(`scripts/validate.mjs`) and generates `INDEX.md` from it (`scripts/build-index.mjs`). The
frontmatter uses a constrained YAML subset so the zero-dependency validator stays trivial.

## Consequences

- One source of truth per skill; no drift between a manifest and the document.
- Anything that needs machine-readable skill data (index, future search, `reply skills install`)
  reads frontmatter.
- Installer-side state (what's installed where, pinned refs) is explicitly NOT repo data — it
  belongs to the installing tool (e.g. `reply skills install` keeps its own records).

## Alternatives considered

Per-skill `manifest.json` — rejected: guaranteed drift. Central `skills.yaml` registry — rejected:
merge-conflict magnet, second place to forget.

## Amended 2026-07-30 — `packs.json` is the pack-level manifest

This decision is about **skills**, and it stands: a skill's frontmatter is its only manifest,
with no companion file and no central registry of skills.

Packs are a different scope and do need one file. `packs.json` declares pack identity, versions
and the dependency graph — information that is not a property of any single skill and cannot live
in frontmatter. It does not list skills: pack membership is the directory a skill sits in, checked
against `metadata.pack`, so there is still no registry to forget to update.

Host manifests (`.claude-plugin/marketplace.json`, `plugins/<pack>/.claude-plugin/plugin.json`)
are **generated** from `packs.json` and never hand-edited; CI fails on drift. That keeps the
no-drift property this ADR was written to protect, one level up.

## Amended 2026-07-31 — a second host, and catalog copy stays host-neutral

Codex packaging (REPLY-51541) was the first real test of the "generated from one file" rule,
and it held: `.agents/plugins/marketplace.json` and `plugins/<pack>/.codex-plugin/plugin.json`
are emitted from the same `packs.json`, so the two hosts cannot disagree about names, versions
or skills paths.

It also forced one addition. Codex renders a plugin in its catalog from an `interface` block —
display name, short and long description, category, capabilities, example prompts. That is
**product copy, not host configuration**: any future host will want the same sentences under
different key names. So it lives in `packs.json` as a host-neutral `presentation` block, and
each generator maps it into the host's own shape. The alternative — writing Codex's `interface`
literally into `packs.json` — was rejected because it would make the source of truth
Codex-shaped and force the next host to either duplicate it or rename it in place.

The validator checks `presentation` at the source rather than in the generated output. A field
missing from `packs.json` would otherwise be emitted as `undefined` into shipped JSON, and the
freshness check would call that up to date, because it faithfully reflects the source.

One thing this ADR cannot fix: **Codex's manifest has no dependency field at all** (0 of the 188
manifests its CLI ships declare one). The graph therefore cannot round-trip through every host
manifest, which is precisely why it is declared in `packs.json` and resolved by our own
installer rather than delegated to whichever host happens to be installing.
