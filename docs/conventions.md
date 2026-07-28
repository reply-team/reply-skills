# Repository Conventions

> How this repo is organized and governed. The skill contract itself lives in
> [skill-contract.md](skill-contract.md); the workspace model in [workspace.md](workspace.md).

## What this repository is

The knowledge core of the Reply Agentic Toolkit. Business methodology, operational rules and
orchestration logic live here as **skills** — versioned, reviewable markdown. Infrastructure
(reply-cli, reply-mcp, `reply ui`, `reply daemon`) stays generic and executes what skills describe.
Test for every addition: *does this increase the long-term value of the skills ecosystem?*

## Layout

```
.claude-plugin/marketplace.json   # this repo is a Claude Code plugin marketplace
plugins/reply/                    # the "reply" plugin (skills are namespaced /reply:<skill>)
  .claude-plugin/plugin.json
  skills/<skill-name>/SKILL.md    # flat skill dirs — see ADR-0002
INDEX.md                          # GENERATED catalog — never edit by hand (npm run build-index)
docs/                             # normative specs + ADRs
templates/                        # Skill / Plan / Report / Work Item / ADR templates
scripts/                          # zero-dependency validator + index builder (Node >= 20)
```

Constraints that follow from hosting realities:

- **Skills are self-contained.** Claude Code copies the plugin directory into a cache; a skill must
  not reference files outside `plugins/reply/` (keep supporting material in the skill's own
  `references/`). Cross-skill references go **by skill name**, not by path.
- **Flat `skills/` dir** (host discovery convention). The domain taxonomy lives in
  `metadata.category` and is presented via the generated `INDEX.md`.

## Categories

| Category | Contents |
|---|---|
| `technical` | Reply API, CLI, MCP, auth & keys — how agents drive the platform |
| `business` | Outbound methodology: importing, launching, replying, analyzing, ICP, messaging |
| `planning` | Turning goals into long-running executable plans; reporting conventions |
| `protection` | Deliverability, sending limits, LinkedIn safety, warm-up — operational guardrails |
| `user-knowledge` | Conventions for user-specific memory: preferences, org playbooks |

## Naming

kebab-case, noun-first, no category prefix unless a collision demands it. The skill directory name,
`name:` frontmatter and INDEX entry must match exactly.

## Governance

- **CODEOWNERS**: business & protection changes require expert review; the rest — any maintainer.
- **Review over overwrite**: don't silently rewrite a skill; revise with version bump + changelog,
  deprecate explicitly, record big pivots as ADRs (`docs/adr/`, template in `templates/adr.md`).
- **ADRs** are for expensive-to-reverse decisions. Cheap-to-reverse choices don't need ceremony.
- **Stable vocabulary** (don't introduce synonyms): Goal, Plan, Work Item, Skill, Artifact, Report,
  Evidence, Repository, Workspace, Planner, Tool/Toolset, Protection.
- **Honest gaps**: if a capability doesn't exist (API not GA, CLI command missing), the skill says
  so instead of improvising. Missing CLI ergonomics feed the reply-cli roadmap, not workarounds.

## Quality bar & curation

A mature skill is understandable, discoverable, testable, reviewable, composable, replaceable and
independently valuable. Continuous curation is part of the job: merge duplicates, refresh stale
guidance, strengthen `relations:`; fragmentation (synonyms, competing recommendations, orphan
skills) is architectural debt. Repository growth without curation is a warning signal.

## CI

`npm run validate` — schema, naming, section and maturity-gate checks.
`npm run build-index` — regenerates `INDEX.md`; CI fails if it's stale (`npm run check-index`).
