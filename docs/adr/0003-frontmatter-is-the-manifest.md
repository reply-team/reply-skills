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
