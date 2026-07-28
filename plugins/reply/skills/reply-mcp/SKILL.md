---
name: reply-mcp
description: >
  Connect Reply.io to an MCP-compatible AI client (Claude, ChatGPT, Codex, Cursor) via the
  remote server mcp.reply.io, choose the right auth, and decide when to use MCP tools versus
  the CLI. Use when setting up the Reply MCP connection or choosing between MCP and CLI execution.
metadata:
  version: 1.0.0
  category: technical
  maturity: reviewed
  status: active
  owner: skills-maintainers
  tags: [mcp, setup, auth]
  tools: [reply-mcp]
  api: [introduction]
  relations:
    recommends: [reply-cli, auth-and-keys]
    alternative-to: [reply-cli]
---

# Reply MCP

## Purpose

Reply MCP (`https://mcp.reply.io`, remote streamable-http) exposes a curated catalog of Reply
tools (`reply_*`) to any MCP client — contacts, sequences, analytics, inbox, tasks, channels,
team, and the AI-SDR configuration surface. One connection, no HTTP plumbing.

## When to use / when NOT to use

- Use in MCP-capable clients when no shell is available, or when curated tools cover the task.
- The MCP catalog is a **subset** of the API. When a needed capability is missing from the tools,
  fall back to the CLI (`reply api` reaches everything) rather than improvising.

## Prerequisites

Either a **personal scoped API key** (Reply → Settings → API Key) or an OAuth-capable MCP client.

## Execution guidance

### Connect

```bash
# Claude Code
claude mcp add --transport http reply-mcp https://mcp.reply.io \
  --header "Authorization: Bearer <personal_api_key>"

# Codex
export REPLY_MCP_TOKEN="<personal_api_key>"
codex mcp add reply-mcp --url https://mcp.reply.io --bearer-token-env-var REPLY_MCP_TOKEN
```

Desktop apps (Claude, ChatGPT): add a remote/custom connector with URL `https://mcp.reply.io` and
authorize via OAuth. Verify by listing tools — `reply_*` should appear.

### Choosing auth

- **Personal API key (recommended):** scoped — grant only the permissions the agent needs; a tool
  is callable only if the key holds its scope.
- **OAuth:** grants the full tool catalog (all scopes) — convenient, but prefer a scoped key when
  you want to bound what the agent can do.
- **Not supported:** Team keys and Organization keys (act-on-behalf) — MCP is a single-user
  connection. Never pass credentials in the URL (`?api_key=…`); header or OAuth only.

## Validation

After connecting, call a read tool (e.g. current-user/team lookup) and confirm the expected
identity before running workflows.

## Reporting

Note which surface executed each step (MCP tool vs CLI) so runs are reproducible.

## Failure modes

- Tool missing for the task → use `reply-cli` (`reply api`); the docs cover the full surface.
- Scope-denied tool call → the key lacks that permission; see `auth-and-keys`.
- OAuth client fails with a registration/allow-list error → the client lacks CIMD support and DCR
  is allow-listed server-side; report it to the Reply community Slack (docs.reply.io/slack).

## Safety

Same rules as everywhere: tools that send messages, start sequences, or delete data require the
user's explicit confirmation in the conversation. A scoped key is the mechanical enforcement —
recommend read-mostly scopes for unattended agents.

## Related skills

- `reply-cli` — full-surface alternative and fallback.
- `auth-and-keys` — scope grammar and key hygiene.

## Changelog

- 1.0.0 (2026-07-27): initial version per docs.reply.io/reply-mcp.
