# Contributing to reply-skills

Skills are the product here — contributions are reviewed like code, because they run like code.

## Before you start: which pack?

The repository ships three independently installable packs, and putting a skill in the wrong one
is the mistake that is expensive to undo. [docs/packs.md](docs/packs.md) makes the decision
mechanical, but the short version:

- Is it **SDR knowledge that would be true at any provider** — an operation, a playbook, a
  guardrail? → `ai-sdr-core`.
- Does it **know about Reply.io** — endpoints, scopes, CLI commands, MCP tools? → `reply-adapter`.
- Is it about **work surviving across sessions** — plans, work items, checkpoints, reports?
  → `agentic-runtime`.

If a skill would need content from two of those, it is two skills.

## Authoring a skill

1. Copy `templates/skill/SKILL.md` to `plugins/<pack>/skills/<kebab-name>/SKILL.md`.
2. Fill the frontmatter (the contract — see [docs/skill-contract.md](docs/skill-contract.md)) and
   the body sections. The `description` is what hosts route on: state trigger conditions.
3. Rules that will come up in review:
   - **Host-neutral**: no host-specific syntax; a skill must load in any SKILL.md host.
   - **Self-contained**: supporting files live in the skill's own `references/` or `templates/`.
     Cross-skill references go **by skill name** — hosts install one pack directory by copying,
     so a path to anywhere else dangles on the user's machine.
   - **Respect the dependency direction**: a hard `depends-on` may only point into your pack or a
     pack yours depends on. Vendor-neutral skills keep `tools` and `api` empty — a value there
     means the skill knows a product, and it belongs in an adapter.
   - **Docs-first execution** (adapter skills): reference exact docs.reply.io pages; never invent
     endpoint paths or body shapes. Missing CLI ergonomics feed the reply-cli roadmap, not
     workarounds.
   - **Honest gaps**: unavailable capability → say so. Knowledge awaiting a domain expert →
     `TODO(expert):`.
   - **Safety section**: defer to the `approval-boundaries` skill for the rules rather than
     restating them, so they cannot drift apart.
4. Run the checks and commit what they generate:

```bash
npm run build     # regenerates host manifests and catalogs
npm run check     # contract, architecture, freshness, per-pack + flat install simulation
```

## Review & maturity

- PRs to strategy/protection skills require review by the owning expert group (see CODEOWNERS);
  execution/runtime — any maintainer. Changes to `sdr-operations` or `approval-boundaries` need
  both, because everything else is built on them.
- Maturity moves deliberately: `draft` → `reviewed` (owner sign-off) → `validated` (evidence
  linked in `relations.validated-by`) → `production` (non-empty Validation + Safety, owner
  sign-off). Expert placeholders use explicit `TODO(expert):` markers — visible gaps beat
  invented expertise.
- **Review over overwrite**: corrections bump `version` + Changelog; substantial rewrites need an
  ADR (`templates/adr.md` → `docs/adr/`). Deprecate before removal (`status: deprecated`,
  successor in `supersedes`).

## Versioning

Semver per skill (`metadata.version`) and per pack (in `packs.json` — never in the generated
manifests). Bump the pack version on every release batch so marketplace users receive updates.

## Reporting knowledge back

Execution reports that confirm or refute a skill's guidance are the fuel of this repo: link them
in the skill's `relations.validated-by` via PR. Every `TODO(expert)` in the repository is waiting
for a report that tested it. See the `execution-reporting` skill.
