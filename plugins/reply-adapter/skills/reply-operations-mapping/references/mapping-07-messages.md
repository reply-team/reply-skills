<!-- Generated. Do not edit by hand. -->

# Family 7 — Messages · mapping

Generated from `fulfilment.yaml` in this skill. Edit that file, not this one.

*The programme* · 5 operations, 5 with an entry · contract 2.0.0 · adapter `reply`

**Reading the table.** † marks a core operation. *Reach* and *approval* are the
contract's own classification, reproduced here unchanged: knowing which endpoint performs an
operation alters neither what it is nor what it needs approved, and the two columns are present so
a reader can see for themselves that the mapping changed nothing. *Fulfilment* is this adapter's
claim — `direct` (one surface performs it), `composed` (several calls in the stated order),
`partial` (performed, but not to the contract's full promise, with the unkept part named) or
`absent` (not performable here today, with the evidence). *Surface* names an endpoint group and a
documentation page, never a path: the path, its parameters and its body come from that page at call
time. An operation shown as *not assessed* has no entry at all — nobody has answered for it yet,
which is a different statement from `absent`.

| Operation | Reach | Approval | Fulfilment | Surface | Scopes | Notes |
|---|---|---|---|---|---|---|
| `message.draft` † | `read` | `auto` | `partial` | email-templates -> Render an email template, Get template variables | `sequences:operate` | *missing:* The render returns a subject and a body and nothing else. The footer, the identification block and the unsubscribe mechanism the contract requires the draft to show are absent from the response, so what is previewed cannot be proved to be the whole of what would leave. Merge values that are missing or wrong are reported, which is the part it does keep.<br>Renders against one contact identifier, optionally in the context of a campaign and a sending identity so their variables resolve too. Two other renders exist and both carry a beta mark — Get sequence preview for a contact under sequence-contacts, and Generate an AI draft reply under inbox — so say beta out loud before planning a route through either. |
| `message.send` † | `act` | `confirm_each` | `partial` | inbox -> Send a reply within a thread | `inbox:operate` | *missing:* Only a reply inside an existing thread. The contract's message.send is one message to one person on one channel, including the first one; opening a new conversation outside a campaign has no surface here.<br>The reply goes out on the thread's own channel. If that channel's account is disconnected the send fails — tell the user to reconnect, and never switch channel silently. |
| `message.schedule` | `act` | `confirm_each` | `absent` | — | — | *because:* The direct send endpoints take no send-at field and no scheduled-send surface is documented anywhere. A manual-email task dated for the 14th is queued work for a person, not a queued send, and offering it as one promises the user something nobody will do while they are away. |
| `scheduled_message.list` | `read` | `auto` | `absent` | — | — | *because:* Nothing can be scheduled, so nothing is listed. There is no pending-send queue in the documentation to read. |
| `scheduled_message.cancel` | `control` | `auto` | `absent` | — | — | *because:* The same absence. What is genuinely pending is the next touch of a live participation, and stopping that is enrollment.pause or enrollment.stop rather than the cancellation of a queued message. |

The contract's own classification of these operations — the full five properties, the check before repeating, the invariants they enforce — is in `catalog-07-messages.md`, in the `sdr-operations` skill. What this adapter does not reach, and why, is collected in [fulfilment.md](fulfilment.md).
