# The Skill Contract

> Normative spec for every skill in this repository. CI (`scripts/validate.mjs`) enforces the
> machine-checkable parts. See ADR-0003 for why the frontmatter is the manifest, and
> [packs.md](packs.md) for the pack architecture the relation rules depend on.

A skill is a directory under `plugins/<pack>/skills/<skill-name>/` containing `SKILL.md` and,
optionally, its own supporting files (`references/`, `templates/`, `examples/`). Skills are
host-neutral markdown: they must load unchanged in any Agent Skills host (Claude Code, Codex,
Cursor, Gemini CLI, …).

## Frontmatter — two layers

### Layer 1 — host contract (required, standard Agent Skills)

| Key | Rule |
|---|---|
| `name` | kebab-case, must equal the directory name, unique across all packs |
| `description` | 1–3 sentences: what the skill does **and when to trigger it** ("Use when…"). Hosts match on this — write it for the router, not for humans |

### Layer 2 — Reply contract (`metadata:` block; hosts ignore it)

```yaml
metadata:
  version: 1.0.0            # semver; bump on every content change (see Changelog)
  pack: ai-sdr-core         # must match the directory this skill lives in
  category: strategy        # operations | strategy | protection | execution | runtime | user-knowledge
  maturity: draft           # draft | reviewed | validated | production
  status: active            # active | deprecated | archived
  owner: outbound-experts   # CODEOWNERS group responsible for content
  tags: [campaigns, safety]
  tools: []                 # execution surfaces the skill drives — EMPTY for vendor-neutral skills
  api: []                   # provider doc groups touched — EMPTY for vendor-neutral skills
  relations:
    depends-on: [sdr-operations]       # HARD: can't run without these skills
    extends: []                        # HARD: refines/specializes another skill
    recommends: [campaign-launch]      # SOFT: worth reading alongside
    validates: []                      # this skill checks another skill's output
    validated-by: []                   # evidence: report/experiment links accumulate here
    supersedes: []                     # replaces an older skill (set its status: deprecated)
    alternative-to: []                 # different approach to the same problem
```

Frontmatter uses a constrained YAML subset (flat scalars, inline `[a, b]` arrays, one nesting
level under `metadata:`/`relations:`) so the zero-dependency validator can parse it. Don't use
anchors, multi-line strings, or deeper nesting.

### Relations and pack boundaries

This is the rule that keeps packs separable, and it is enforced:

- **Hard relations** (`depends-on`, `extends`) may only target skills in this pack or in a pack
  it declares a dependency on. A hard relation pointing anywhere else would break a solo
  install.
- **Soft relations** (everything else) may cross any boundary — but the skill must still be
  usable when the target is absent. Mention it as optional in prose, don't build on it.
- A vendor-neutral skill has empty `tools` and `api`. A non-empty value there means the skill
  knows about a specific product, and it belongs in an adapter pack.

## Body — canonical sections

In order (omit a section only when genuinely empty; `production` maturity requires non-empty
**Validation** and **Safety**):

1. **Purpose** — the problem this skill solves; one paragraph.
2. **When to use / when NOT to use** — boundaries; point to alternatives.
3. **Prerequisites** — auth, data, other skills, and the operations used.
4. **Planning guidance** — how to think about the task before acting; decomposition hints.
5. **Execution guidance** — concrete steps. Vendor-neutral skills name **operations**; adapter
   skills name endpoints and doc pages, and never invent paths.
6. **Validation** — how to verify the outcome (state checks, counts, IDs).
7. **Reporting** — what the resulting report must capture.
8. **Failure modes** — known errors and recovery, honest gaps.
9. **Safety** — actions requiring explicit user confirmation; irreversibility notes. Defer to
   `approval-boundaries` for the rules rather than restating them, so they cannot drift.
10. **Related skills** — prose complement to `relations:`.
11. **Changelog** — newest first: `- 1.1.0 (2026-07-30): what changed`.

## Maturity ladder

| Level | Meaning | Gate |
|---|---|---|
| `draft` | Structurally complete, content plausible; agent-authored OK | CI schema checks |
| `reviewed` | A maintainer (technical) or domain expert (business/protection) signed off | PR review by `owner` |
| `validated` | Real executions confirmed the guidance; evidence linked | ≥1 `validated-by` link |
| `production` | Default recommendation; safe to follow blindly | non-empty Validation + Safety; owner sign-off |

Expert placeholders: business and protection skills may ship as skeletons with explicit markers.
Visible gaps are fine; invented expertise is not. A skeleton says so in a note under its title, so
a reader knows before relying on it. There are two markers, and they mark different things:

- `TODO(expert): …` — an unvalidated number or playbook: a sending cap, a ramp curve, a response
  window. The shape is right, the value is a guess. Resolved by evidence from real runs, or by an
  expert's judgement on that value.
- `OPEN QUESTION n: …` — a fork in the operation contract that cannot be decided here, `n` keyed to
  the open-questions reference inside the `sdr-operations` skill. Resolved by a decision, which then
  changes an operation fragment — a property, an option, sometimes a verb that exists or stops
  existing.

Keep the two spellings apart. Different people clear them, doing different work: one is answered
with a number, the other with a choice that means nothing until it is written back into the
contract. Merged into one marker, neither clean-up could be scoped.

## Self-containment

- Supporting files live **inside the skill**: `references/` for specifications and background,
  `templates/` for shapes an agent should produce, `examples/` for worked cases.
- Never reference anything outside your pack — not `docs/`, not the root `INDEX.md`, not another
  pack's files. Hosts copy one pack directory; everything else is absent on the user's machine.
- Reference other skills **by name**, never by path — their location differs per host.

## Rules of change

- **Review over overwrite**: corrections bump `version` + Changelog; rewrites need an ADR.
- Additive first; deprecate before removal (`status: deprecated`, successor in `supersedes`).
- If knowledge repeats across skills, extract a shared skill instead of copying.
- Changing any of an operation's five properties in `sdr-operations` — **reach**,
  **reversibility**, **approval**, **`before_repeating`** or **cost** — is a **breaking change**.
  Every guardrail, playbook and adapter downstream reads them, and approval is *derived* from reach
  × reversibility rather than authored, so an edit to either of the first two silently moves the
  gate. Those values live in the operation fragments under the skill's `operations/` directory and
  are changed **there, never in prose**: every normative table in a skill is generated from them,
  and a table in a skill that disagrees with a fragment is a bug in the skill — fixed by
  regenerating, not by editing the table.
