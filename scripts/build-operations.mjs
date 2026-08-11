// Generates the reader-facing markdown of the L1 SDR business operations contract from the
// machine-readable fragments under the skill's operations/ directory:
//
//   references/operation-index.md     — every operation, by family, one line each
//   references/catalog-NN-<slug>.md   — one full classification table per family
//   SKILL.md                          — the core-operations table, between its markers
//
// and, from a provider adapter's fulfilment register, that adapter's own view of the same
// operations:
//
//   references/mapping-NN-<slug>.md   — one operation-to-surface table per family, named to
//                                       mirror the catalog file it faces, so a reader moves
//                                       between contract and adapter without a lookup
//   references/fulfilment.md          — the roll-up of everything the adapter does not reach,
//                                       or does not reach fully
//
// The fragments are the source of truth, so a classification cannot drift between what the
// contract says and what an agent reads. This generator is therefore also the contract's
// checker: it refuses to emit when an operation contradicts the derivation table, when an
// `act` carries no idempotency key, when a metered operation names no meter, or when an
// invariant enforces an operation that does not exist. A wrong table is worse than a
// missing one — every guardrail downstream is read straight off these columns.
//
// The adapter side is checked against the same source of truth and on the same principle. An
// entry claiming an operation the contract does not declare, a `partial` that never says what
// is missing, an `absent` with no evidence, a `composed` with no order, or a surface written
// as a request path are all refused. So is silence: an operation with no entry at all is
// reported, because a mapping that simply omits two hundred operations reads complete.
//
// It runs throughout the migration, not only at the end of it: while families are still
// being drafted it reports coverage and emits what exists, and the whole-contract totals
// stay quiet until all 21 fragments are on disk.
//
// Usage: npm run build-operations   (or --check to verify freshness in CI)

import fs from 'node:fs';
import path from 'node:path';
import { ROOT, skill_dirs } from './lib.mjs';

const SKILL = 'sdr-operations';

// The provider adapters whose fulfilment registers are rendered alongside the contract. One
// today; a second would be one more entry here and nothing else, because every rule below is
// stated against the contract rather than against any product.
const ADAPTER_SKILLS = ['reply-operations-mapping'];
const FULFILMENT_FILE = 'fulfilment.yaml';

const FULFILMENT_VALUES = ['direct', 'composed', 'partial', 'absent'];

// The field each claim has to arrive with, and why the claim is worthless without it. `direct`
// is the only one that stands on its own: the other three each assert something a reader cannot
// check from the value alone, and an agent that cannot check it will act as though the operation
// were fully performed.
const REQUIRED_WITH = {
    composed: ['order', '"several calls do it" is not something an agent can execute, so state the call order that realises the operation'],
    partial: ['missing', 'a partial claim is only safe once the unkept part is named, because the user has to hear which part before committing to a route that depends on it'],
    absent: ['because', 'an absence is only trustworthy with its evidence, and "not documented", "documented as coming" and "not evidenced" are different facts that a reader plans differently on'],
};

// Not read from families.yaml: the register counts operations per family, but the size of
// the core set is a statement about what an agent can hold in front of it, made in prose.
// It is asserted here so that adding a 31st `core: true` has to be a decision.
const CORE_TOTAL = 30;

// The open questions the contract is drafted against. A `questions` entry outside the range
// is a typo, and a typo here quietly detaches an operation from the debate that owns it.
const QUESTION_COUNT = 21;

const OPERATION_NAME = /^[a-z][a-z0-9_]*\.[a-z][a-z0-9]*$/;
const FRAGMENT_FILE = /^(\d{2})-([a-z0-9-]+)\.yaml$/;

const BEGIN_MARKER = '<!-- BEGIN GENERATED core-operations -->';
const END_MARKER = '<!-- END GENERATED core-operations -->';

// A property is either a scalar or a conditional block. Every gate below runs against the
// block's `value`, which the schema fixes as the more dangerous side, so a conditional can
// describe a softer case without ever softening the gate.
const CONDITIONAL_KEYS = ['reach', 'reversibility', 'approval', 'cost', 'idempotency_key', 'per_item_results'];

// Absence is not a default: a missing property reads as the most dangerous value it could
// have held. Forgetting `cost` therefore fails the build on the missing basis and meter,
// which is the point — nothing is left blank because it seemed obvious.
const DANGEROUS = { reach: 'act', reversibility: 'irreversible', approval: 'confirm_each', cost: 'metered' };

// approval follows from reversibility x reach. Each cell is a SET rather than one value,
// because the table's own footnotes widen two of them: control/compensatable admits
// confirm_once where the call carries a collection or may overwrite state someone else
// owns, and act/irreversible admits confirm_once where one call is one decision over a set.
const DERIVATION = {
    read: { reversible: ['auto'], compensatable: ['auto'], irreversible: ['auto'] },
    control: { reversible: ['auto'], compensatable: ['auto', 'confirm_once'], irreversible: ['confirm_once'] },
    act: { reversible: ['confirm_once'], compensatable: ['confirm_once'], irreversible: ['confirm_once', 'confirm_each'] },
};

const check = process.argv.includes('--check');

const errors = [];
const err = (subject, msg) => errors.push(`  ${subject}: ${msg}`);
const notices = [];

// ------------------------------------------------------------ constrained YAML
//
// Node 20 ships no YAML parser and this repo carries no dependencies, so the fragments are
// written in a constrained subset — the same move the skill frontmatter already makes
// (docs/skill-contract.md, parse_skill_md in lib.mjs), one level richer because the
// fragments carry block sequences of maps.
//
// Supported: block maps, block sequences of maps, `key: >` folded scalars, inline [a, b]
// arrays, single-quoted scalars, comments. Anchors, aliases, flow maps, multiple documents
// and sequences of plain scalars are absent by design. Meeting one means a fragment left
// the subset, and guessing at its meaning would silently mis-classify an operation — so the
// parser throws with the file and the line instead.

const KEY_LINE = /^([A-Za-z0-9_-]+):(.*)$/;
const NUMERIC = /^-?\d+(\.\d+)?$/;

const indent_of = (line) => line.length - line.trimStart().length;

// Drop a trailing " # comment" while outside [...] brackets. Same rule as the frontmatter
// parser; quoted scalars never reach it, they are consumed by read_quoted.
const strip_comment = (line) => {
    let depth = 0;
    for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '[') depth++;
        else if (c === ']') depth--;
        else if (c === '#' && depth === 0 && i > 0 && line[i - 1] === ' ') return line.slice(0, i).trimEnd();
    }
    return line;
};

const atom = (raw) => {
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    return NUMERIC.test(raw) ? Number(raw) : raw;
};

const parse_yaml = (file) => {
    const rel = path.relative(ROOT, file).replace(/\\/g, '/');
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
    const fail = (i, msg) => { throw new Error(`${rel}:${i + 1}: ${msg}`); };

    // Blank and comment-only lines are invisible to the structure. Folded blocks are
    // consumed raw and never go through here — their prose may open with a `#` or a `-`.
    const skippable = (i) => i < lines.length && (!lines[i].trim() || lines[i].trimStart().startsWith('#'));
    const next_line = (i) => { while (skippable(i)) i++; return i; };

    // A single-quoted scalar, used where a value would otherwise open with a character YAML
    // treats specially. '' is a literal quote.
    const read_quoted = (raw, i) => {
        let out = '';
        for (let k = 1; k < raw.length; k++) {
            if (raw[k] !== "'") { out += raw[k]; continue; }
            if (raw[k + 1] === "'") { out += "'"; k++; continue; }
            const tail = raw.slice(k + 1).trim();
            if (tail && !tail.startsWith('#')) fail(i, `trailing content after a quoted scalar: '${tail}'`);
            return out;
        }
        return fail(i, 'unterminated single-quoted scalar');
    };

    const read_scalar = (raw, i) => {
        if (/^[&*]/.test(raw)) fail(i, 'anchors and aliases are outside the subset this parser accepts');
        if (raw.startsWith('{')) fail(i, 'flow maps are outside the subset this parser accepts');
        if (/^[|>]/.test(raw)) fail(i, `'${raw}' — the only block scalar in the subset is folded '>'`);
        if (raw.startsWith('"')) fail(i, 'double-quoted scalars are outside the subset — single-quote it instead');
        if (raw.startsWith("'")) return read_quoted(raw, i);
        const v = strip_comment(raw).trim();
        if (v.startsWith('[') && v.endsWith(']')) {
            const inner = v.slice(1, -1).trim();
            return inner === '' ? [] : inner.split(',').map(s => atom(s.trim()));
        }
        return atom(v);
    };

    // `key: >` — every deeper-indented line, folded onto one with single spaces.
    const read_folded = (start, indent) => {
        const parts = [];
        let i = start + 1;
        while (i < lines.length && (!lines[i].trim() || indent_of(lines[i]) > indent)) {
            if (lines[i].trim()) parts.push(lines[i].trim());
            i++;
        }
        if (!parts.length) fail(start, 'folded block is empty');
        return [parts.join(' '), next_line(i)];
    };

    // Both readers return the index of the next significant line after their own content.
    const read_map = (start, indent) => {
        const out = {};
        let i = next_line(start);
        while (i < lines.length) {
            const line = lines[i];
            if (line.includes('\t')) fail(i, 'tab in the indentation — YAML indents with spaces');
            const ind = indent_of(line);
            if (ind < indent) break;
            if (ind > indent) fail(i, `unexpected indent (the block's keys sit at ${indent} spaces)`);
            const trimmed = line.trim();
            if (trimmed === '---' || trimmed === '...') fail(i, 'multiple documents are outside the subset this parser accepts');
            if (trimmed.startsWith('- ')) break;
            const kv = trimmed.match(KEY_LINE);
            if (!kv) fail(i, `cannot parse '${trimmed}'`);
            const key = kv[1];
            const rest = kv[2].trim();
            if (key in out) fail(i, `duplicate key '${key}'`);
            if (rest === '>') {
                [out[key], i] = read_folded(i, ind);
            } else if (rest === '') {
                const j = next_line(i + 1);
                const nested = j < lines.length ? indent_of(lines[j]) : -1;
                const is_seq = j < lines.length && lines[j].trim().startsWith('- ') && nested >= ind;
                if (!is_seq && nested <= ind) fail(i, `key '${key}' has no value`);
                [out[key], i] = is_seq ? read_seq(j, nested) : read_map(j, nested);
            } else {
                out[key] = read_scalar(rest, i);
                i = next_line(i + 1);
            }
        }
        return [out, i];
    };

    const read_seq = (start, indent) => {
        const out = [];
        let i = next_line(start);
        while (i < lines.length) {
            if (lines[i].includes('\t')) fail(i, 'tab in the indentation — YAML indents with spaces');
            const ind = indent_of(lines[i]);
            if (ind < indent) break;
            if (ind > indent) fail(i, `unexpected indent in a sequence (its entries sit at ${indent} spaces)`);
            const trimmed = lines[i].trim();
            if (!trimmed.startsWith('- ')) break;
            const rest = trimmed.slice(2);
            if (!KEY_LINE.test(rest)) fail(i, 'a sequence of plain scalars is outside the subset — every entry must be a map');
            // Rewrite the dash away so the entry reads as an ordinary map at the key column.
            lines[i] = ' '.repeat(indent + 2) + rest;
            const [entry, next] = read_map(i, indent + 2);
            out.push(entry);
            i = next;
        }
        if (!out.length) fail(start, 'sequence is empty');
        return [out, i];
    };

    const start = next_line(0);
    if (start >= lines.length) fail(0, 'file holds no data');
    if (indent_of(lines[start]) !== 0) fail(start, 'the document must start at column 0');
    const [doc, end] = read_map(start, 0);
    if (end < lines.length) fail(end, `unparsed trailing content '${lines[end].trim()}'`);
    return doc;
};

// ------------------------------------------------------------------- the tree

const skill = skill_dirs().find(d => d.name === SKILL);
if (!skill) {
    console.error(`No '${SKILL}' skill found under plugins/*/skills/ — nothing to generate.`);
    process.exit(1);
}

const OPERATIONS_DIR = path.join(skill.dir, 'operations');
const REFERENCES_DIR = path.join(skill.dir, 'references');
const SKILL_FILE = path.join(skill.dir, 'SKILL.md');
const INVARIANTS_FILE = path.join(REFERENCES_DIR, 'invariants.md');

let register;
try { register = parse_yaml(path.join(OPERATIONS_DIR, 'families.yaml')); }
catch (e) { console.error(`The family register does not parse:\n  ${e.message}`); process.exit(1); }

const FAMILIES = register.families ?? [];
const METERS = new Set((register.meters ?? []).map(m => m.id));
const family_of = new Map(FAMILIES.map(f => [f.id, f]));
const TOTAL_OPERATIONS = FAMILIES.reduce((n, f) => n + f.operations, 0);

// -------------------------------------------------------------- the fragments

const seen = new Map(); // operation name -> the fragment that defined it
const fragments = [];

for (const entry of fs.readdirSync(OPERATIONS_DIR).sort()) {
    if (entry === 'families.yaml') continue;
    const m = entry.match(FRAGMENT_FILE);
    if (!m) { err(entry, 'unexpected file in operations/ — a fragment is named NN-<slug>.yaml'); continue; }

    const id = Number(m[1]);
    const fam = family_of.get(id);
    if (!fam) { err(entry, `family ${id} is not in the register in families.yaml`); continue; }
    if (fam.slug !== m[2]) { err(entry, `filename slug '${m[2]}' is not the registered slug '${fam.slug}'`); continue; }

    let doc;
    try { doc = parse_yaml(path.join(OPERATIONS_DIR, entry)); }
    catch (e) { err(entry, e.message); continue; }

    if (doc.family !== id) err(entry, `the family header says ${doc.family}, the filename says ${m[1]}`);
    if (!Array.isArray(doc.operations)) { err(entry, 'holds no operations list'); continue; }
    if (doc.operations.length !== fam.operations) {
        err(entry, `holds ${doc.operations.length} operations, but families.yaml registers ${fam.operations} for this family`);
    }

    for (const op of doc.operations) {
        const name = typeof op.name === 'string' ? op.name : '<unnamed>';
        if (typeof op.name !== 'string') err(`${entry} ${name}`, 'operation has no name');
        else if (!OPERATION_NAME.test(name)) err(`${entry} ${name}`, 'name is not entity.verb — singular snake_case entity, single-word verb');
        if (seen.has(name)) err(`${entry} ${name}`, `name is already defined in ${seen.get(name)} — names are globally unique`);
        else seen.set(name, entry);
    }

    fragments.push({ file: entry, id, slug: fam.slug, operations: doc.operations });
}

fragments.sort((a, b) => a.id - b.id);

// A name the register says the contract does not define, defined anyway. The contract states some
// absences in words — "there is no `consent.check`" — and if the operation later arrives, the
// sentence denying it must not quietly survive alongside it.
for (const absent of register.declared_absent ?? []) {
    if (absent?.name && seen.has(absent.name)) {
        err(seen.get(absent.name), `'${absent.name}' is defined here, but families.yaml declares it absent — `
            + 'one of the two is now wrong, and the prose that names it as absent is the one nobody will re-read');
    }
}

// ------------------------------------------------------ property resolution

const is_block = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const resolve = (op, key) => (op[key] === undefined ? DANGEROUS[key] : (is_block(op[key]) ? op[key].value : op[key]));
const detail_of = (op, key) => (is_block(op[key]) ? op[key].detail : null);

// --------------------------------------------------------------- the gates

const or_list = (values) => values.map(v => `\`${v}\``).join(' or ');

for (const frag of fragments) {
    for (const op of frag.operations) {
        const where = `${frag.file} ${op.name ?? '<unnamed>'}`;

        for (const [key, value] of Object.entries(op)) {
            if (!is_block(value)) continue;
            if (!CONDITIONAL_KEYS.includes(key)) {
                err(where, `'${key}' carries a nested block, but only ${CONDITIONAL_KEYS.join(', ')} may be conditional`);
                continue;
            }
            if (value.value === undefined) err(where, `conditional '${key}' has no value — the value is what every gate reasons with`);
            if (!value.detail) err(where, `conditional '${key}' has no detail — the detail is what the agent reads`);
        }

        const reach = resolve(op, 'reach');
        const reversibility = resolve(op, 'reversibility');
        const approval = resolve(op, 'approval');
        const cost = resolve(op, 'cost');
        const key = resolve(op, 'idempotency_key');
        const per_item = resolve(op, 'per_item_results');

        // Approval against the derivation table, with the protective floor as the one
        // legitimate way to sit below it. A fragment cannot yet declare "this one is
        // protective", so a declared `auto` the table would make stricter has to carry
        // approval_departs and say in writing why not acting is the greater harm.
        // A property a conditional left without a value is already reported above; running
        // the gates on it again would only echo the same line in less useful words.
        const derived = DERIVATION[reach]?.[reversibility];
        if (!derived) {
            if (reach !== undefined && reversibility !== undefined) {
                err(where, `reach '${reach}' x reversibility '${reversibility}' is not a cell in the derivation table`);
            }
        } else if (op.approval_departs === true) {
            if (!op.approval_reason) err(where, 'approval_departs is true but approval_reason is absent — a departure is justified in writing or not at all');
        } else if (approval !== undefined && !derived.includes(approval)) {
            err(where, approval === 'auto'
                ? `approval resolves to \`auto\` where reach '${reach}' x reversibility '${reversibility}' derives ${or_list(derived)}. `
                    + 'If this is the protective floor — not performing it is itself the harm — set approval_departs: true and say so in approval_reason.'
                : `approval resolves to \`${approval}\`, but reach '${reach}' x reversibility '${reversibility}' derives ${or_list(derived)}. `
                    + 'Policy may raise the class, and every raise sets approval_departs: true with an approval_reason.');
        }

        if (reach === 'act' && key !== 'required') {
            err(where, `reach resolves to \`act\` but idempotency_key resolves to \`${key ?? 'absent'}\` — every act takes a key`);
        }
        // The approximation for "accepts a collection but reports one verdict": a key is
        // required (so a collection or a durable write is in play) yet no per-item outcome
        // is promised. Reads are exempt — a metered read takes a key and returns one answer.
        // A key and a per-item report answer different questions, and an earlier version of this
        // check confused them. The contract requires a key on four independent grounds — reach
        // `act`, a write accepting a collection, a write creating a durable object, and any
        // metered call — and only the second has anything to do with collections. Treating "has a
        // key" as "takes a collection" forced roughly twenty single-object operations to promise a
        // per-item report they cannot produce, which is the contract stating something untrue
        // about itself.
        //
        // So the collection question is asked directly. `accepts_collection` defaults to true,
        // because absence must read as the dangerous value: an operation that says nothing is
        // assumed to take a collection and therefore owes a result per item. Declaring
        // `not_applicable` means positively asserting the operation carries one object.
        if (op.accepts_collection !== false && per_item === 'not_applicable' && reach !== 'read') {
            err(where, 'per_item_results is `not_applicable` without `accepts_collection: false` — '
                + 'either the call carries a collection and owes one result per item, or it carries a '
                + 'single object and must say so');
        }
        if (op.accepts_collection === false && per_item === 'required') {
            err(where, '`accepts_collection: false` contradicts per_item_results `required` — a call '
                + 'over one object has no items to report on');
        }

        if (cost === 'metered') {
            if (!op.cost_basis) err(where, 'cost resolves to `metered` but cost_basis is absent — state a basis, never a price');
            if (!op.meter) err(where, 'cost resolves to `metered` but meter is absent');
            else if (!METERS.has(op.meter)) err(where, `meter '${op.meter}' is not in the register in families.yaml`);
        }

        for (const q of Array.isArray(op.questions) ? op.questions : []) {
            if (!Number.isInteger(q) || q < 1 || q > QUESTION_COUNT) err(where, `questions entry '${q}' is outside 1..${QUESTION_COUNT}`);
        }
    }
}

// The whole-contract totals only mean anything once every family is on disk. Asserting them
// mid-migration would make the generator useless exactly when it is most wanted.
const core_operations = fragments.flatMap(f => f.operations.filter(op => op.core === true).map(op => ({ op, family: family_of.get(f.id) })));
const operation_count = fragments.reduce((n, f) => n + f.operations.length, 0);
const complete = fragments.length === FAMILIES.length;

if (complete) {
    if (operation_count !== TOTAL_OPERATIONS) err('contract', `holds ${operation_count} operations, but the register sums to ${TOTAL_OPERATIONS}`);
    if (core_operations.length !== CORE_TOTAL) err('contract', `marks ${core_operations.length} operations core, and the core set is ${CORE_TOTAL}`);
}

// ------------------------------------------------------- invariant binding
//
// A fragment does not list the invariants an operation is bound by. Each rule already names
// the operations that enforce it, so the binding is derived by inverting those lists: one
// statement, no second copy to drift, and a rule naming an operation that does not exist is
// a build failure rather than a ghost reference nobody notices.

const bindings = new Map(); // operation name -> [rule id]

if (fs.existsSync(INVARIANTS_FILE)) {
    let current = null;
    fs.readFileSync(INVARIANTS_FILE, 'utf8').split(/\r?\n/).forEach((line, i) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('*Enforced by:*')) {
            if (!current) { err(`invariants.md:${i + 1}`, 'an "Enforced by" list appears before any rule id'); return; }
            const names = [...trimmed.matchAll(/`([^`]+)`/g)].map(m => m[1]);
            if (!names.length) err(`invariants.md:${i + 1}`, `${current} names no operations in its "Enforced by" list`);
            for (const name of names) {
                const ids = bindings.get(name) ?? [];
                if (!ids.includes(current)) ids.push(current);
                bindings.set(name, ids);
            }
            return;
        }
        const id = trimmed.match(/\*\*([^*]+)\*\*/);
        if (id) current = id[1].trim();
    });
    for (const [name, ids] of bindings) {
        if (!seen.has(name)) err('invariants.md', `\`${name}\` is enforced by ${ids.join(', ')}, but it is not an operation in the contract — a ghost reference`);
    }
} else {
    notices.push('references/invariants.md is absent — the invariant column is emitted empty until it lands.');
}

// ------------------------------------------------------------------ rendering

const HEADER = '<!-- Generated. Do not edit by hand. -->';
const SOURCE_NOTE = 'Generated from the contract fragments in `operations/`. Edit a fragment, not this file.';

const LEGEND = `**Reading the table.** † marks a core operation. The five properties are *reach*
(\`read\` changes nothing · \`control\` changes state we own · \`act\` reaches the outside world),
*reversibility* (\`reversible\` · \`compensatable\` · \`irreversible\`), *approval*
(\`auto\` · \`confirm_once\` · \`confirm_each\`, derived from reversibility × reach), *before repeating*
(the observable state to read before running it again) and *cost* (\`none\` · \`metered\`, with its
basis and the meter it consumes). *Key* and *per-item* are the two standing obligations: an
idempotency key on every act, every collection write, every durable create and every metered
call; and one outcome per item whenever a collection is carried. Where a property is conditional
the cell holds the dangerous reading, with the condition beneath it.`;

const cell = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim();
const code = (s) => `\`${cell(s)}\``;
const stack = (parts) => parts.filter(Boolean).join('<br>');
const pad = (id) => String(id).padStart(2, '0');

// The intent's first sentence. A full stop inside an operation name is not a sentence end,
// so the boundary has to be a stop followed by whitespace or the end of the text.
const first_sentence = (s) => {
    const m = String(s ?? '').match(/^[\s\S]*?[.!?](?=\s|$)/);
    return (m ? m[0] : String(s ?? '')).trim();
};

const property_cell = (op, key) => {
    const value = resolve(op, key);
    if (value === undefined) return '—';
    const detail = detail_of(op, key);
    return stack([
        code(value),
        op[key] === undefined ? '*not declared — read as the dangerous value*' : null,
        detail ? `*conditional:* ${cell(detail)}` : null,
    ]);
};

const row = (op) => {
    const ids = bindings.get(op.name) ?? [];
    const questions = Array.isArray(op.questions) && op.questions.length ? `*questions:* ${op.questions.join(', ')}` : null;
    return '| ' + [
        stack([`${code(op.name)}${op.core === true ? ' †' : ''}`, questions]),
        cell(op.intent),
        property_cell(op, 'reach'),
        property_cell(op, 'reversibility'),
        stack([
            property_cell(op, 'approval'),
            op.approval_artefact ? `*artefact:* ${cell(op.approval_artefact)}` : null,
            op.approval_departs === true ? `*departs:* ${cell(op.approval_reason)}` : null,
        ]),
        cell(op.before_repeating) || '—',
        stack([
            property_cell(op, 'cost'),
            op.cost_basis ? `*basis:* ${cell(op.cost_basis)}` : null,
            op.meter ? `*meter:* ${code(op.meter)}` : null,
        ]),
        property_cell(op, 'idempotency_key'),
        property_cell(op, 'per_item_results'),
        ids.length ? ids.map(id => code(id)).join(', ') : '—',
    ].join(' | ') + ' |';
};

const catalog_md = (frag) => {
    const fam = family_of.get(frag.id);
    let out = `${HEADER}\n\n# Family ${fam.id} — ${fam.title}\n\n`;
    out += `${SOURCE_NOTE}\n\n`;
    out += `*${fam.area}* · ${frag.operations.length} operations · contract ${register.contract_version}\n\n`;
    out += `${LEGEND}\n\n`;
    out += '| Operation | Intent | Reach | Reversibility | Approval | Before repeating | Cost | Key | Per-item | Invariants |\n';
    out += '|---|---|---|---|---|---|---|---|---|---|\n';
    out += frag.operations.map(row).join('\n');
    return out + '\n';
};

const index_md = () => {
    let out = `${HEADER}\n\n# Operation index\n\n${SOURCE_NOTE}\n\n`;
    out += 'Every operation in the contract, by family, with the first sentence of its intent. '
        + `† marks a core operation — the ${CORE_TOTAL} an agent keeps in front of it at all times. `
        + 'The full classification of each one is in its family catalog.\n\n';
    out += `**Coverage.** ${fragments.length} of ${FAMILIES.length} families, ${operation_count} of ${TOTAL_OPERATIONS} operations`
        + `, ${core_operations.length} of ${CORE_TOTAL} core.\n`;
    for (const frag of fragments) {
        const fam = family_of.get(frag.id);
        out += `\n## ${pad(fam.id)} — ${fam.title}\n\n`;
        out += `*${fam.area}* · [catalog-${pad(fam.id)}-${fam.slug}.md](catalog-${pad(fam.id)}-${fam.slug}.md)\n\n`;
        out += frag.operations
            .map(op => `- ${code(op.name)}${op.core === true ? ' †' : ''} — ${cell(first_sentence(op.intent))}`)
            .join('\n') + '\n';
    }
    return out;
};

const core_table = () => {
    let out = `${HEADER}\n\n`;
    out += '| Operation | Family | Reach | Approval | What it is for |\n|---|---|---|---|---|\n';
    out += core_operations
        .map(({ op, family }) => `| ${code(op.name)} | ${cell(family.title)} | ${property_cell(op, 'reach')} `
            + `| ${property_cell(op, 'approval')} | ${cell(first_sentence(op.intent))} |`)
        .join('\n');
    return out + '\n';
};

// ------------------------------------------------------- adapter fulfilment
//
// The contract says what the job is. A fulfilment register says how much of that job one
// product reaches, one entry per operation, and the two are generated side by side without
// ever being merged. An operation this product cannot perform is a gap in the adapter and
// never a defect in the contract; the moment that gap could argue for deleting the operation,
// the vendor-neutral layer has stopped existing.
//
// Silence is the failure this section is built around. An entry that says `absent` has been
// thought about and carries its evidence; an operation with no entry at all has not been
// thought about, and in a generated table the two are indistinguishable unless the generator
// goes looking. Without the missing-entry check an adapter could answer for eleven operations,
// ignore the other three hundred, and still emit a mapping that reads complete.

const operation_of = new Map(); // operation name -> { op, frag }
for (const frag of fragments) {
    for (const op of frag.operations) {
        if (typeof op.name === 'string' && !operation_of.has(op.name)) operation_of.set(op.name, { op, frag });
    }
}

const ADAPTER_SOURCE_NOTE = `Generated from \`${FULFILMENT_FILE}\` in this skill. Edit that file, not this one.`;

const MAPPING_LEGEND = `**Reading the table.** † marks a core operation. *Reach* and *approval* are the
contract's own classification, reproduced here unchanged: knowing which endpoint performs an
operation alters neither what it is nor what it needs approved, and the two columns are present so
a reader can see for themselves that the mapping changed nothing. *Fulfilment* is this adapter's
claim — \`direct\` (one surface performs it), \`composed\` (several calls in the stated order),
\`partial\` (performed, but not to the contract's full promise, with the unkept part named) or
\`absent\` (not performable here today, with the evidence). *Surface* names an endpoint group and a
documentation page, never a path: the path, its parameters and its body come from that page at call
time. An operation shown as *not assessed* has no entry at all — nobody has answered for it yet,
which is a different statement from \`absent\`.`;

const FULFILMENT_OPENING = `This file describes **one product's coverage of the contract**, and nothing else.
Every line in it is a statement about this adapter — never about the operations themselves. The
vendor-neutral layer exists precisely so that a capability this product lacks stays visible as an
unmet need rather than quietly disappearing from the set of things an SDR requires; deleting an
operation from the contract because this API has no endpoint for it would undo the layer entirely.

**Expect this file to be long, and read its length as the design working rather than failing.** No
provider covers the whole of an SDR's job, and a map that admitted only the parts one product happens
to reach would be a flattering map and a useless one. A gap recorded here costs a user one honest
sentence. A gap papered over with an adjacent endpoint costs them a broken run, wrong data, or a
message sent to someone who should never have received it — so when an operation is absent, say so
and name what the documentation says. Never substitute something that returns approximately the right
shape.`;

const adapter_summaries = [];
const adapter_targets = [];

for (const adapter_name of ADAPTER_SKILLS) {
    const adapter_skill = skill_dirs().find(d => d.name === adapter_name);
    if (!adapter_skill) { notices.push(`No '${adapter_name}' skill in the tree — its mapping references are not generated.`); continue; }

    const register_file = path.join(adapter_skill.dir, FULFILMENT_FILE);
    if (!fs.existsSync(register_file)) {
        notices.push(`${adapter_name} carries no ${FULFILMENT_FILE} — its mapping references are not generated.`);
        continue;
    }

    let register_doc;
    try { register_doc = parse_yaml(register_file); }
    catch (e) { err(FULFILMENT_FILE, e.message); continue; }

    if (!Array.isArray(register_doc.operations)) { err(FULFILMENT_FILE, 'holds no operations list'); continue; }

    const adapter_id = register_doc.adapter ?? adapter_name;
    const entry_of = new Map(); // operation name -> its fulfilment entry

    for (const entry of register_doc.operations) {
        const name = typeof entry.name === 'string' ? entry.name : null;
        const where = `${FULFILMENT_FILE} ${name ?? '<unnamed>'}`;

        if (!name) { err(where, 'entry has no name — an entry answers for exactly one operation and must say which'); continue; }
        if (!operation_of.has(name)) {
            err(where, 'names an operation the contract does not declare. The register answers for the contract as it '
                + 'stands, so a name that exists only here maps nothing — no plan can ever ask for it, and the adapter '
                + 'carries a promise nobody can call. The operation index lists every declared name.');
            continue;
        }
        if (entry_of.has(name)) { err(where, 'a second entry for this operation — one operation, one coverage claim'); continue; }
        entry_of.set(name, entry);

        // `absent` is a value, so a missing one cannot be reported as though it were: "fulfilment
        // 'absent' is not a valid value" is the least helpful sentence this file could produce.
        if (!FULFILMENT_VALUES.includes(entry.fulfilment)) {
            err(where, entry.fulfilment === undefined
                ? `states no fulfilment — every entry claims one of ${FULFILMENT_VALUES.join(', ')}`
                : `fulfilment '${entry.fulfilment}' is not one of ${FULFILMENT_VALUES.join(', ')}`);
        } else {
            const [field, why] = REQUIRED_WITH[entry.fulfilment] ?? [];
            if (field && !entry[field]) err(where, `fulfilment is \`${entry.fulfilment}\` but ${field} is absent — ${why}`);
            if (entry.fulfilment !== 'absent' && !entry.surface) {
                err(where, `fulfilment is \`${entry.fulfilment}\` but no surface is named — a coverage claim with nowhere `
                    + 'to point is the one an agent cannot act on and cannot check');
            }
        }

        // A surface is a GROUP and a PAGE, and the difference matters more here than anywhere else
        // in the register. Paths, parameters and bodies come from the documentation at call time;
        // a path written from memory is the single most common way an agent fails against a REST
        // API, and one written here is that mistake made once and then trusted by everything
        // downstream, long after the endpoint has moved.
        if (typeof entry.surface === 'string') {
            const surface = entry.surface.trim();
            if (surface.startsWith('/') || surface.includes('/v3/')) {
                err(where, `surface '${surface}' is written as a request path. It must name the endpoint GROUP and the `
                    + 'title of the documentation page that describes it, so that an agent fetches the current path '
                    + 'rather than replaying one somebody remembered.');
            }
        }
    }

    const unmapped = [...operation_of.keys()].filter(name => !entry_of.has(name));
    const counts = Object.fromEntries(FULFILMENT_VALUES.map(v => [v, 0]));
    for (const entry of entry_of.values()) if (counts[entry.fulfilment] !== undefined) counts[entry.fulfilment]++;

    // Every operation needs an entry. While the register is still being filled in, that check
    // would fire once per operation nobody has reached yet — the same reason the whole-contract
    // totals stay quiet until all 21 fragments are on disk. The difference is that completeness
    // cannot be derived here: "no operation is missing" IS the check, so there is nothing left
    // to infer it from. The register declares it instead, with `complete: true` at the top level,
    // and from that day the progress line below becomes a build failure.
    if (unmapped.length) {
        const shown = unmapped.slice(0, 8);
        const listed = shown.join(', ') + (unmapped.length > shown.length ? `, … (${unmapped.length - shown.length} more)` : '');
        const line = `${unmapped.length} of ${operation_of.size} operations have no entry in ${FULFILMENT_FILE}: ${listed}`;
        if (register_doc.complete === true) {
            err(FULFILMENT_FILE, `${line}. The register declares itself complete, so an operation without an entry is `
                + 'an unanswered question rather than an implicit `absent` — silence is not a coverage claim.');
        } else {
            notices.push(`Adapter ${adapter_id}: ${line}. They render as "not assessed"; `
                + `set \`complete: true\` in the register to make this a failure.`);
        }
    }

    // ---------------------------------------------------------------- adapter rendering

    const fulfilment_cell = (entry) => {
        if (!entry) return '*not assessed*';
        return stack([
            code(entry.fulfilment ?? '—'),
            entry.beta === true ? '*documented Beta or Coming soon*' : null,
        ]);
    };

    const scopes_cell = (entry) => {
        const scopes = entry?.scopes;
        if (Array.isArray(scopes)) return scopes.length ? scopes.map(s => code(s)).join(', ') : '—';
        return scopes ? code(scopes) : '—';
    };

    const mapping_row = (op) => {
        const entry = entry_of.get(op.name);
        return '| ' + [
            `${code(op.name)}${op.core === true ? ' †' : ''}`,
            property_cell(op, 'reach'),
            property_cell(op, 'approval'),
            fulfilment_cell(entry),
            entry?.surface ? cell(entry.surface) : '—',
            scopes_cell(entry),
            stack([
                entry?.order ? `*order:* ${cell(entry.order)}` : null,
                entry?.missing ? `*missing:* ${cell(entry.missing)}` : null,
                entry?.because ? `*because:* ${cell(entry.because)}` : null,
                entry?.notes ? cell(entry.notes) : null,
            ]) || '—',
        ].join(' | ') + ' |';
    };

    const mapping_md = (frag) => {
        const fam = family_of.get(frag.id);
        const covered = frag.operations.filter(op => entry_of.has(op.name)).length;
        let out = `${HEADER}\n\n# Family ${fam.id} — ${fam.title} · mapping\n\n`;
        out += `${ADAPTER_SOURCE_NOTE}\n\n`;
        out += `*${fam.area}* · ${frag.operations.length} operations, ${covered} with an entry · `
            + `contract ${register.contract_version} · adapter ${code(adapter_id)}\n\n`;
        out += `${MAPPING_LEGEND}\n\n`;
        out += '| Operation | Reach | Approval | Fulfilment | Surface | Scopes | Notes |\n';
        out += '|---|---|---|---|---|---|---|\n';
        out += frag.operations.map(mapping_row).join('\n');
        out += `\n\nThe contract's own classification of these operations — the full five properties, the `
            + `check before repeating, the invariants they enforce — is in \`catalog-${pad(fam.id)}-${fam.slug}.md\`, `
            + 'in the `sdr-operations` skill. What this adapter does not reach, and why, is collected in '
            + '[fulfilment.md](fulfilment.md).\n';
        return out;
    };

    const gap_entry = (op) => {
        const entry = entry_of.get(op.name);
        const lines = [`- ${code(op.name)} — **${cell(entry.fulfilment)}**`];
        if (entry.missing) lines.push(`  - *Missing:* ${cell(entry.missing)}`);
        if (entry.because) lines.push(`  - *Because:* ${cell(entry.because)}`);
        if (entry.surface) lines.push(`  - *Surface:* ${cell(entry.surface)}${entry.beta === true ? ' (documented Beta or Coming soon)' : ''}`);
        if (entry.notes) lines.push(`  - *Notes:* ${cell(entry.notes)}`);
        return lines.join('\n');
    };

    const family_link = (fam) => `[mapping-${pad(fam.id)}-${fam.slug}.md](mapping-${pad(fam.id)}-${fam.slug}.md)`;

    const fulfilment_md = () => {
        let out = `${HEADER}\n\n# What this adapter does not reach\n\n${ADAPTER_SOURCE_NOTE}\n\n`;
        out += `${FULFILMENT_OPENING}\n\n`;
        out += `**Coverage.** ${entry_of.size} of ${operation_of.size} operations carry an entry — `
            + `${counts.direct} direct, ${counts.composed} composed, ${counts.partial} partial, ${counts.absent} absent. `
            + `${unmapped.length} have no entry at all: nothing is claimed about them in either direction, and they are `
            + 'named row by row, as *not assessed*, in their family mapping table. The table at the foot of this file '
            + 'is where to look for the shape of that silence.\n';

        let gap_families = 0;
        for (const frag of fragments) {
            const fam = family_of.get(frag.id);
            const gaps = frag.operations.filter(op => ['partial', 'absent'].includes(entry_of.get(op.name)?.fulfilment));
            if (!gaps.length) continue;
            gap_families++;
            out += `\n## ${pad(fam.id)} — ${fam.title}\n\n`;
            out += `*${fam.area}* · ${family_link(fam)}\n\n`;
            out += gaps.map(gap_entry).join('\n') + '\n';
        }
        if (!gap_families) {
            out += '\nNo entry in the register is `partial` or `absent` today. That is a statement about how much of the '
                + 'register has been written, not a claim that this product reaches everything — read the coverage table '
                + 'below before concluding anything from an empty section.\n';
        }

        out += '\n## Coverage by family\n\n';
        out += 'A family whose *not assessed* column is not zero has not been fully answered for yet. Nothing should be '
            + 'read into those operations either way — an unanswered question is not a recorded absence.\n\n';
        out += '| Family | Operations | Direct | Composed | Partial | Absent | Not assessed |\n|---|---|---|---|---|---|---|\n';
        for (const frag of fragments) {
            const fam = family_of.get(frag.id);
            const tally = Object.fromEntries(FULFILMENT_VALUES.map(v => [v, 0]));
            let none = 0;
            for (const op of frag.operations) {
                const entry = entry_of.get(op.name);
                if (!entry) none++;
                else if (tally[entry.fulfilment] !== undefined) tally[entry.fulfilment]++;
            }
            out += `| ${pad(fam.id)} ${cell(fam.title)} · ${family_link(fam)} | ${frag.operations.length} `
                + `| ${tally.direct} | ${tally.composed} | ${tally.partial} | ${tally.absent} | ${none} |\n`;
        }
        return out;
    };

    const adapter_references = path.join(adapter_skill.dir, 'references');
    const emitted_before = adapter_targets.length;
    for (const frag of fragments) {
        adapter_targets.push({
            file: path.join(adapter_references, `mapping-${pad(frag.id)}-${frag.slug}.md`),
            text: mapping_md(frag),
        });
    }
    adapter_targets.push({ file: path.join(adapter_references, 'fulfilment.md'), text: fulfilment_md() });

    adapter_summaries.push(`Adapter ${adapter_id} — ${entry_of.size} of ${operation_of.size} operations mapped: `
        + `${counts.direct} direct, ${counts.composed} composed, ${counts.partial} partial, ${counts.absent} absent; `
        + `${adapter_targets.length - emitted_before} mapping references.`);
}

// --------------------------------------------------------------------- emit

const targets = [{ file: path.join(REFERENCES_DIR, 'operation-index.md'), text: index_md() }];
for (const frag of fragments) {
    targets.push({ file: path.join(REFERENCES_DIR, `catalog-${pad(frag.id)}-${frag.slug}.md`), text: catalog_md(frag) });
}
targets.push(...adapter_targets);

// SKILL.md is edited in place rather than generated: everything outside the markers is
// hand-written L1 prose. parse_skill_md is deliberately not used here — round-tripping the
// frontmatter through it would rewrite parts of the file this script has no business
// touching. The markers arrive with the L1 rewrite, so their absence is a notice, not a
// failure: the catalogs are still worth emitting today.
const skill_text = fs.readFileSync(SKILL_FILE, 'utf8').replace(/\r\n/g, '\n');
const begin = skill_text.indexOf(BEGIN_MARKER);
const end = skill_text.indexOf(END_MARKER);
if (begin === -1 || end === -1) {
    notices.push('SKILL.md carries no core-operations markers — that injection is skipped until the L1 body is rewritten.');
} else if (end < begin) {
    err('SKILL.md', 'the core-operations END marker precedes its BEGIN marker');
} else {
    targets.push({
        file: SKILL_FILE,
        text: `${skill_text.slice(0, begin + BEGIN_MARKER.length)}\n\n${core_table()}\n${skill_text.slice(end)}`,
    });
}

if (errors.length) {
    console.error(`The operations contract and its adapter mappings do not hold (${errors.length}):\n${errors.join('\n')}\nNothing was written.`);
    process.exit(1);
}

const stale = [];
for (const { file, text } of targets) {
    const rel = path.relative(ROOT, file).replace(/\\/g, '/');
    if (check) {
        // Compare with line endings normalised: a CRLF working tree must not read as stale.
        const current = fs.existsSync(file) ? fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n') : '';
        if (current !== text) stale.push(rel);
    } else {
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, text);
    }
}

console.log(`Contract ${register.contract_version} — ${fragments.length} of ${FAMILIES.length} families, `
    + `${operation_count} of ${TOTAL_OPERATIONS} operations, ${core_operations.length} of ${CORE_TOTAL} core.`);
for (const summary of adapter_summaries) console.log(summary);
for (const notice of notices) console.log(notice);

if (check) {
    if (stale.length) {
        console.error(
            `Operation references are stale (${stale.length}):\n${stale.map(f => `  ${f}`).join('\n')}\n` +
            'Run `npm run build-operations` and commit the result.'
        );
        process.exit(1);
    }
    console.log(`Operation references are up to date (${targets.length} files).`);
} else {
    console.log(`Wrote ${targets.length} operation references — ${targets.length - adapter_targets.length} for the contract, `
        + `${adapter_targets.length} for the adapter.`);
}
