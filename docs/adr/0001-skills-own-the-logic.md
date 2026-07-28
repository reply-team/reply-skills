# ADR-0001 — Skills own the logic

- **Date:** 2026-07-27 · **Status:** accepted

## Context

The Reply Agentic Toolkit (epic REPLY-51231) spans a CLI, an MCP server, a local Web UI, a daemon
and this repository. Business knowledge could live in any of them — encoded in commands, tool
descriptions, or prompts. LLMs commoditize; execution tools become interchangeable; the durable
long-term value is accumulated, validated operational knowledge, which compounds.

## Decision

Business methodology, operational rules and orchestration logic are expressed as **skills** in this
repository — versioned, reviewable markdown. In this open-source project, "classical programming"
largely moves into skills. Infrastructure (CLI, MCP, daemon, UI) stays deliberately generic and
executes what skills describe; it is **not** demoted — these are first-class product surfaces —
but it must not absorb business decisions.

## Consequences

- New requirements are evaluated in this order: existing skill? → extend a skill? → new skill? →
  repo structure? → only then new infrastructure.
- Logic drifting into infrastructure is the #1 anti-pattern to watch for in review.
- The repo is managed as a product (curation, ownership, maturity), not as documentation.

## Alternatives considered

Encoding workflows as CLI subcommands or MCP tool descriptions — rejected: knowledge becomes
invisible, unversionable by domain experts, and locked to one execution surface.
