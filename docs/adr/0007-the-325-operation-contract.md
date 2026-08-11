# ADR-0007 — The 325-operation contract, generated from YAML

- **Date:** 2026-08-10 · **Status:** accepted

## Context

The L1 contract shipped with 35 operations in six families — `contact.*`, `sequence.*`,
`enrollment.*`, `conversation.*`, `sender.*`, `metrics.*` — each carrying four properties
(effect, reversibility, approval, idempotency check). That catalog was drafted to demonstrate
that a vendor-neutral operation layer was possible at all, and it did demonstrate it. It also
did two things that now have to be undone.

**It inherited one provider's vocabulary.** The six families sit close to the shape of one
product's surface, and the properties were largely settled by looking at what that product does
rather than at what the job requires. The layer whose entire purpose is to be neutral was
quietly shaped by the adapter beneath it — the inverse coupling ADR-0006 was written to remove,
reappearing one level down as vocabulary instead of as a `depends-on` edge, where the validator
cannot see it and no invariant fires.

**It encoded coverage as scope.** Where the provider had no operation, the contract had no
operation. An SDR organisation does considerably more than 35 distinguishable things, and the
gap is not exotic work — it is consent and suppression handling, meeting and handoff, task
queues, inbound routing, oversight, ownership and workload. A plan that needs one of those
today has nothing to name, and `sdr-operations` tells the agent to declare a gap rather than
invent a name. That is the right behaviour for an occasional hole and the wrong one when the
holes are most of the job.

Two forces make this the moment. The packs are pre-release with no known installs, so a clean
sheet costs no user migration — the same argument ADR-0006 relied on, and it expires the day
someone installs. And the contract is about to become load-bearing: the CLI will expose the
high-frequency operations as direct commands and the L2 playbooks are being rewritten against
it, so a provider-shaped vocabulary frozen now is one we live with.

What is explicitly not in play: the Reply API v3 is in production and is **not** being
redesigned here. This decision concerns the vendor-neutral contract above it. Where the API
cannot do something the contract names, that is a fact recorded in the adapter — see Decision 3
— not a reason to change either the API or the contract.

## Decision

### 1. Adopt the 325-operation, 21-family contract, with five properties per operation

The register lives in `plugins/ai-sdr-core/skills/sdr-operations/operations/families.yaml`; the
21 families sum to exactly 325 operations. Each operation carries five properties, not four:

| Property | Values | What it settles |
|---|---|---|
| `reach` | `read` · `control` · `act` | `read` changes nothing; `control` changes state we own; `act` reaches the outside world. `write` is gone — it conflated a bookkeeping edit with a decision that leaves the building. |
| `reversibility` | `reversible` · `compensatable` · `irreversible` | `compensatable` replaces `partial`: the state can be restored, the consequence cannot. Naming it that way stops "partial" being read as "mostly fine". |
| `approval` | `auto` · `confirm_once` · `confirm_each` | Derived, not authored — see below. |
| `before_repeating` | the observable state to read first | What makes retries and resumed work safe. Renamed from "idempotency check", which invited confusion with the idempotency key. |
| `cost` | `none` · `metered` + a stated basis | New. Money spent is a property of an operation, and an agent that cannot see it cannot plan around it. A basis, never a price — prices are account facts. |

**Approval is derived from reversibility by reach**, through the table in `families.yaml`.
Policy may raise the derived class; nothing may lower it. Every raise sets
`approval_departs: true` and states `approval_reason` at the operation, so a hand-set value is
visibly a departure and is reviewable as one instead of looking like an ordinary field. The one
apparent exception is the protective floor — an operation whose *non-performance* is the harm
derives `auto` whatever its reversibility, because waiting for permission to stop sending is the
destructive choice. That is a floor, not a lowering, and the restart direction of every such
pair is never `auto`.

**Absence is not a default.** A missing property reads as the most dangerous value: reach `act`,
reversibility `irreversible`, approval `confirm_each`, cost `metered`. An operation cannot
become permissive by being incompletely written, which is the failure mode of every optional
safety field ever shipped.

**Naming is `entity.verb`** — two segments, singular snake_case entity, single-word imperative
verb, globally unique. The old catalog allowed three segments (`contact.list.add`), which made
the entity ambiguous: the list is an entity in its own right, and burying it inside another
entity's namespace hid that.

**Two standing obligations**, stated once and applying everywhere. An idempotency key is
required on every operation with reach `act`, on every write accepting a collection, on every
write creating a durable object, and on every metered operation *including metered reads* —
a lost result there costs real money to obtain again. And any operation accepting a collection
returns one outcome per item, with the reason: a partial success reported as a single verdict is
a defect, not a simplification.

### 2. The `operations/` fragments are the source of truth; every normative table is generated

One YAML fragment per family, `NN-<slug>.yaml`. Every normative markdown table — in this skill,
in `approval-boundaries`, in any provider adapter's mapping — is generated from them and
freshness-checked in CI. Prose explains and argues; generated tables govern.

The justification is measured, not anticipated. **The hand-written tables have already drifted,
at 35 operations.** In `sdr-operations` 1.1.0, `SKILL.md` line 72 states the approval levels as
`none · confirm · confirm-exact-text`. Its own `references/operation-catalog.md` line 10 states
them as `none · confirm · exact-text`. One skill, two statements, one of three values different.
`approval-boundaries` 1.0.0 — which is where the levels are actually defined — agrees with the
catalog, so the wrong copy is the contract skill's own headline summary of its own vocabulary,
and it has been wrong for as long as it has existed without anyone noticing.

Four surfaces carry operation names and their properties: the contract's catalog, the contract's
`SKILL.md` summary, `approval-boundaries`, and the adapter's mapping tables. Ten markdown files
name operations today. At 35 operations that produced one silent contradiction; at 325 it is not
a risk to manage, it is a certainty to design out.

`docs/packs.md` already authorises the fix and states the rule this follows: "Duplication is
allowed in generated output and never in edited source." Hand-written property tables are
duplication in edited source, so they stop being edited.

The fragment parser is hand-rolled for the constrained subset the fragments use. Node 20 ships
no YAML parser and this repository has zero dependencies, runtime and dev. That is not a
hardship invented here — `docs/skill-contract.md` already constrains skill frontmatter to "a
constrained YAML subset … so the zero-dependency validator can parse it", and `parse_skill_md`
in `scripts/lib.mjs` is the existing implementation of exactly that idea. The fragments are
constrained the same way, for the same reason.

### 3. The contract describes the job, not any product's coverage of it

An operation belongs in the contract if a competent SDR organisation needs it done. Where a
provider cannot perform it, that is recorded in that provider's adapter as an explicit
non-fulfilment — never by omitting the operation from the contract.

This is the decision that keeps the layer honest, and the one most likely to be argued with,
because it produces a contract our own product does not fully implement and a visible list of
what it does not do. That list is the point: it is a roadmap input and an honest answer to a
user, and both are worth more than a contract flattered into looking complete. The inverse —
deleting an operation because our API lacks it — would redefine the job as whatever we already
ship, which is the failure this ADR exists to correct, restated as a maintenance habit that
would reintroduce it one operation at a time. It is `docs/conventions.md`'s "honest gaps" rule
applied to the contract itself rather than to a single skill's prose.

### 4. An invariant names the operations that enforce it, in one place

`references/invariants.md` states each rule together with the list of operations that enforce
it. The per-operation binding is derived by inverting those lists; the fragments do not carry
it. Neither copy can drift, because there is only one copy. A rule naming an operation the
contract does not define fails the build, rather than sitting as a ghost reference nobody
notices — which is the same failure as Decision 2's drift, caught by the same means.

## Consequences

- **`sdr-operations` and `approval-boundaries` both go to 2.0.0, and both are breaking.**
  `docs/skill-contract.md` already names the trigger: "Changing an operation's effect,
  reversibility or approval level in `sdr-operations` is a breaking change — every guardrail
  downstream reads those." This changes all three, for all 35 existing operations, plus the
  vocabulary they are expressed in. The version bump is not a formality here; it is the whole
  substance of the change.
- **Every L2 playbook is rewritten to name operations that exist.** `audience-building`,
  `campaign-launch`, `campaign-planning`, `inbox-triage`, `performance-analysis`,
  `sending-guardrails` and `linkedin-guardrails` all name operations today. Three-segment names
  do not survive the naming rule and `write` does not survive the reach model, so this is
  content work with judgement in it, not a find-and-replace.
- **The adapter gains a fulfilment vocabulary and will declare a substantial set unfulfilled.**
  `reply-operations-mapping` maps 32 of 35 operations today. Against 325 it must state, per
  operation, whether it is fulfilled, partially fulfilled or not fulfilled — and the honest
  answer will be "not fulfilled" for a large share of the contract. That will be uncomfortable
  at review. It is the intended output of Decision 3, not evidence against it.
- **Maturity stays `draft`.** Operations carry open-question numbers, and a contract with
  unsettled questions cannot honestly claim `reviewed`. Visible gaps over invented certainty.
- **A contributor now edits two files to change one thing** — the YAML for a property, the
  markdown for the reasoning behind it — and must run the generator. That is a real cost, paid
  on every content change, and it should be stated as one rather than presented as free
  tooling. It buys drift being impossible instead of merely discouraged, which the evidence
  above says is worth it.
- **CI gains two checks**, both inside `npm run check`, which is now the single step the
  workflow runs — a named step per script let CI and `package.json` hold different opinions
  about what "checked" means. Generated tables must be current, the same pattern as
  `check-manifests` and `check-index`, both of which already fail the build on stale generated
  output. And every operation name written anywhere in repository prose must resolve to a
  contract entry, which is precisely the check that would have caught the approval-vocabulary
  drift on the day it was introduced instead of months later.
- **What gets easier.** An operation's properties become machine-answerable, so approval
  derivation is checked rather than asserted, and a second provider adapter has a concrete
  target to declare coverage against — the test ADR-0006 named as the real proof of the
  vendor-neutrality claim.

## Alternatives considered

**Extend the 35 incrementally.** Rejected: there is nothing to extend. The property model gains
a fifth property and changes the values of three of the other four, the approval vocabulary is
replaced, and the naming rule invalidates existing names. Every one of the 35 is rewritten under
any version of this change. Calling it an extension would only cost us the version bump and the
ADR that the rewrite actually needs.

**Keep the tables hand-written and rely on review.** Rejected on the measured evidence: review
already failed at 35 operations, in the single most safety-relevant column, in one skill's two
statements of its own vocabulary, and the failure survived a version bump. Nothing about 325
operations across four surfaces makes review more likely to succeed.

**Ship only the ~30-operation core set now and the rest later.** Rejected: under time pressure
the only available selection criterion is what the adapter can already execute, so the core set
would encode one provider's present coverage as the shape of the job — the exact failure
Decision 3 exists to prevent, arrived at by scheduling rather than by intent. The ergonomic goal
behind this option is already met without the semantic cost: `core: true` marks the ~30
operations an agent keeps in front of it at all times, within a contract that stays complete.

## Not decided here

- **The open questions carried in the contract.** Operations reference them by number and they
  are settled in the contract, not in an ADR; several will move operations between families or
  sharpen a property's meaning when they resolve.
- **The Reply adapter's own coverage.** Which operations Reply fulfils, partially fulfils or
  cannot perform is a fact about the product, established in `reply-adapter` and revised as the
  product changes. This ADR fixes only where that fact is recorded.

## Reassess when

A second provider adapter is written against the contract — that is the real test of whether the
21 families describe the job or merely a better-disguised version of one product, and it is the
same test ADR-0006 named for the pack split. Also when the open questions are settled, since
maturity cannot rise past `draft` before then. And if the fragments outgrow the constrained
subset the hand-rolled parser accepts, the first answer is to constrain the fragments again; if
that ever stops being possible, what is up for review is the zero-dependency constraint itself,
which is a larger decision than this one and belongs in its own ADR.
