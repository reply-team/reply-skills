# ADR-0006 — Three installable packs, not one plugin

- **Date:** 2026-07-30 · **Status:** accepted (epic decision log, 2026-07-29)

## Context

The repository shipped its foundation as a single plugin, `reply`, holding thirteen skills in
five taxonomy categories. That worked as a bootstrap and hid a problem: the categories were a
taxonomy, not a boundary, and the skills mixed three separable kinds of knowledge.

Concretely, at commit `2699661`, every business, planning and protection skill declared
`depends-on: [reply-cli, reply-api]` and `tools: [reply-cli]`, and their Execution sections
*were* lists of `reply api /v3/...` calls. So the vendor-neutral SDR knowledge depended on the
Reply-specific execution knowledge — the exact inverse of a replaceable-adapter architecture.
Nothing in the repository could be reused with another provider, and nothing prevented the
coupling from getting worse.

Three forces made this worth fixing now rather than later: the SDR operation contract is about
to become the contract for direct Reply CLI commands, so it must be provider-independent before
it is frozen; third-party orchestrators are a distribution target (ADR-0005), so the durable-work
protocol must be separable from Reply; and the repository is pre-release, so there are no
installed users to migrate.

## Decision

Knowledge is classified into **five layers** and distributed as **three independently
installable packs**. Layers and packs are deliberately not one-to-one — packs are installation
boundaries.

| Pack | Layers | Depends on |
|---|---|---|
| `ai-sdr-core` | L1 SDR business operations · L2 strategy & playbooks · L3 protection & guardrails | — |
| `reply-adapter` | L4 Reply execution: CLI, API v3, MCP, auth, error translation | `ai-sdr-core` |
| `agentic-runtime` | L5 durable work: goals, plans, work items, checkpoints, reporting, memory | `ai-sdr-core` |

L1–L3 share a pack because the planner and playbooks are useless without the operations they
plan around, and — more importantly — because guardrails must not be an optional extra that a
selective install can silently omit.

The single `reply` plugin is **retired outright**: no compatibility alias, no bundle entry. The
repository is pre-release with no known installs, so backward compatibility is not a constraint,
and a fourth installable name would become a fourth boundary that content drifts into.

`packs.json` is the host-neutral source of truth for pack identity and the dependency graph.
Host manifests are generated from it, so no two hosts can disagree about names, versions or
dependencies.

## Consequences

- **The core is genuinely reusable.** `ai-sdr-core` has no dependencies and empty `tools`/`api`
  on every skill, so it can be driven against another provider by writing a second adapter.
- **The invariants are enforced, not documented.** `npm run validate` rejects a hard relation
  that crosses into a pack this pack does not depend on, a reference that escapes a pack root,
  a skill whose declared pack disagrees with its directory, and a sibling-pack dependency. A
  deliberately broken probe skill was used to confirm each check actually fires.
- **Nine of thirteen skills needed content surgery**, not relocation — the vendor-neutral
  methodology had to be separated from the Reply calls in the same document. The four technical
  skills moved as-is into the adapter; the rest were rewritten.
- **Per-pack catalogs became necessary.** The root `INDEX.md` is not copied on install, so each
  pack ships `CATALOG.md` for agents reading an installed pack.
- **Two commands install everything** (`reply-adapter` and `agentic-runtime` pull the core
  automatically), and a single pack installs alone. Verified by real install, not by manifest
  validation — the host's manifest validator accepts several spellings of `dependencies` without
  discriminating, so it proves nothing about resolution.
- Cost accepted: three manifests instead of one, a generation step, and contributors must know
  which pack a new skill belongs to. `docs/packs.md` exists to make that decision mechanical.

## Alternatives considered

**Keep one plugin, separate by category.** Rejected: category is metadata, so nothing stops a
skill from depending on anything, and a user cannot decline the Reply coupling.

**One pack per layer (five packs).** Rejected: `ai-sdr-core` would fragment into three packs
nobody would install separately, and guardrails would become optional — the outcome we most
wanted to prevent.

**A `src/` tree generating `plugins/`.** Rejected for now: after the workspace templates moved
inside the skill that owns them, no material is shared between packs, so a materialisation step
would be machinery serving no case. If shared material appears, the rule is already written down
in `docs/packs.md`: one canonical source, copied at build time, freshness checked in CI.

**Keep `reply` as a dependency-only bundle.** Rejected on the product owner's call: with no
installed users there is nothing to be compatible with, and the brief warns that a bundle tends
to become a fourth capability boundary.

## Reassess when

A second provider adapter is actually written — that is the real test of whether the core is
vendor-neutral, and it will expose any Reply assumption that survived this split. Also if a pack
grows past roughly fifty skills, at which point the flat `skills/` directory inside it becomes
the constraint (ADR-0002).
