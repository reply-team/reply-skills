# ADR-0004 — Workspace as markdown files

- **Date:** 2026-07-27 · **Status:** accepted

## Context

Long-running orchestration needs durable runtime instances: goals, plans, work items, reports,
artifacts, logs. They must be resumable across sessions, reviewable by humans, and usable by any
agent host today — before `reply daemon` or `reply ui` exist. Options: a local database, a cloud
service, or plain files.

## Decision

The user workspace is **plain markdown + YAML frontmatter in a user-owned directory** (marker file
`reply-workspace.yaml`, walk-up discovery, fallback `~/reply-workspace/`). Spec: `docs/workspace.md`.
The repository holds knowledge; the workspace holds instances.

## Consequences

- Works with zero infrastructure: any agent that reads/writes files can run the loop today.
- Git-friendly: history, review and sync come for free if the user wants them.
- `reply daemon` and `reply ui` later *consume* the workspace without owning it; third-party
  orchestrators interoperate through the same files (ADR-0005).
- Trade-off accepted: no transactional guarantees or concurrent-writer safety — single-operator
  workspaces are the v1 assumption; revisit if/when the daemon multiplexes agents.

## Alternatives considered

SQLite state store — rejected for v1: opaque to humans and agents, needs tooling before any value.
Cloud-side state — rejected: contradicts "users bring their own agents/tokens" and local-first
autonomy.

## Amended 2026-07-30 — the specification moved into the pack

The workspace model is knowledge an agent needs at runtime, so under ADR-0006 it belongs in a
skill rather than in `docs/`, which is not installed. The normative specification now ships
inside `agentic-runtime` as a reference file of the `durable-work` skill, with the plan and
work-item templates alongside it. An installed pack is therefore self-contained; previously the
skill that told an agent to use a template pointed at a repository path that no install ever
copied.

Two clarifications that follow from the pack boundary:

- The marker filename keeps its `reply-` prefix for continuity, but provider-specific keys in it
  (for example a default team) are explicitly optional **extensions**. Nothing in
  `agentic-runtime` reads them; an adapter may. The runtime pack does not depend on Reply.
- Work items now name the vendor-neutral **operations** they perform, so an item stays reviewable
  without knowing which provider will execute it.
