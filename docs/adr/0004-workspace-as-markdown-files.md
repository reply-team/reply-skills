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
