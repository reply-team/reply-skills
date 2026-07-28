---
name: import-prospects
description: >
  Get prospects from a CSV or pasted data into Reply.io — mapped, deduplicated, organized
  into a list and verified. Use when the user wants to import contacts, add prospects,
  build or extend a contact list, or dedupe incoming data.
metadata:
  version: 1.0.0
  category: business
  maturity: draft
  status: active
  owner: outbound-experts
  tags: [contacts, lists, import, csv]
  tools: [reply-cli]
  api: [contacts, contact-lists, background-jobs]
  relations:
    depends-on: [reply-cli, reply-api]
    recommends: [launch-outreach]
---

# Import prospects

## Purpose

Turn raw prospect data (CSV file or pasted rows) into clean Reply.io contacts: fields mapped,
duplicates handled deliberately, contacts organized into a list — ready for outreach.

## When to use / when NOT to use

- Use for CSV/pasted-data imports, list building, and dedupe questions.
- Do NOT use for finding NEW leads (prospect search / enrichment) — check availability in the
  docs first: much of contact-enrichment is marked Coming soon. Say so honestly if asked.

## Prerequisites

- `reply auth whoami` succeeds; key covers `contacts:read`, `contacts:write`
  (and `contacts:operate` if enrolling into a sequence on import).
- Endpoint contracts (fetch the `.md` doc pages before first use in a session — discovery-first,
  see `reply-api`): contacts → *Import contacts*, *Filter contacts*, *List all contacts*;
  contact-lists → *List/Create contact list*; background-jobs → *Get a background job*.

## Planning guidance

Before touching the API decide with the user: (1) source file and whether a header row exists —
if the user pasted rows, write them to a temp CSV with a header first; (2) field mapping —
inspect the CSV headers yourself and propose the mapping to Reply fields (email is mandatory;
firstName, lastName, company, title, phone, city, country, linkedInUrl, custom fields);
(3) dedupe policy — default recommendation is **skip existing** (never clobbers data), the
alternative is updating existing contacts; (4) destination — an existing list
(`reply api /v3/contact-lists`) or a new one.

## Execution guidance

1. **Inspect the input locally** (zero API calls): row count, headers, obvious junk (empty
   emails, malformed rows). Show the user a 2–3 row sample with the proposed mapping.
2. **Resolve the destination list:** `reply api /v3/contact-lists` → reuse, or create per the
   *Create a contact list* doc page.
3. **Show the plan and CONFIRM:** file, row count, mapping, dedupe mode, target list. Wait for
   explicit approval — bulk import is a write.
4. **Import** per the *Import contacts* doc page (`reply api /v3/contacts/... --body @payload.json`
   with the body shape from the docs). A large import may return `202` + a background-job
   location — poll `reply api /v3/background-jobs/<id>` to completion.
5. **Reconcile:** report created/updated/skipped/failed from the result; skipped+skip-existing
   usually means duplicates — expected, not an error.

## Validation

Cross-check membership after import: filter/list contacts by the target list and compare the
count against expectations. Spot-check 2–3 imported contacts by email.

## Reporting

Created / updated / skipped / failed counts; list ID and name; first few failure reasons verbatim.
Never summarize a partial failure as success — state N succeeded, M failed, and why.

## Failure modes

- 400 validation with `errors[]` → a field in the body is wrong; fix per JSON Pointer, retry once.
- Duplicate-heavy result → confirm with the user whether updating existing was actually wanted.
- Background job ends `failed` → fetch the job body for the reason; don't blind-retry bulk writes.

## Safety

- Bulk import runs only after the user confirmed the exact plan (step 3).
- Never import without showing the mapping first; silent field mismatches poison the database.

## Related skills

- `launch-outreach` — the usual next step: enroll these contacts into a sequence.

## Changelog

- 1.0.0 (2026-07-27): ported from prototype workflow (replyio/reply-skill) onto `reply api`
  endpoint-level execution; CLI dry-run flow replaced with plan-confirm + docs-first calls.
