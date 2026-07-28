# reply-skills

Reply.io outbound expertise for AI agents — the knowledge core of the
[Reply Agentic Toolkit](https://docs.reply.io). Skills teach your agent how to run real outbound
through Reply: import prospects, launch sequences, manage replies, analyze performance, plan
long-running campaigns — with protection guardrails and explicit human-approval gates for
anything that touches a real prospect.

Skills are plain markdown in the open [Agent Skills](https://agentskills.io) format: they work in
Claude Code, Codex, Cursor, Gemini CLI and any SKILL.md-compatible host, and execute through the
[reply CLI](https://github.com/reply-team/reply-cli) (`npm i -g reply-cli`) and the
[Reply API v3](https://docs.reply.io).

**Catalog:** see [INDEX.md](INDEX.md) — every skill with its maturity and description.
Agents: fetch INDEX.md first; each skill's frontmatter is its contract.

## Install

**Prerequisite (all hosts):** the reply CLI + a Reply.io login.

```bash
npm install -g reply-cli
reply auth login          # OAuth in the browser; new users get a free tier
```

### Claude Code (plugin marketplace)

```
/plugin marketplace add reply-team/reply-skills
/plugin install reply@reply-skills
```

Skills appear namespaced as `/reply:<skill>` and update through the marketplace.

### Codex

Codex discovers skills in `.agents/skills` (project) or `~/.agents/skills` (user):

```bash
git clone https://github.com/reply-team/reply-skills /tmp/reply-skills
cp -r /tmp/reply-skills/plugins/reply/skills/* ~/.agents/skills/
```

Or point Codex's `$skill-installer` at this repository.

### Cursor, Gemini CLI, other SKILL.md hosts

Copy the same `plugins/reply/skills/*` directories into the host's skills location.
A one-command installer for every assistant (`reply skills install`) is on the CLI roadmap.

## What's inside

| Category | Skills |
|---|---|
| **Technical** | `reply-cli` · `reply-api` · `reply-mcp` · `auth-and-keys` — how agents drive the platform correctly |
| **Business** | `import-prospects` · `launch-outreach` · `manage-replies` · `analyze-performance` |
| **Planning** | `outbound-campaign-planning` · `reporting-conventions` — goals → durable plans → work items → reports |
| **Protection** | `email-deliverability` · `linkedin-safety` — guardrails; the agent protects your domain and accounts |
| **User knowledge** | `user-memory-conventions` — your preferences, ICP and playbooks in your workspace |

## Safety model

Skills never let an agent start a sequence, send a message, or delete data without your explicit
confirmation in the conversation. Bulk operations show their plan first. Protective actions
(pausing a burning campaign) are the one exception — action first, immediate notification.
Mechanically bound by [scoped API keys](https://docs.reply.io/api-reference/authentication):
grant an agent only the scopes its workflows need.

## The workspace

Long-running campaigns persist state in a **workspace** — a plain-markdown directory
(`reply-workspace.yaml` marker) holding goals, plans, work items, reports and your `memory/`.
Any agent, and later `reply daemon` / `reply ui`, can pick up where the last session stopped.
Spec: [docs/workspace.md](docs/workspace.md).

## Repository docs

- [docs/conventions.md](docs/conventions.md) — layout, categories, governance
- [docs/skill-contract.md](docs/skill-contract.md) — the contract every skill follows
- [docs/workspace.md](docs/workspace.md) — the user workspace spec
- [docs/roadmap.md](docs/roadmap.md) — knowledge-system milestones
- [docs/adr/](docs/adr) — why the big decisions were made
- [CONTRIBUTING.md](CONTRIBUTING.md) — authoring and review

## Related

[reply-cli](https://github.com/reply-team/reply-cli) · [Reply MCP](https://docs.reply.io/reply-mcp)
(`mcp.reply.io`) · [API v3 reference](https://docs.reply.io/api-reference/introduction)
(agents: start at [llms.txt](https://docs.reply.io/llms.txt))

## License

MIT © Reply.io
