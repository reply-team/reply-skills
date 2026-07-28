# ADR-0005 — Third-party orchestrators as hosts; daemon as zero-dependency fallback

- **Date:** 2026-07-27 · **Status:** accepted (epic decision log, 2026-07-25)

## Context

Long-running, multi-session orchestrators already exist in the agent ecosystem (e.g. OpenClaw;
Hermes — pending a research spike). Building only our own `reply daemon` (REPLY-51324) maximizes
control but not autonomy or reach. The moat is skills + the API/MCP monetization surface — every
action flows through Reply regardless of whose orchestrator runs it.

## Decision

Treat third-party orchestrators as a **distribution target class** for skills, alongside coding
agents (Claude Code, Codex, Cursor…). Interop layer: host-neutral SKILL.md skills + the markdown
workspace (ADR-0004). `reply daemon` is re-scoped to the **zero-dependency fallback** — the option
for users with no orchestrator — and its design spike must include a build-vs-integrate evaluation
against existing orchestrators.

## Consequences

- Skills must never assume a specific orchestrator; scheduling/resumption semantics are expressed
  through workspace conventions, not host features.
- Supporting a new orchestrator ≈ verifying skill discovery + workspace access, not new content.
- `reply ui` retains value under any orchestrator (observability, scoped keys, billing).

## Follow-up

Research spike: Hermes capabilities; OpenClaw skill/workspace integration check (tracked with
REPLY-51324's spike).
