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
  - business — **SDR business operation** (never "primitive"), Contact, Candidate, Account,
    Buying Group, Audience, Campaign, Step, Template, Enrollment, Conversation, Task, Meeting,
    Handoff, Signal, Sender, Sending Domain, Suppression, Consent, Disposition;
  - work — Goal, Plan, Work Item, Artifact, Report, Evidence, Workspace, Protection.

  The business row is a reading aid, not the register. The **authoritative list is the lexicon
  inside the `sdr-operations` skill**, and `npm run check` now reads it: one label belongs to one
  concept, an alias may not be another entity's name, a retired word may not resolve, and every
  retirement points at a concept that exists. It carries thirteen of the concepts above today; the
  rest are owed, and a concept missing from it is a gap rather than a licence to define the word
  somewhere else — every concept with its preferred label, the aliases
  accepted on input, the definitions, and the senses each word explicitly never carries. A concept
  is added there first; a word that exists only in this file is a second source of truth, and the
  contract cannot have one.

  **Sequence is not discouraged, it is retired.** It became Campaign, and the contract declares
  the retirement, so a sentence written today that uses Sequence is naming something that does not
  exist. Metrics is retired the same way: the old per-scope `metrics.*` reads collapsed into
  Engagement, with the grouping an argument rather than a separate operation for each scope.
  Neither word resolves and neither is accepted on input — the reader is told the word is retired
  instead of the token passing for ordinary prose.
- **Honest gaps**: if a capability doesn't exist (API not GA, CLI command missing, expert input
  pending), the skill says so instead of improvising. Missing CLI ergonomics feed the reply-cli
  roadmap, not workarounds. Two markers record what is unfinished, and they are not
  interchangeable:
  - `TODO(expert):` — an unvalidated number or playbook: a sending cap, a ramp curve, a response
    window. The shape is right, the value is a guess. Resolved by evidence from real runs, or by an
    expert's judgement on that value.
  - an **open question `n`** — a fork in the contract we cannot decide alone. It is stated under a
    `## n.` heading in the open-questions reference inside the `sdr-operations` skill, numbered
    nowhere else, and bound to every operation it leaves unsettled by `questions: [n]` in the
    operation fragment, which the generated catalogs print on the row as *questions: n*. The
    binding is the marker, and it is checked: a question carried by no operation fails the build.
    Resolved by a decision, which is then written into the operation fragment it changes — a
    property, an option, sometimes a verb that exists or stops existing.

  They stay separate because different people clear them, doing different work: one is answered
  with a number from a real run, the other with a choice that has to be written back into the
  contract before it means anything. One spelling for both would make either clean-up impossible to
  scope — you could no longer ask "what is still unvalidated?" without also collecting every
  undecided fork.

## Quality bar & curation

A mature skill is understandable, discoverable, testable, reviewable, composable, replaceable and
independently valuable. Continuous curation is part of the job: merge duplicates, refresh stale
guidance, strengthen `relations:`; fragmentation (synonyms, competing recommendations, orphan
skills) is architectural debt. Repository growth without curation is a warning signal.

## Tooling

| Command | What it does |
|---|---|
| `npm run build` | Regenerates everything generated: both hosts' manifests, the catalogs, and the operation tables |
| `npm run build-operations` | Regenerates the operation tables from the fragments under `sdr-operations/operations/` — the contract's own core and per-family tables, and each adapter's mapping tables. Never edit a generated table |
| `npm run validate` | Skill contract + pack architecture: schema, naming, relations, dependency direction, self-containment, host catalog metadata |
| `npm run validate-operations` | Resolves every operation name written anywhere in repository prose against the contract; an unresolved name is reported with its file, its line and the nearest real name |
| `npm run smoke` | Simulates both install shapes — each pack alone, and every skill flattened into one directory as `npx skills add` does |
| `npm run check` | All of the above in check mode — what CI runs |

Generated files are committed. CI fails when they are stale, so `npm run build` before pushing.

`validate-operations` takes `--only <path>[,<path>...]` to scan one file or directory, and
`--report` for per-file counts without a non-zero exit. History is exempt and only history: `docs/adr/`
and the Changelog section of a skill keep the words that were current when they were written.
