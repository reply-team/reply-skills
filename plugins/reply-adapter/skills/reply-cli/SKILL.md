---
name: reply-cli
description: >
  Operate Reply.io from the terminal with the reply CLI: sign in (OAuth or API key),
  manage profiles and team context, and call any API v3 endpoint via `reply api`.
  Use when executing any Reply.io operation from a shell, setting up authentication,
  or when another Reply skill needs commands executed.
metadata:
  version: 1.1.0
  pack: reply-adapter
  category: execution
  maturity: reviewed
  status: active
  owner: skills-maintainers
  tags: [cli, auth, execution]
  tools: [reply-cli]
  api: [user-account]
  relations:
    recommends: [reply-api, reply-auth, reply-operations-mapping]
---

# Using the reply CLI

## Purpose

`reply` (npm: `reply-cli`, Node ≥ 20) is the terminal entry point to Reply.io. It handles
authentication, multi-account profiles and team context, and exposes the **entire** API v3 through
one command — `reply api`. All other Reply skills execute through it.

## When to use / when NOT to use

- Use for any Reply.io operation from a shell: auth, identity checks, raw API calls.
- Do NOT call `https://api.reply.io` with curl/fetch directly — the CLI adds credential handling,
  retries with `Retry-After`, team headers and error guidance for free.
- In an MCP-connected client where no shell is available, use the `reply-mcp` skill instead.

## Prerequisites

- Node.js ≥ 20. Setup check once per session: `command -v reply` — if absent, prefix commands with
  `npx -y reply-cli` and suggest `npm i -g reply-cli` for frequent use.
- Verify auth before any workflow: `reply auth whoami` — do not proceed until it succeeds.

## Execution guidance

### Authentication

```bash
reply auth login                      # OAuth in the browser (PKCE) — preferred interactively
echo <key> | reply auth login --with-token   # store an API key (stdin keeps it out of history)
reply auth status                     # who you are signed in as, and how — no secrets printed
reply auth whoami                     # verify the credential against the API
reply auth logout
```

Credential precedence (strict): `--api-key` flag → `REPLY_API_KEY` env → stored credential.
Flag/env are ephemeral — never written to disk. Expired OAuth sessions refresh automatically; if
refresh fails the CLI asks to log in again.

### Profiles (multiple accounts)

```bash
reply profile add alice@example.com && reply profile use alice@example.com
reply profile list                    # '*' marks the active profile
reply --profile bob@example.com auth whoami    # one-off override
```

Resolution: `--profile` → `REPLY_PROFILE` → profile set with `profile use` → default.
Each profile stores its own credential; `profile show` never prints secrets.

### Team context

A profile can pin a team (workspace); it is sent as `X-TEAM-ID` on every call.
Precedence: `--team-id` → `REPLY_TEAM_ID` → the profile's pinned team.

```bash
reply team list          # teams you can act in
reply team use 1045      # verify + pin on the current profile
reply team current       # pinned + effective team
```

Organization API keys additionally need an acting user: pass exactly one of `--user-id <id>` or
`--user-email <email>` (email also requires a team id). Flag-only — never stored.

### `reply api` — any v3 endpoint

```bash
reply api /v3/whoami                          # GET; your identity + team
reply api /v3/sequences                       # list sequences
reply api /v3/contacts --pretty               # indented output
reply api /v3/contacts --body @contact.json   # a body switches the method to POST
echo '<json>' | reply api /v3/contacts --body -    # body from stdin
reply api /v3/whoami --verbose                # full request/response trace on stderr, creds redacted
```

Rules: the path is used **exactly as written in the API docs** (starts with `/v3`; query string
goes in the path). `--method GET|POST|PUT|PATCH|DELETE` overrides the default. Output is always
`{"code": <http status>, "data": <body>}` on stdout — check `code` yourself; stdout stays clean
for piping. Transient failures (429/5xx) retry automatically honoring `Retry-After`.

### Exit codes & errors

- `0` success · `1` API/runtime error (`code` ≥ 400 in the printed JSON) · `2` usage error.
- On team/user-resolution errors the CLI prints fix-it guidance on stderr (e.g. `TEAM_REQUIRED` →
  `reply team use <id>`, with your teams listed). Follow it before retrying.
- `401` with empty body = bad/expired credential → re-run `reply auth login` or fix the key.

## Validation

After any write, read the entity back (`reply api GET …`) and confirm IDs/counts before reporting
success. Never claim success without checking `code` and the response body.

## Reporting

Include in reports: commands executed (writes only), resulting IDs and counts, and any non-zero
exit codes with their error `code` slugs.

## Failure modes

- `Not authenticated` → run the auth setup above.
- `TEAM_REQUIRED` / `TEAM_NOT_ACCESSIBLE` / `USER_REQUIRED` / `USER_NOT_FOUND` → see
  `reply-auth` skill; the CLI's stderr guidance shows the exact fix.
- Discrete domain commands (e.g. `reply sequences list`) are **not available yet** — the CLI
  currently covers auth/profile/team plus `reply api`. Don't invent commands; use `reply api`.

## Safety

`reply api` executes real mutations with no dry-run: treat any POST/PATCH/DELETE as live. Follow
the calling skill's confirmation rules; never send a write on the user's behalf without the
explicit confirmation its Safety section requires.

## Related skills

- `reply-api` — how to find the right endpoint and read the docs before calling.
- `reply-auth` — key types, scopes and team/org resolution in depth.

## Changelog

- 1.1.0 (2026-07-30): moved into the `reply-adapter` pack; category `technical` → `execution`;
  `auth-and-keys` renamed `reply-auth`.
- 1.0.0 (2026-07-27): initial version, matches reply-cli v1 (auth, profiles, teams, `reply api`).
