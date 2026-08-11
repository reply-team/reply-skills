# The User Workspace

> Normative specification for where **runtime instances** live. A skills repository holds
> reusable *knowledge*; the workspace holds *instances*: goals, plans, work items, work logs,
> reports, artifacts. Operating guidance is in the `durable-work` skill alongside this file;
> the reasoning is recorded in the repository's architecture decision records
> ([ADR-0004](https://github.com/reply-team/reply-skills/blob/main/docs/adr/0004-workspace-as-markdown-files.md)
> and [ADR-0005](https://github.com/reply-team/reply-skills/blob/main/docs/adr/0005-orchestrator-hosts-daemon-as-fallback.md)).

A workspace is plain markdown plus YAML frontmatter: git-friendly, readable by the user, and
tool-agnostic. Any agent can read and write one, and any orchestrator can drive it — the file
format *is* the interoperability layer, which is why no runtime owns it.

## Discovery

A workspace is any directory containing `reply-workspace.yaml` at its root. Tools discover it by
walking up from the current working directory (the same pattern as `.git`); the fallback when
nothing is found is a workspace directory in the user's home. Creating a workspace means
creating that one marker file — directories appear as they are needed.

```yaml
# reply-workspace.yaml
version: 1
timezone: Europe/Kiev    # optional
reporting: weekly        # optional: default reporting cadence

# Provider extensions — optional, and only meaningful when the matching adapter is
# installed. Nothing in this pack reads them; an adapter may.
team_id: 1045            # optional: default Reply.io team for this workspace
```

The marker filename carries the `reply-` prefix for historical and brand reasons, not because
this pack depends on Reply. Provider-specific keys are explicitly namespaced as extensions
above: a workspace with none of them is fully valid, and this pack never reads them.

## Structure

```
<workspace>/
├── reply-workspace.yaml
├── goals/<goal-slug>/
│   ├── goal.md                    # objective, constraints, success criteria
│   ├── plan.md                    # CURRENT plan; superseded plans → plans/archive/
│   ├── work-items/WI-001-<slug>.md
│   ├── reports/RPT-2026-07-27-<slug>.md
│   └── artifacts/                 # generated deliverables (drafts, exports, analyses)
├── memory/                        # user knowledge: preferences, ICP, playbooks/
└── logs/                          # append-only run journals (one file per run/session)
```

One goal = one directory; the slug is kebab-case. History is immutable: superseded plans and
reports are archived, never rewritten — new understanding produces a new revision.

The canonical shapes ship with this pack: [the plan template](../templates/plan.md) and
[the work-item template](../templates/work-item.md). The report shape belongs to the
`execution-reporting` skill and ships with it.

## Work items

The smallest durable, resumable unit of work:

```yaml
---
id: WI-003                # unique within the goal
goal: q3-saas-founders    # parent goal slug
status: awaiting-approval # todo | in-progress | blocked | awaiting-approval | done | cancelled
depends-on: [WI-001]
operations: [campaign.enroll]    # the business operations this item performs
outputs: []               # artifact paths / created entity IDs, filled during execution
approval:                 # present only while status = awaiting-approval
  question: "Activate campaign 12345, releasing 214 enrolments?"
history:
  - 2026-07-27T14:02Z started
  - 2026-07-27T14:07Z paused: awaiting user approval
---
```

Rules:

- **Resumable**: enough state in `outputs` and `history` that a fresh session can continue
  without redoing completed steps — record external identifiers as soon as they exist.
- **Idempotent intent**: before re-executing, check whether the outcome already holds. Every
  operation in the SDR operation contract names the check to run.
- **`awaiting-approval`** is the human-review pause: execution stops gracefully until the user
  answers the recorded question. *Which* actions require it is decided by the core pack's
  approval rules, not by this format.
- Failure classes differ: transient → retry; permanent or validation → record in history, mark
  `blocked`, surface to the user. Recovery prefers continuation over restart.
- `operations` names the vendor-neutral operations the item performs, so the item stays readable
  and reviewable without knowing which provider will execute it.

## Reports

Written after meaningful execution: outcomes, deviations, observations, evidence,
recommendations — reusable learning, not activity logs. A report that confirms or refutes a
skill's guidance should be linked from that skill's `relations.validated-by`; that is the
evidence loop which moves guidance from plausible to validated. See the `execution-reporting`
skill.

## Memory

`memory/` holds durable user knowledge agents may consult and extend: preferences (tone,
constraints, sign-offs), ICP definitions, and playbooks. See the `user-memory` skill.

**Never store secrets** — API keys and tokens — anywhere in a workspace. Credentials belong to
a credential store or the host's secret management. Assume the workspace is a git repository
that may be shared.
