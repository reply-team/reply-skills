# Knowledge-System Roadmap

> Capability milestones for this repository — not calendar deadlines. Progress = better capability
> and knowledge quality, not document count.

## M1 — Foundational structure  *(current)*

Conventions, skill contract, templates, workspace model, validator + generated catalogs;
bootstrap catalog. Now also the **pack architecture** (ADR-0006): five layers distributed as
three installable packs, with the dependency direction enforced by CI — vendor-neutral SDR
knowledge separated from provider execution and from the durable-work runtime, so each can be
replaced without rewriting the others.
**Done when:** contributors know where new knowledge belongs; planners reliably discover skills;
a second provider adapter could be written without touching the core.

## M2 — Planning excellence

Mature planning methodologies: reusable decomposition patterns, standard reporting expectations,
plan quality that transfers across unrelated campaigns.
**Done when:** plans are increasingly assembled from existing skills rather than invented.

## M3 — Evidence-driven knowledge

Reports systematically linked to skills (`validated-by`); recommendations confirmed or refuted by
real execution; stale guidance detected (repeated overrides, declining success, contradictions).
**Done when:** the maturity field reflects evidence, not opinion.

## M4 — Semantic repository

Rich `relations:` graph across skills, plans, reports and artifacts; dependency traversal; smarter
discovery than keyword matching; planner assistance built on the graph.
**Done when:** the repo behaves as an interconnected knowledge system, not a folder of documents.

## M5 — Self-improving ecosystem

Knowledge capture is automatic: every execution leaves reports that measurably improve the next
one; repository health (duplication, orphans, freshness) is monitored, and curation is routine.
**Done when:** each execution measurably improves future execution with minimal manual effort.

---

Priorities when trade-offs arise: reusable knowledge > explainability > deduplication > evidence >
implementation scope. See the epic (REPLY-51231) for the engineering backlog that runs alongside.
