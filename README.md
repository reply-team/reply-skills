# reply-skills

Outbound sales expertise for AI agents, as plain markdown skills.

Teach your agent how to run real outbound: shape an audience, launch a sequence, work the
replies, read the numbers honestly — with guardrails that protect your domain and explicit
approval gates before anything reaches a real person.

Skills are in the open [Agent Skills](https://agentskills.io) format, so they work in Claude
Code, Codex, Cursor, Gemini CLI and any `SKILL.md`-compatible host.

## Three packs

The SDR expertise is **independent of any product**. Reply.io execution is a separate,
replaceable pack. Install what you need:

| Pack | What it gives you | Requires |
|---|---|---|
| **`ai-sdr-core`** | The vendor-neutral core: what an SDR operation *is*, outbound strategy and playbooks, and the guardrails — sending limits, channel limits, approval boundaries. Works with any provider, or none. | — |
| **`reply-adapter`** | Executes that core against [Reply.io](https://reply.io): the `reply` CLI, API v3, the MCP server, auth and scopes, error translation. | `ai-sdr-core` + a Reply.io account |
| **`agentic-runtime`** | Durable multi-session work: goals, plans, work items, checkpoints, resumability, reports, user memory. Skip it if your orchestrator already does this. | `ai-sdr-core` |

`ai-sdr-core` and `agentic-runtime` are useful **without** Reply.io and without the Reply CLI.
Only `reply-adapter` needs an execution provider — see [Execution requirements](#execution-requirements).

## Install — Claude Code

Everything, in three terminal commands:

```bash
claude plugin marketplace add reply-team/reply-skills
claude plugin install reply-adapter@reply-skills
claude plugin install agentic-runtime@reply-skills
```

`ai-sdr-core` is installed automatically as a dependency of either pack — Claude Code resolves
it for you and reports `(+ 1 dependency: ai-sdr-core)`.

Selective installs, if you want less:

```bash
# Just the vendor-neutral SDR expertise — no provider, no runtime
claude plugin install ai-sdr-core@reply-skills

# Core + Reply execution, no durable-work runtime
claude plugin install reply-adapter@reply-skills

# Core + durable work, driven by your own orchestrator, no Reply
claude plugin install agentic-runtime@reply-skills
```

Skills appear namespaced per pack — `ai-sdr-core:campaign-launch`,
`reply-adapter:reply-cli` — so they never collide with skills you wrote yourself.
**Start a new session** for newly installed skills to be picked up.

## Install — any agent, via the skills ecosystem CLI

[`npx skills`](https://github.com/vercel-labs/skills) is the ecosystem's package manager for
Agent Skills, with a directory entry at
[skills.sh/reply-team/reply-skills](https://www.skills.sh/reply-team/reply-skills). Use it to
reach the long tail of hosts we do not package for individually, or to try these skills quickly
in whatever agent you already run.

```bash
# Everything — asks where to install, or installs all 18 when a coding agent invokes it
npx skills add reply-team/reply-skills

# Everything, no prompts, into one named agent
npx skills add reply-team/reply-skills --skill '*' --agent claude-code -y

# See what the repository offers without installing anything
npx skills add reply-team/reply-skills --list
```

Verified with skills CLI **1.5.21** (Windows, Claude Code 2.1.220): `--list` reports
`Found 18 skills`, and a full install places all 18 — with their `references/` and `templates/`
files — in the host's skills directory (`.claude/skills/` for a project-scoped Claude Code
install), recording provenance in `skills-lock.json` so `npx skills update` works later. Invoked
by an agent rather than a person it prints `Agent detected — installing non-interactively` and
installs all 18, so it is safe to script.

> **This channel has no pack model.** It installs individual skills by name: no packs, no
> namespacing, no dependency resolution. **Install all 18** — that is the only shape supported
> here. A `--skill` subset is your own responsibility, because the CLI will install
> `reply-operations-mapping` or `durable-work` without `sdr-operations` and say nothing about
> it, leaving a skill whose declared dependency is simply absent.

If you want dependencies resolved for you, use the Claude Code marketplace above, where
installing `reply-adapter` pulls in `ai-sdr-core` automatically.

## Install — Codex and other SKILL.md hosts

> **Not verified yet.** Native plugin packaging for Codex is tracked in REPLY-51541; until it
> lands, use the directory copy below. It works because a pack is just a directory of skills,
> but the exact commands have not been tested on a supported Codex version — treat them as a
> starting point rather than a contract.

Hosts with a flat skills directory (Codex `~/.agents/skills`, Cursor, Gemini CLI) have no
dependency resolution, so **install the core yourself** — every other pack needs it:

```bash
git clone https://github.com/reply-team/reply-skills /tmp/reply-skills

# ai-sdr-core is required by the others — copy it first
cp -r /tmp/reply-skills/plugins/ai-sdr-core/skills/*     ~/.agents/skills/
cp -r /tmp/reply-skills/plugins/reply-adapter/skills/*   ~/.agents/skills/
cp -r /tmp/reply-skills/plugins/agentic-runtime/skills/* ~/.agents/skills/
```

Omit the packs you do not want — but never copy `reply-adapter` or `agentic-runtime` without
`ai-sdr-core`, or their skills will reference guidance that is not there. Start a new session
afterwards.

A one-command installer that handles host detection and dependency order for every assistant
(`reply skills install`) is on the CLI roadmap.

## Install channels — what is actually verified

A command in this README is part of the product contract, so each row below says which version
it was tested against. Rows marked *not verified* have instructions that are a reasonable
starting point, not a promise.

| Channel | Installs | Dependency handling | Layout on disk | Verified |
|---|---|---|---|---|
| Claude Code plugin marketplace | Packs | **Resolved by the host** — `reply-adapter` pulls `ai-sdr-core` | Namespaced per pack | Claude Code 2.1.220 |
| `npx skills` / [skills.sh](https://www.skills.sh/reply-team/reply-skills) | Individual skills | **None** — install all 18 yourself | Flat, no namespacing | skills CLI 1.5.21 |
| Codex native packaging | Packs | Not yet determined | Not yet determined | Not verified — REPLY-51541 |
| Cursor, Windsurf, Gemini CLI (directory copy) | Skills, by copying | **Manual** — copy `ai-sdr-core` first | Flat, per host path | Not verified — REPLY-51268 |
| `reply skills install` | All three packs | Resolved by the installer | Per host | Planned — REPLY-51356 |

Only the first channel enforces the `ai-sdr-core` dependency for you. On every other channel,
installing a pack without the core is something you have to avoid deliberately. Per-host skills
paths and the exact version each was tested on are tracked in REPLY-51268.

## Execution requirements

**Installing skills is not the same as configuring a provider.** The core and runtime packs need
nothing. `reply-adapter` needs at least one Reply.io execution surface:

- **[reply CLI](https://github.com/reply-team/reply-cli)** — the usual choice; reaches every v3
  endpoint via `reply api`. That repository is the source of truth for installing and
  authenticating it.
- **[Reply API v3](https://docs.reply.io/api-reference/introduction)** — the full surface.
  Agents: start at [llms.txt](https://docs.reply.io/llms.txt).
- **[Reply MCP](https://docs.reply.io/reply-mcp)** (`mcp.reply.io`) — a curated tool catalog for
  MCP clients, useful where no shell is available.

If the CLI is already installed, this confirms the adapter has something to drive:

```bash
reply auth whoami
```

## What's inside

See [INDEX.md](INDEX.md) for the full catalog — every skill, its pack, maturity and version.
Agents: fetch that first; each skill's frontmatter is its contract.

Some business and protection content ships as **honest skeletons** marked `TODO(expert)`:
structure and safety posture are final, the numbers await validation by domain experts. A visible
gap is deliberate — invented expertise would be worse.

## Safety model

Skills never let an agent start a sequence, send a message, or delete data without your explicit
confirmation in the conversation. Anything that sends content requires you to approve the
**literal text** first. Bulk operations show their plan and their counts before running.

Protective actions are the one exception: pausing a campaign that is burning your domain happens
first and tells you immediately, because waiting is the destructive choice.

The rules live in one place — the `approval-boundaries` skill — and ship inside `ai-sdr-core`, so
no selective install can leave them out. They are additionally bound mechanically by
[scoped API keys](https://docs.reply.io/api-reference/authentication): grant an agent only the
scopes its workflows need.

## Managing installed packs

```bash
claude plugin list                      # what's installed
claude plugin details ai-sdr-core       # its skills and their token cost
claude plugin update reply-adapter      # update one pack (restart to apply)
claude plugin uninstall reply-adapter   # remove a pack
claude plugin prune                     # drop dependencies nothing needs any more
```

## Contributing

Skills are the product here — they are reviewed like code, because they run like code. Start with
[CONTRIBUTING.md](CONTRIBUTING.md), then:

- [docs/packs.md](docs/packs.md) — the layer model, the three packs, and the invariants CI enforces
- [docs/skill-contract.md](docs/skill-contract.md) — the contract every skill follows
- [docs/conventions.md](docs/conventions.md) — layout, categories, governance
- [docs/adr/](docs/adr) — why the big decisions were made
- [docs/roadmap.md](docs/roadmap.md) — where the knowledge system is going

```bash
npm run build && npm run check    # regenerate manifests and catalogs, then verify everything
```

## License

MIT © Reply.io
