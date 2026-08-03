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

## Where this fits

Reply's agentic toolkit is three pieces. They are complementary, not alternatives:

| | What it is | When you want it |
|---|---|---|
| **[reply CLI](https://github.com/reply-team/reply-cli)** | `npm i -g reply-cli` — authenticated access to *every* v3 endpoint via `reply api` | Your agent has a shell. This is the complete surface. |
| **[Reply MCP](https://github.com/reply-team/reply-mcp)** | A curated tool catalog over `mcp.reply.io` | Your client speaks MCP and has no shell — desktop apps, hosted assistants. |
| **reply-skills** (this repo) | Outbound expertise as markdown skills: what to do, in what order, with what guardrails | Your agent knows *how* to call things but not *what* to run. |

MCP gives your agent tools. Skills give it judgement. Most setups want both; a shell-capable
agent can do everything through the CLI alone.

The shortest path that works: install the CLI, `reply auth login`, `reply skills install`, then
talk to your agent in plain words. MCP is optional — add it when your client has no shell.

## Install — one command, any assistant

The [reply CLI](https://github.com/reply-team/reply-cli) detects the assistants on your
machine and installs the packs into each one, dependencies resolved:

```bash
npm install -g reply-cli    # needs Node.js 20 or newer
reply skills install
```

```
✓ detected Claude Code, Codex
✓ Claude Code · ai-sdr-core, reply-adapter, agentic-runtime installed
✓ Codex       · ai-sdr-core, reply-adapter, agentic-runtime installed
Start a new session in each assistant so the skills load.
```

Install a subset — dependencies come along, so `adapter` pulls `core`:

```bash
reply skills install core
reply skills install adapter runtime
reply skills install --agent codex     # only this assistant
reply skills install --project         # into this repository, not your home
```

`reply skills list` shows what is installed where, `reply skills update` brings packs to the
latest version, and `reply skills remove` takes them out. Add `--dry-run` to any of them to
see the plan without changing anything.

**Claude Code and Codex are the two hosts this is verified against.** For Cursor, Windsurf,
Gemini CLI and GitHub Copilot the installer writes the files to each host's documented skills
directory, but we have not yet confirmed those hosts read them — the command tells you so in
its output. The per-host sections below are the manual equivalents, for when you would rather
not install the CLI.

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

## Install — Codex

Codex has its own plugin mechanism and reads this repository as a marketplace:

```bash
codex plugin marketplace add reply-team/reply-skills

# ai-sdr-core FIRST — Codex resolves no dependencies, see below
codex plugin add ai-sdr-core@reply-skills
codex plugin add reply-adapter@reply-skills
codex plugin add agentic-runtime@reply-skills
```

Skills appear namespaced per pack — `ai-sdr-core:campaign-launch`, `reply-adapter:reply-cli` —
so they never collide with skills you wrote yourself. **Start a new session** for newly
installed skills to be picked up.

> **Install order matters here.** The Codex plugin format has no dependency field at all, so
> nothing installs `ai-sdr-core` for you. Adding `reply-adapter` on its own gives you five
> skills whose guidance is missing. Install the core first, or install all three.

Managing them:

```bash
codex plugin list                              # installed
codex plugin list --available                   # what the marketplace offers
codex plugin remove reply-adapter@reply-skills   # remove one pack
codex plugin marketplace upgrade                # pull a newer snapshot of this repo
```

Verified with **`codex-cli 0.146.0-alpha.3.1`**: all three packs install, and all 18 skills
reach the model — 9 + 5 + 4, confirmed via `codex debug prompt-input`. Re-running
`codex plugin add` upgrades in place: it does not duplicate the config entry or the cache.

**On Windows the `codex` binary is not on `PATH`** — it ships with the desktop app at
`%LOCALAPPDATA%\OpenAI\Codex\bin\<hash>\codex.exe`. Call it by full path, and note that
tooling which detects Codex with `which codex` will wrongly report it as missing.

## Install — Cursor, Windsurf, Gemini CLI and other SKILL.md hosts

> **Not verified yet.** These hosts have no plugin mechanism, so a pack is installed by
> copying its skills directory. That works because a pack is just a directory of skills, but
> the exact paths below have not been tested on each host — treat them as a starting point
> rather than a contract.

`reply skills install` (above) does this copying for you, to the same unverified paths. These
manual steps are the equivalent by hand.

No plugin mechanism means no dependency resolution, so **install the core yourself** — every
other pack needs it:

```bash
git clone https://github.com/reply-team/reply-skills /tmp/reply-skills

# ai-sdr-core is required by the others — copy it first
cp -r /tmp/reply-skills/plugins/ai-sdr-core/skills/*     <host skills dir>/
cp -r /tmp/reply-skills/plugins/reply-adapter/skills/*   <host skills dir>/
cp -r /tmp/reply-skills/plugins/agentic-runtime/skills/* <host skills dir>/
```

Omit the packs you do not want — but never copy `reply-adapter` or `agentic-runtime` without
`ai-sdr-core`, or their skills will reference guidance that is not there. Start a new session
afterwards.

## Install channels — what is actually verified

A command in this README is part of the product contract, so each row below says which version
it was tested against. Rows marked *not verified* have instructions that are a reasonable
starting point, not a promise.

| Channel | Installs | Dependency handling | Layout on disk | Verified |
|---|---|---|---|---|
| **`reply skills install`** | Packs | **Resolved by the installer** on every host | Whatever the channel it drives produces | reply CLI 0.4.0 — Claude Code and Codex; other hosts receive files, unconfirmed |
| Claude Code plugin marketplace | Packs | **Resolved by the host** — `reply-adapter` pulls `ai-sdr-core` | Namespaced per pack | Claude Code 2.1.220 |
| `npx skills` / [skills.sh](https://www.skills.sh/reply-team/reply-skills) | Individual skills | **None** — install all 18 yourself | Flat, no namespacing | skills CLI 1.5.21 |
| Codex plugin marketplace | Packs | **Manual** — install `ai-sdr-core` first; the format has no dependency field | Namespaced per pack | codex-cli 0.146.0-alpha.3.1 |
| Cursor, Windsurf, Gemini CLI, GitHub Copilot (directory copy) | Skills, by copying | **Manual** — copy `ai-sdr-core` first | Flat, per host path | Not verified |

The first two channels resolve the `ai-sdr-core` dependency for you. On the rest, installing a
pack without the core is something you have to avoid deliberately.

## Execution requirements

**Installing skills is not the same as configuring a provider.** The core and runtime packs need
nothing. `reply-adapter` needs at least one Reply.io execution surface — the CLI, the MCP server,
or the API directly; [Where this fits](#where-this-fits) says which to pick, and the
[reply CLI](https://github.com/reply-team/reply-cli) repository is the source of truth for
installing and authenticating it. To drive the API on its own, the full surface is the
[v3 reference](https://docs.reply.io/api-reference/introduction) — agents should start at
[llms.txt](https://docs.reply.io/llms.txt).

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
