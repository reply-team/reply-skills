# The Skill Contract

> Normative spec for every skill in this repository. CI (`scripts/validate.mjs`) enforces the
> machine-checkable parts. See ADR-0003 for why the frontmatter is the manifest.

A skill is a directory under `plugins/<plugin>/skills/<skill-name>/` containing `SKILL.md` and,
optionally, supporting files (`references/`, `examples/`). Skills are host-neutral markdown: they
must load unchanged in any Agent Skills host (Claude Code, Codex, Cursor, Gemini CLI, …).

## Frontmatter — two layers

### Layer 1 — host contract (required, standard Agent Skills)

| Key | Rule |
|---|---|
| `name` | kebab-case, must equal the directory name |
| `description` | 1–3 sentences: what the skill does **and when to trigger it** ("Use when…"). Hosts match on this — write it for the router, not for humans |

### Layer 2 — Reply contract (`metadata:` block; hosts ignore it)

```yaml
metadata:
  version: 1.0.0            # semver; bump on every content change (see Changelog)
  category: business        # technical | business | planning | protection | user-knowledge
  maturity: draft           # draft | reviewed | validated | production
  status: active            # active | deprecated | archived
  owner: outbound-experts   # CODEOWNERS group responsible for content
  tags: [sequences, safety]
  tools: [reply-cli, reply-mcp]        # execution surfaces the skill drives
  api: [sequences, contacts]           # API v3 doc groups touched (docs.reply.io group slugs)
  relations:
    depends-on: [reply-cli]            # can't run without these skills
    extends: []                        # refines/specializes another skill
    recommends: [email-deliverability] # worth reading alongside
    validates: []                      # this skill checks another skill's output
    validated-by: []                   # evidence: report/experiment links accumulate here
    supersedes: []                     # replaces an older skill (set its status: deprecated)
    alternative-to: []                 # different approach to the same problem
```

Frontmatter uses a constrained YAML subset (flat scalars, inline `[a, b]` arrays, one nesting
level under `metadata:`/`relations:`) so the zero-dependency validator can parse it. Don't use
anchors, multi-line strings, or deeper nesting.

## Body — canonical sections

In order (omit a section only when genuinely empty; `production` maturity requires non-empty
**Validation** and **Safety**):

1. **Purpose** — the problem this skill solves; one paragraph.
2. **When to use / when NOT to use** — boundaries; point to alternatives.
3. **Prerequisites** — auth, scopes, data, other skills.
4. **Planning guidance** — how to think about the task before acting; decomposition hints.
5. **Execution guidance** — concrete steps, commands, endpoints. Reference exact API doc pages;
   never invent endpoint paths or body shapes.
6. **Validation** — how to verify the outcome (state checks, counts, IDs).
7. **Reporting** — what the resulting report must capture (see `templates/report.md`).
8. **Failure modes** — known errors and recovery, honest gaps.
9. **Safety** — actions requiring explicit user confirmation; irreversibility notes.
10. **Related skills** — prose complement to `relations:`.
11. **Changelog** — newest first: `- 1.1.0 (2026-07-27): what changed`.

## Maturity ladder

| Level | Meaning | Gate |
|---|---|---|
| `draft` | Structurally complete, content plausible; agent-authored OK | CI schema checks |
| `reviewed` | A maintainer (technical) or domain expert (business/protection) signed off | PR review by `owner` |
| `validated` | Real executions confirmed the guidance; evidence linked | ≥1 `validated-by` link |
| `production` | Default recommendation; safe to follow blindly | non-empty Validation + Safety; owner sign-off |

Expert placeholders: business/protection skills may ship as skeletons with explicit
`TODO(expert): …` markers. Visible gaps are fine; invented expertise is not.

## Rules of change

- **Review over overwrite**: corrections bump `version` + Changelog; rewrites need an ADR.
- Additive first; deprecate before removal (`status: deprecated`, successor in `supersedes`).
- If knowledge repeats across skills, extract a shared skill instead of copying.
