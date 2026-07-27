# Contributing to reply-skills

Skills are the product here — contributions are reviewed like code, because they run like code.

## Authoring a skill

1. Copy `templates/skill/SKILL.md` to `plugins/reply/skills/<kebab-name>/SKILL.md`.
2. Fill the frontmatter (the contract — see [docs/skill-contract.md](docs/skill-contract.md)) and
   the body sections. The `description` is what hosts route on: state trigger conditions.
3. Rules that will come up in review:
   - **Host-neutral**: no host-specific syntax; a skill must load in any SKILL.md host.
   - **Self-contained**: supporting files live in the skill's own directory; cross-skill
     references go by skill name (plugins are cached by copy — paths outside break).
   - **Docs-first execution**: reference exact docs.reply.io pages; never invent endpoint paths
     or body shapes. Missing CLI ergonomics feed the reply-cli roadmap, not workarounds.
   - **Honest gaps**: unavailable capability → say so (`Coming soon` endpoints included).
   - **Safety section**: any action touching a real prospect needs an explicit confirmation gate.
4. Run checks locally: `npm run validate && npm run build-index` (commit the INDEX.md change).

## Review & maturity

- PRs to business/protection skills require review by the owning expert group (see CODEOWNERS);
  technical/planning — any maintainer.
- Maturity moves deliberately: `draft` → `reviewed` (owner sign-off) → `validated` (evidence
  linked in `relations.validated-by`) → `production` (non-empty Validation + Safety, owner
  sign-off). Expert placeholders use explicit `TODO(expert):` markers — visible gaps beat
  invented expertise.
- **Review over overwrite**: corrections bump `version` + Changelog; substantial rewrites need an
  ADR (`templates/adr.md` → `docs/adr/`). Deprecate before removal (`status: deprecated`,
  successor in `supersedes`).

## Versioning

Semver per skill (`metadata.version`) and per plugin (`plugins/reply/.claude-plugin/plugin.json`
`version` — bump it on every release batch so marketplace users receive updates).

## Reporting knowledge back

Execution reports that confirm or refute a skill's guidance are the fuel of this repo: link them
in the skill's `relations.validated-by` via PR. See the `reporting-conventions` skill.
