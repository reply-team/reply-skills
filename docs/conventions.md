# Repository Conventions

> How this repo is organized and governed. The pack architecture is in [packs.md](packs.md);
> the skill contract itself in [skill-contract.md](skill-contract.md).

## What this repository is

The knowledge core of the Reply Agentic Toolkit. Business methodology, operational rules and
orchestration logic live here as **skills** — versioned, reviewable markdown. Infrastructure
(reply-cli, reply-mcp, `reply ui`, `reply daemon`) stays generic and executes what skills
describe. Test for every addition: *does this increase the long-term value of the skills
ecosystem?*

## Layout

```
packs.json                        # host-neutral pack definition — the source of truth
.claude-plugin/marketplace.json   # GENERATED — one entry per pack
plugins/<pack>/                   # an independently installable pack
  .claude-plugin/plugin.json      # GENERATED — identity + native dependencies
  CATALOG.md                      # GENERATED — the pack's own catalog, ships on install
  skills/<skill-name>/SKILL.md    # flat skill dirs within the pack — see ADR-0002
    references/ templates/        # the skill's own supporting files
INDEX.md                          # GENERATED — repo-wide catalog
docs/                             # normative specs + ADRs (repo-facing, NOT installed)
templates/                        # authoring templates for contributors (skill, ADR)
scripts/                          # zero-dependency tooling (Node >= 20)
```

Three packs — `ai-sdr-core`, `reply-adapter`, `agentic-runtime` — with a one-directional
dependency graph. See [packs.md](packs.md) for the layer model and the invariants.

Constraints that follow from hosting realities:

- **Packs are self-contained.** A host installs a pack by copying that directory; a skill must
  not reference anything outside its own pack. Supporting material goes in the skill's own
  `references/` or `templates/`. Cross-skill references go **by skill name**, not by path.
- **`docs/` and this file are not installed.** They are for people working on the repository.
  Knowledge an agent needs at runtime belongs in a skill, not in `docs/`.
- **Flat `skills/` dir** inside each pack (host discovery convention). The layer taxonomy lives
  in `metadata.category`, presented through the generated catalogs.

## Categories

Category mirrors the architectural layer, so a skill's category answers "which layer is this?".

| Category | Layer | Contents |
|---|---|---|
| `operations` | L1 | The vendor-neutral SDR business-operation contract |
| `strategy` | L2 | Outbound methodology: audiences, launch, triage, analysis, planning |
| `protection` | L3 | Guardrails: deliverability, channel limits, approval boundaries |
| `execution` | L4 | Driving a provider: its API, CLI, MCP, auth and errors |
| `runtime` | L5 | Durable work, orchestration, reporting |
| `user-knowledge` | — | Conventions for user-specific memory. Cross-cutting rather than a layer |

## Naming

kebab-case, noun-first. The skill directory name, `name:` frontmatter and catalog entry must
match exactly, and names are unique across all packs — hosts with a flat skills directory put
every pack's skills in one namespace.

Provider-specific skills carry the provider prefix (`reply-cli`, `reply-auth`); vendor-neutral
skills deliberately do not, because a prefix would imply a coupling that must not exist.

## Governance

- **CODEOWNERS**: business & protection changes require expert review; the rest — any maintainer.
- **Review over overwrite**: don't silently rewrite a skill; revise with version bump +
  changelog, deprecate explicitly, record big pivots as ADRs (`docs/adr/`).
- **ADRs** are for expensive-to-reverse decisions. Cheap-to-reverse choices don't need ceremony.
- **Stable vocabulary** (don't introduce synonyms):
  - architecture — Pack, Layer, Skill, Adapter, Runtime;
  - business — **SDR business operation** (never "primitive"), Contact, Audience, Sequence,
    Enrollment, Conversation, Sender, Disposition;
  - work — Goal, Plan, Work Item, Artifact, Report, Evidence, Workspace, Protection.
- **Honest gaps**: if a capability doesn't exist (API not GA, CLI command missing, expert input
  pending), the skill says so instead of improvising. Missing CLI ergonomics feed the reply-cli
  roadmap, not workarounds. `TODO(expert):` marks knowledge awaiting a domain expert.

## Quality bar & curation

A mature skill is understandable, discoverable, testable, reviewable, composable, replaceable and
independently valuable. Continuous curation is part of the job: merge duplicates, refresh stale
guidance, strengthen `relations:`; fragmentation (synonyms, competing recommendations, orphan
skills) is architectural debt. Repository growth without curation is a warning signal.

## Tooling

| Command | What it does |
|---|---|
| `npm run build` | Regenerates host manifests and catalogs from `packs.json` and the skills |
| `npm run validate` | Skill contract + pack architecture: schema, naming, relations, dependency direction, self-containment |
| `npm run smoke` | Simulates installing each pack alone and checks it still works |
| `npm run check` | All of the above in check mode — what CI runs |

Generated files are committed. CI fails when they are stale, so `npm run build` before pushing.
