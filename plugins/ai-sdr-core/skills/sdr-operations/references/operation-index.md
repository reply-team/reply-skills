<!-- Generated. Do not edit by hand. -->

# Operation index

Generated from the contract fragments in `operations/`. Edit a fragment, not this file.

Every operation in the contract, by family, with the first sentence of its intent. † marks a core operation — the 30 an agent keeps in front of it at all times. The full classification of each one is in its family catalog.

**Coverage.** 1 of 21 families, 7 of 325 operations, 4 of 30 core.

## 08 — Enrollment

*The programme* · [catalog-08-enrollment.md](catalog-08-enrollment.md)

- `campaign.enroll` † — "Put these fifty people into the Q3 campaign" — with an explicit collision policy, an explicit start position and an explicit first-touch timing: the authored delay, the next open window, or immediately.
- `enrollment.list` † — "Who is in this campaign?" and "where is this person across everything?" — the same read from either end, and with historical participations included on request.
- `enrollment.get` — "Where is this person in this campaign?" — state, position, why it is not progressing, exit reason, business outcome, the sending identity behind it, and when the next touch is due.
- `enrollment.pause` † — "Hold this person here" — with a reason and an optional dated automatic resume.
- `enrollment.resume` — "Let them carry on" — refuses unless the participation is actually held.
- `enrollment.stop` † — "Take them out, and record why" — the reason is mandatory and must be able to name a different person as the cause.
- `disposition.set` — "What came of this participation?" — the business outcome, from the account's declared vocabulary, distinct from any reply's intent and from the execution state.
