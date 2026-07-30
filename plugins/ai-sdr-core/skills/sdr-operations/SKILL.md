---
name: sdr-operations
description: >
  The vendor-neutral contract of atomic SDR business operations — add a contact, enrol
  it into a sequence, pause, reply, classify a conversation, read engagement — named in
  the language of an SDR practitioner with no provider detail. Use when planning any
  outbound work, when writing a plan someone or something else must execute, or before
  reaching for a provider-specific execution skill.
metadata:
  version: 1.0.0
  pack: ai-sdr-core
  category: operations
  maturity: draft
  status: active
  owner: skills-maintainers
  tags: [contract, operations, vocabulary, vendor-neutral]
  tools: []
  api: []
  relations:
    recommends: [approval-boundaries, campaign-planning]
---

# SDR business operations

## Purpose

Outbound work decomposes into a small, stable set of operations: add a person, put them
into a sequence, pause them, answer a reply, record what came of it, read the numbers.
This skill names those operations and fixes their meaning, so that a plan can be written
— and reviewed — without knowing which product will execute it.

This is the contract the rest of the system is built on. Playbooks compose these
operations; a provider adapter implements them; the Reply CLI will eventually expose the
high-frequency ones as direct commands. All three must mean the same thing by
`enrollment.pause`, which is why the meaning lives here and nowhere else.

## When to use / when NOT to use

- Use when writing or reading a plan, when deciding what a step actually does, and when
  you need to know whether an operation is reversible or needs the user's approval.
- Use when adding a new operation: extend this contract first, then the adapter.
- Do NOT put provider detail here — no endpoint paths, no request bodies, no tool names.
  That belongs in an adapter skill (for Reply.io: `reply-operations-mapping`).
- Do NOT use this as an execution guide. It says *what* an operation means, never *how*
  to perform it against a particular product.

## Prerequisites

None. This skill is pure vocabulary and semantics — it needs no credentials, no tools
and no provider.

## Planning guidance

**Name the operation before choosing the tool.** A plan step that reads
`enrollment.create — 214 contacts into "Q3 SaaS founders", approval required` survives a
change of provider, can be reviewed by a person who has never seen the API, and can be
executed by a different agent tomorrow. A plan step that reads "POST to the bulk endpoint"
survives none of that.

Every operation carries four properties that decide how it may be executed. Get these
right and safety follows almost for free:

| Property | Values | Why it matters |
|---|---|---|
| **Effect** | `read` · `write` · `act` | `read` changes nothing. `write` changes stored data. `act` reaches the outside world — a real person receives something, or sending begins. |
| **Reversible** | yes · partial · no | Determines whether a mistake is recoverable, and therefore how much confirmation is proportionate. |
| **Approval** | none · confirm · confirm-exact-text | See `approval-boundaries`. Anything with effect `act` needs at least `confirm`. |
| **Idempotency check** | the observable state to test first | Before repeating an operation, check whether its outcome already holds. This is what makes retries and resumed work safe. |

Two rules that follow:

1. **`act` is the line that matters.** Creating a draft is `write`; sending it is `act`.
   Adding a contact to a sequence is `write` if the sequence is paused, `act` if it is
   live and will send. When in doubt about which side of the line you are on, treat it
   as `act`.
2. **Protective operations are the exception.** `enrollment.pause`, `campaign.pause` and
   `sender.limits.update` downward are `act`, but they *reduce* harm. Waiting for approval
   before pausing a campaign that is burning a domain is the destructive choice. See
   `approval-boundaries`.

## Execution guidance

The full catalog — every operation with its inputs, outputs, preconditions and the four
properties above — is in [references/operation-catalog.md](references/operation-catalog.md).
It is grouped into six families:

| Family | What it covers |
|---|---|
| `contact.*` | People and the audience lists they belong to |
| `sequence.*` | The multi-step outreach series itself: steps, senders, schedule, state |
| `enrollment.*` | A specific contact's participation in a specific sequence |
| `conversation.*` | Inbound replies: reading threads, answering, recording the outcome |
| `sender.*` | Sending capability and its configured limits |
| `metrics.*` | Reading performance, without changing anything |

Naming is `<entity>.<verb>`, lower-case, dot-separated. Verbs stay ordinary English
(`create`, `update`, `find`, `pause`, `resume`, `remove`, `state`) and mean the same thing
in every family.

**Composing operations.** A real task is a short sequence of these. "Launch outreach to a
new list" is roughly `contact.create` (×N) → `contact.list.add` → `sequence.create` →
`sequence.add-step` → `sequence.assign-sender` → `sequence.assign-schedule` →
`enrollment.create` → `sequence.activate`. The playbook skills in this pack describe when
and why to compose them that way; this skill only guarantees each name means one thing.

**Gaps are stated, not improvised.** If a task needs an operation this contract does not
define, say so and describe the gap in the plan or report. Do not silently invent an
operation name — a name that exists only in one plan is worse than an acknowledged gap,
because the adapter will not implement it and the next agent will not recognise it.

## Validation

An operation is correctly specified when someone can answer, without looking at any
product: what changes, whether a real person is affected, whether it can be undone, what
to check to see whether it already happened, and whether the user must approve it first.

A plan written against this contract is valid when every step names an operation from the
catalog (or an explicit gap), and every step whose effect is `act` carries an approval
gate.

## Reporting

Reports name the operations performed, not the calls made — `enrollment.create ×214
(211 added, 3 already enrolled)` rather than a transcript. This is what makes a report
readable a month later and comparable across providers. Record the identifiers the
operation returned; they are what makes the work resumable.

## Failure modes

- **Operation-shaped prose.** "Update the contacts" is not an operation; `contact.update`
  with a named field set is. Vague steps are where plans quietly go wrong.
- **Provider detail leaking in.** If a step mentions an endpoint, a payload field or a
  tool name, the knowledge is in the wrong layer — move it to the adapter.
- **Assuming an operation exists** because it would be convenient. Check the catalog.
- **Treating `act` as `write`** because nothing visibly broke in testing. The test of
  `act` is whether a real person could receive something, not whether they did.

## Safety

This skill performs nothing, so it is safe to read at any time. Its safety contribution
is the `act` classification and the approval property: they are what the playbooks and
the adapter rely on to know when to stop and ask. Weakening a classification here weakens
every guardrail downstream — treat changes to the `Effect` or `Approval` column of an
existing operation as a breaking change, not an edit.

## Related skills

- `approval-boundaries` — the rules for what requires the user's confirmation, and the
  narrow exception for protective actions.
- `campaign-planning` — turns a goal into a plan expressed in these operations.
- For Reply.io execution: the `reply-adapter` pack maps these operations onto the CLI,
  API v3 and MCP. Installing it is what makes this contract executable.

## Changelog

- 1.0.0 (2026-07-30): initial contract — six operation families, the four properties
  (effect, reversibility, approval, idempotency check), naming rules.
