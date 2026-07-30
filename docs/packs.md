# Layers and packs

> How this repository is organised, why it is three installable packs and not one, and the
> rules that keep them separable. Decided 2026-07-30 (ADR-0006).

## Five layers

Layers classify knowledge. They are the answer to "what kind of thing is this skill?".

| Layer | Contents |
|---|---|
| **L1 — SDR business operations** | Atomic operations in SDR language: add a contact, enrol into a sequence, pause, reply, classify. Vendor-neutral, no provider detail. |
| **L2 — Strategy & playbooks** | How and when operations compose: audience building, launch, triage, analysis, planning. |
| **L3 — Protection & guardrails** | Cross-cutting constraints: sending limits, channel limits, approval boundaries, anomaly handling. Not another step — a constraint on all of them. |
| **L4 — Provider execution** | Mapping L1 onto a real product: endpoints, auth, call ordering, error translation. |
| **L5 — Long-running work** | Goals, plans, work items, checkpoints, resumability, reporting, memory. |

## Three packs

Packs are **installation boundaries**, deliberately not a one-to-one rendering of the layers.

| Pack | Layers | Depends on | Optional? |
|---|---|---|---|
| `ai-sdr-core` | L1 + L2 + L3 | — | No — everything builds on it |
| `reply-adapter` | L4 (Reply.io) | `ai-sdr-core` | Yes, if you use another provider |
| `agentic-runtime` | L5 | `ai-sdr-core` | Yes, if your orchestrator already does this |

**Why L1–L3 share one pack.** The planner and the playbooks are useless without the operations
they plan around, so splitting them would create a pack nobody would sensibly install alone.
Guardrails are in the same pack for a different and more important reason: safe operation must
not be an optional extra that a selective install can silently omit.

## Invariants

These are enforced by `npm run validate`, not by good intentions:

1. **`ai-sdr-core` depends on nothing.** Not on the adapter, not on any runtime. This is what
   makes "works with a provider other than Reply" true rather than aspirational.
2. **`reply-adapter` and `agentic-runtime` never depend on each other.** Either can be absent.
3. **A hard relation (`depends-on`, `extends`) may not cross into a pack this pack does not
   depend on.** Core may not hard-depend on runtime skills; runtime may hard-depend on core
   skills, because it declares that dependency.
4. **A soft relation (`recommends`, and friends) may cross any boundary** — but the skill must
   remain useful when the target is absent. `campaign-planning` recommends `durable-work` and
   works without it.
5. **Nothing references a file outside its own pack.** Hosts install a pack by copying that one
   directory; a link to the repository root dangles on the user's machine.
6. **Skill names are globally unique** across packs. Hosts with a flat skills directory put them
   all in one namespace, so a shared name is not a merge — it is a silent overwrite in which one
   skill's content wins and the other disappears. `npm run smoke` simulates that flat install
   (the shape `npx skills add` produces) alongside the per-pack one, so this invariant is checked
   against the layout that actually depends on it.

## Source of truth

`packs.json` at the repository root declares pack identity, versions and the dependency graph.
Host manifests are **generated** from it:

```
packs.json
  ├── .claude-plugin/marketplace.json            (npm run build-manifests)
  └── plugins/<pack>/.claude-plugin/plugin.json   (npm run build-manifests)
```

Never hand-edit a generated manifest — CI fails on drift (`npm run check-manifests`). When a
second host is added, its manifests are emitted from the same file, so two hosts cannot disagree
about names, versions or dependencies.

Claude Code resolves `dependencies` as an array of pack names within the same marketplace.
This was verified by performing a real install, not by manifest validation — `claude plugin
validate` accepts several spellings of the field without discriminating between them, so it
cannot be used as evidence here.

## Self-containment

A skill's supporting files live inside the skill: `references/` for specifications and
background, `templates/` for shapes it tells an agent to produce, `examples/` for worked cases.
Cross-skill references go **by skill name**, never by path.

There is currently no material shared between packs, so there is no materialisation step. If
shared material appears, the rule is: one canonical source, copied into every pack that needs it
at build time, with a CI freshness check. Duplication is allowed in generated output and never
in edited source. Do not use symlinks — copied output is what survives being installed.

## Catalogs

- `INDEX.md` at the root — every pack and skill, for people reading the repository.
- `plugins/<pack>/CATALOG.md` — the pack's own catalog, which **is** copied on install, so an
  agent inside an installed pack has something to read. The root `INDEX.md` is not.

Both are generated (`npm run build-index`) and checked for staleness in CI.

## Adding to the repository

**A new skill.** Decide its layer, which decides its pack. Create it under
`plugins/<pack>/skills/<name>/`, set `metadata.pack` to match, and keep hard relations inside
the packs yours depends on. Run `npm run build && npm run check`.

**A new pack.** Add it to `packs.json` with its dependencies, create `plugins/<name>/skills/`,
regenerate manifests. Think hard first: a fourth pack is a fourth thing every user must reason
about, and the usual right answer is a new skill in an existing pack.

**Changing a dependency edge.** Update `packs.json` only, regenerate, and expect the validator
to tell you which existing relations the change just invalidated.
