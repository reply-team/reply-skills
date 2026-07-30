# Operation catalog

Reference for the `sdr-operations` skill. Every operation an SDR workflow may perform,
named and classified — with no provider detail. A provider adapter implements these; it
does not redefine them.

**Columns.** *Effect*: `read` changes nothing · `write` changes stored data · `act` reaches
the outside world (a real person can receive something, or sending begins).
*Rev*: can the effect be undone — `yes` · `partial` (state restorable, consequences not) ·
`no`. *Approval*: `none` · `confirm` (user approves the plan) · `exact-text` (user approves
the literal content that will be sent). *Check first*: the observable state to test before
repeating, which is what makes retries and resumed work safe.

---

## `contact.*` — people and audiences

| Operation | Intent | Effect | Rev | Approval | Check first |
|---|---|---|---|---|---|
| `contact.find` | Locate a person by email or identifier, or select a set by criteria | read | — | none | — |
| `contact.create` | Add a person. Email is the identity; name, company, title, phone, location, profile URL and custom fields are optional | write | yes | none · `confirm` in bulk | `contact.find` by email |
| `contact.update` | Change stored fields on an existing person | write | partial | none | read current values — the previous value is lost unless recorded |
| `contact.delete` | Remove a person permanently | write | no | confirm | — |
| `contact.suppress` | Mark a person as never-contact | write | partial | confirm | current suppression state |
| `contact.list.create` | Create a named audience list | write | yes | none | list with that name exists |
| `contact.list.add` | Put people into a list | write | yes | none · `confirm` in bulk | membership |
| `contact.list.remove` | Take people out of a list | write | yes | confirm | membership |
| `contact.deduplicate` | Resolve the same person appearing more than once, under a stated policy | write | partial | confirm | duplicate scan |

**Notes.** `contact.suppress` is reversible mechanically but not in meaning — it usually
records a person's wish not to be contacted. Never reverse it without the user, and never
infer it from silence. The dedupe policy is a business decision, not a default: *skip
existing* never overwrites data and is the safe recommendation; *update existing* is a
deliberate choice the user must make (see `audience-building`).

## `sequence.*` — the outreach series

| Operation | Intent | Effect | Rev | Approval | Check first |
|---|---|---|---|---|---|
| `sequence.state` | Read the definition, status, steps, senders, schedule and counts | read | — | none | — |
| `sequence.create` | Define a new multi-step outreach series | write | yes | none | sequence with that name exists |
| `sequence.update` | Change name or settings | write | yes | none | current settings |
| `sequence.add-step` | Define what is sent at which position and interval | write | yes | none | existing steps |
| `sequence.update-step` | Change the content or timing of a step | write | partial | `confirm` if the sequence is live | current step content |
| `sequence.assign-sender` | Attach the sending account(s) the series will use | write | yes | none | assigned senders |
| `sequence.assign-schedule` | Attach the sending window | write | yes | none | assigned schedule |
| `sequence.activate` | Begin sending | **act** | partial | **exact-text** | status; the content of the first step |
| `sequence.pause` | Stop sending | act | yes | none when protective, else confirm | status |
| `sequence.archive` | Retire the series | write | no | confirm | status |

**Notes.** `sequence.activate` is the single most consequential operation in the catalog:
messages already delivered cannot be recalled, which is why its reversibility is `partial`
and its approval is `exact-text` — the user sees the literal first message before it goes
out. `sequence.pause` is protective and deliberately cheap: pausing a sequence that is
misfiring is always the right first move.

## `enrollment.*` — a contact's participation in a sequence

| Operation | Intent | Effect | Rev | Approval | Check first |
|---|---|---|---|---|---|
| `enrollment.state` | Where a contact stands: step, status, next scheduled send | read | — | none | — |
| `enrollment.create` | Enrol one or more contacts into a sequence | **act** if the sequence is live, else write | partial | confirm — show the plan and the count | `enrollment.state` |
| `enrollment.pause` | Hold one contact without affecting others | act | yes | none when protective | `enrollment.state` |
| `enrollment.resume` | Continue a held contact | act | yes | confirm | `enrollment.state` |
| `enrollment.remove` | Withdraw a contact from the sequence | write | partial | confirm | `enrollment.state` |

**Notes.** `enrollment.create` into a *live* sequence causes sending — that is why its
effect is conditional and why the condition must be checked, not assumed. Partial results
are normal and are not failures: already-enrolled, not-found and limit-reached outcomes
must each be reported per contact rather than summarised as success.

## `conversation.*` — inbound replies

| Operation | Intent | Effect | Rev | Approval | Check first |
|---|---|---|---|---|---|
| `conversation.list` | Inbound threads, selectable by state, disposition or recency | read | — | none | — |
| `conversation.read` | A full thread: messages, participants, channel | read | — | none | — |
| `conversation.reply` | Send a response inside the thread, on the thread's own channel | **act** | **no** | **exact-text** | the last message in the thread |
| `conversation.classify` | Record the outcome: interested · not interested · not now · do-not-contact | write | yes | confirm when ambiguous; always for do-not-contact | current disposition |

**Notes.** A reply goes out on the channel the thread is already on — switching channel is
a different operation and a different conversation, never a silent fallback.
`conversation.reply` is the only operation in the catalog that is both `act` and strictly
irreversible: there is no unsend. Classifying as *do-not-contact* implies
`contact.suppress`-like consequences and is confirmed every time.

## `sender.*` — sending capability

| Operation | Intent | Effect | Rev | Approval | Check first |
|---|---|---|---|---|---|
| `sender.list` | The sending accounts available and their connection state | read | — | none | — |
| `sender.health` | Per-account health: connection, warm-up maturity, volume against limits, bounce signals | read | — | none | — |
| `sender.limits.read` | The configured sending caps | read | — | none | — |
| `sender.limits.update` | Change the caps | act | yes | confirm when raising; none when lowering as a protective action | `sender.limits.read` |

**Notes.** No sending capability means no launch — this is a hard stop, never something to
work around. Raising a limit is a deliberate risk decision and belongs to the user;
lowering one to protect a domain or account does not need to wait for them.

## `metrics.*` — reading performance

| Operation | Intent | Effect | Rev | Approval | Check first |
|---|---|---|---|---|---|
| `metrics.account-overview` | Aggregate delivery, open, reply and interest for a time window | read | — | none | — |
| `metrics.sequence` | The same figures per sequence, for comparison | read | — | none | — |
| `metrics.channel-efficiency` | Relative performance across channels | read | — | none | — |

**Notes.** All three are reads, but they are not free: measurement surfaces are commonly
rate-limited more tightly than the rest of a provider's interface. Call them sequentially,
cache within a session, and never poll. Every figure carries the window it was measured
over — a number without a window is not evidence.

---

## Known gaps

Deliberately absent from v1. Named here so that a plan can reference the gap instead of
inventing an operation:

- **Prospect discovery and enrichment** — finding *new* people, rather than importing
  people the user already has. Availability varies sharply between providers.
- **Meeting booking** — calendar handling and the hand-off from interested reply to booked
  call.
- **Task management** — manual to-dos assigned to a human in a workflow.
- **Variant experiments** — defining and reading A/B tests on step content.
- **One-off direct messages** outside any sequence.

Adding an operation means extending this catalog first — including the four properties —
and only then implementing it in an adapter. An operation that exists in an adapter but
not here is a contract violation, not a feature.
