// Resolves every operation name written in repository prose against the operation contract.
//
// validate.mjs checks frontmatter, relations, pack boundaries and link targets. Nothing until
// now read an `entity.verb` token out of a sentence and asked whether that operation exists —
// which is how the 1.x catalog carried a reference to a `campaign.pause` it never defined while
// CI stayed green throughout. A rename that moves 24 of 35 names turns that gap into the
// difference between a repository that is migrated and one that merely looks migrated, so the
// resolution runs in the build.
//
// Usage:
//   node scripts/validate-operations.mjs                 scan everything, exit 1 on any unresolved name
//   node scripts/validate-operations.mjs --only a,b/c     scan only those files or directories
//   node scripts/validate-operations.mjs --report         per-file counts and a total, never fails
//
// `--only` is what lets an agent finishing one skill get a clean answer about its own files while
// the rest of the tree is still mid-migration; `--report` is the progress ledger. There is
// deliberately no baseline file: with several agents on one branch it would be shared mutable
// state and a merge-conflict magnet, and both flags need no coordination at all.
//
// FALSE POSITIVES are the hard part. `contact.json`, `plan.md`, `packs.json` and `docs.reply.io`
// are all shaped exactly like an operation reference. Two structural rules keep them out, and
// neither is a list anybody has to maintain:
//   1. the entity segment — the part before the first dot — must be an entity the contract
//      itself declares (see read_contract below);
//   2. a token preceded by `@`, `/`, `-` or another dot is part of a path, a filename argument
//      or a longer identifier, never a name written as prose. `--body @contact.json` is the live
//      example, in reply-cli/SKILL.md;
//   3. a token whose second segment is a file extension is a filename. `goal.md` and `plan.md`
//      are the live examples, in the workspace spec — and they are the harder case, because
//      `goal` really is a contract entity, so rule 1 cannot save them. Extensions are a closed
//      set and no operation verb will ever be one: verbs are English imperatives.

import fs from 'node:fs';
import path from 'node:path';
import { ROOT, skill_dirs } from './lib.mjs';

const CONTRACT_SKILL = 'sdr-operations';

// `entity.verb`, plus the two shapes the 1.x catalog used and the 2.0 naming rule forbids:
// three segments (`contact.list.add`) and hyphenated verbs (`sequence.add-step`). Those must
// match, because they are precisely what a migration has to find. Only resolution is strict.
const OPERATION = /(?<![\w/@.-])([a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_-]*){1,2})(?![\w/-])/g;

// A family written as `entity.*` — the form in which the 1.x catalog declares its families.
const FAMILY_DECL = /`([a-z][a-z0-9_]*)\.\*`/g;

// Second segments that make a token a filename rather than an operation. Kept deliberately short:
// only what this repository actually writes, so an unfamiliar extension is reported rather than
// waved through.
const FILE_EXTENSIONS = new Set(['md', 'json', 'yaml', 'yml', 'mjs', 'js', 'ts', 'txt', 'csv', 'lock']);

const FRAGMENT = /^\d{2}-[a-z][a-z0-9-]*\.yaml$/;

// ------------------------------------------------------------ constrained YAML
//
// Node 20 ships no YAML parser and this repository has no dependencies, so the fragments are
// written in the same constrained subset the skill frontmatter uses (docs/skill-contract.md):
// block mappings, block sequences of mappings, plain and single-quoted scalars, inline [a, b]
// arrays and `key: >` folded blocks. Anything outside it — an anchor, an alias, a second
// document, a flow mapping — throws with the file and the line, because a parser that guesses
// at the source of truth is worse than one that stops.

const strip_trailing_comment = (line) => {
    // Drop a trailing " # comment" when we are not inside [...] brackets. Same rule as the
    // frontmatter parser, so the two formats stay one format.
    let depth = 0;
    for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '[') depth++;
        else if (c === ']') depth--;
        else if (c === '#' && depth === 0 && i > 0 && line[i - 1] === ' ') return line.slice(0, i).trimEnd();
    }
    return line;
};

const indent_of = (line) => line.length - line.trimStart().length;
const ignorable = (line) => !line.trim() || line.trimStart().startsWith('#');

const parse_yaml = (text, where) => {
    const lines = text.split(/\r?\n/);
    let i = 0;
    // `at` is passed explicitly wherever a value is read after its key line was consumed, so the
    // reported line is the one the author would go and look at.
    const fail = (msg, at = i) => { throw new Error(`${where}:${at + 1}: ${msg}`); };
    const skip = () => { while (i < lines.length && ignorable(lines[i])) i++; };

    const scalar = (raw, at) => {
        const v = raw.trim();
        if (v.startsWith('&') || v.startsWith('*')) fail('anchors and aliases are not part of the supported subset', at);
        if (v.startsWith('{')) fail('flow mappings are not part of the supported subset', at);
        if (v.startsWith('[')) {
            if (!v.endsWith(']')) fail('an inline array must open and close on one line', at);
            const inner = v.slice(1, -1).trim();
            return inner === '' ? [] : inner.split(',').map(s => scalar(s, at));
        }
        // Single quotes appear where a value would otherwise open with a character YAML reads
        // as syntax — a backtick, a colon-space, a leading dash.
        if (v.length > 1 && v.startsWith("'") && v.endsWith("'")) return v.slice(1, -1).replace(/''/g, "'");
        if (v.length > 1 && v.startsWith('"') && v.endsWith('"')) return v.slice(1, -1);
        if (v === 'true') return true;
        if (v === 'false') return false;
        if (/^-?\d+$/.test(v)) return Number(v);
        return v;
    };

    // A `key: >` block: every deeper-indented line, joined with single spaces, trailing
    // newline gone. `|` keeps its line breaks.
    const block = (parent_indent, fold) => {
        const parts = [];
        while (i < lines.length) {
            if (lines[i].trim() && indent_of(lines[i]) <= parent_indent) break;
            parts.push(lines[i].trim());
            i++;
        }
        while (parts.length && !parts[parts.length - 1]) parts.pop();
        return fold ? parts.filter(Boolean).join(' ') : parts.join('\n');
    };

    const mapping = (indent) => {
        const out = {};
        for (;;) {
            skip();
            if (i >= lines.length) break;
            const at = indent_of(lines[i]);
            if (at < indent) break;
            const text = lines[i].trim();
            if (text === '---' || text === '...') fail('multi-document YAML is not part of the supported subset');
            if (/^-(\s|$)/.test(text)) break;
            if (at > indent) fail(`unexpected indentation — expected ${indent} spaces, found ${at}`);
            const kv = strip_trailing_comment(text).match(/^([A-Za-z0-9_-]+):(.*)$/);
            if (!kv) fail(`cannot parse '${text}'`);
            const rest = kv[2].trim();
            const key_line = i;
            i++;
            if (rest === '>' || rest === '|') out[kv[1]] = block(indent, rest === '>');
            else if (rest === '') out[kv[1]] = child(indent);
            else out[kv[1]] = scalar(rest, key_line);
        }
        return out;
    };

    const sequence = (indent) => {
        const out = [];
        for (;;) {
            skip();
            if (i >= lines.length) break;
            const at = indent_of(lines[i]);
            if (at < indent) break;
            const text = lines[i].trim();
            if (!/^-(\s|$)/.test(text)) break;
            if (at > indent) fail(`unexpected indentation inside a block sequence — expected ${indent} spaces, found ${at}`);
            const item = text.slice(1).trim();
            if (item === '') fail('a block sequence item must open its mapping on the dash line');
            if (!/^[A-Za-z0-9_-]+:(\s|$)/.test(item)) {
                fail('a block sequence of plain scalars is not part of the supported subset');
            }
            // Overwrite the dash with spaces so the item parses as an ordinary mapping at the
            // column its first key already sits in. The line count is untouched, so a later
            // error still reports the line the author would look at.
            const inner = lines[i].length - text.length + 1 + (text.slice(1).length - text.slice(1).trimStart().length);
            lines[i] = ' '.repeat(inner) + item;
            out.push(mapping(inner));
        }
        return out;
    };

    const node = (indent) => {
        skip();
        if (i >= lines.length) return null;
        return /^-(\s|$)/.test(lines[i].trim()) ? sequence(indent) : mapping(indent);
    };

    const child = (indent) => {
        skip();
        if (i >= lines.length || indent_of(lines[i]) <= indent) return null;
        return node(indent_of(lines[i]));
    };

    skip();
    if (i >= lines.length) return {};
    const root = node(indent_of(lines[i]));
    skip();
    if (i < lines.length) fail('content after the end of the document');
    return root ?? {};
};

// ------------------------------------------------------------------ the corpus

const markdown_under = (dir) => {
    const out = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) out.push(...markdown_under(full));
        else if (entry.name.endsWith('.md')) out.push(full);
    }
    return out;
};

const relative = (file) => {
    const rel = path.relative(ROOT, file).replace(/\\/g, '/');
    return rel.startsWith('..') ? file.replace(/\\/g, '/') : rel;
};

// ---------------------------------------------------------------- the contract

// The entity set is derived at run time, never listed here: an ignore list of things that only
// look like operations would rot the moment somebody adds a file, and the entity rule costs
// nothing to keep current.
//
// Two sources, because during the 1.x -> 2.0 migration the contract exists in two forms at once:
//
//   1. `operations/NN-<slug>.yaml` — the source of truth. Every declared name, and the entity
//      each name is built on.
//   2. `retired_entities` in families.yaml — the words the contract has renamed away. Without
//      these the validator is blind to exactly the names the migration has to remove: `sequence.*`
//      became `campaign.*` and `metrics.*` collapsed into `engagement`, so neither entity appears
//      in any fragment and every stale reference to them would read as "not an operation reference
//      at all". 57 references depend on this. It is contract-owned and permanent: a sentence
//      written next year that says `sequence.activate` is naming something that does not exist,
//      and that stays true long after the migration.
//   3. the family declarations the 1.x catalog still makes in its own prose, written `entity.*`.
//      Belt and braces while both forms of the contract exist; this source retires itself when the
//      1.x catalog is deleted, which is why (2) and not this is what closes the blind spot.
//
// Only the contract skill is read for either. A playbook naming an operation cannot widen the
// set of entities it is allowed to name.
const read_contract = () => {
    const skill = skill_dirs().find(s => s.name === CONTRACT_SKILL);
    if (!skill) throw new Error(`the '${CONTRACT_SKILL}' skill is not in the tree — there is no contract to resolve against`);

    const ops_dir = path.join(skill.dir, 'operations');
    if (!fs.existsSync(ops_dir)) throw new Error(`${relative(ops_dir)} does not exist — the operation fragments are the contract`);

    const names = new Set();
    const entities = new Set();
    const fragments = fs.readdirSync(ops_dir).filter(f => FRAGMENT.test(f)).sort();
    if (!fragments.length) throw new Error(`no NN-<slug>.yaml fragments under ${relative(ops_dir)}`);

    for (const fragment of fragments) {
        const full = path.join(ops_dir, fragment);
        const doc = parse_yaml(fs.readFileSync(full, 'utf8'), relative(full));
        if (!Array.isArray(doc.operations) || !doc.operations.length) {
            throw new Error(`${relative(full)}: holds no operations list. A fragment that yields no names makes every `
                + 'reference in the repository unresolvable-by-omission, and this tool would report success.');
        }
        for (const op of doc.operations) {
            if (!op || typeof op.name !== 'string') throw new Error(`${relative(full)}: an operation has no name`);
            names.add(op.name);
            entities.add(op.name.split('.')[0]);
        }
    }

    const register = path.join(ops_dir, 'families.yaml');
    if (!fs.existsSync(register)) throw new Error(`${relative(register)} does not exist — it declares the retired entities`);
    const registry = parse_yaml(fs.readFileSync(register, 'utf8'), relative(register));
    for (const retired of registry.retired_entities ?? []) {
        if (retired?.name) entities.add(retired.name);
    }

    // Names the contract states it does not define. The contract sometimes has to name an
    // operation in order to say it does not exist, and that sentence must not read as a reference
    // to a missing one. Resolving them here, rather than exempting the file that says it, keeps a
    // genuine typo in the same paragraph visible.
    // Names the contract states it does not define are PERMITTED in prose without being part of
    // the contract. Folding them into the same set used for counting and for the nearest-name hint
    // made the linter recommend `consent.check` as the fix for a near miss — the one name the
    // register says must never resolve to an operation.
    const absent_names = new Set();
    for (const absent of registry.declared_absent ?? []) {
        if (absent?.name && !names.has(absent.name)) absent_names.add(absent.name);
    }

    for (const file of markdown_under(skill.dir)) {
        for (const [, entity] of fs.readFileSync(file, 'utf8').matchAll(FAMILY_DECL)) entities.add(entity);
    }

    // Sorted, so the nearest-name hint is the same on every machine when two names tie.
    // A validator whose failure mode is "OK" is worse than no validator. Renaming the
    // `operations:` key in every fragment used to produce "0 operation references … resolve to 1
    // operation" and exit 0: an empty entity set skips every token in the tree, and the tool
    // reported success. The register states how many operations each family holds, so the floor is
    // knowable — and an author running --only on one skill gets a green light off the same code.
    const families = registry.families ?? [];
    const declared = families.reduce((n, f) => n + (Number(f.operations) || 0), 0);
    if (fragments.length === families.length && declared && names.size < declared) {
        throw new Error(`the fragments yield ${names.size} operation names, but families.yaml registers ${declared} `
            + 'across its families. Resolution against a contract this small would pass by finding nothing.');
    }

    return {
        names, entities, fragments: fragments.length,
        permitted: new Set([...names, ...absent_names]),
        sorted: [...names].sort(),
        declared_absent: absent_names.size,
    };
};

// ------------------------------------------------------------- nearest by name

// Most failures in this migration are renames, so the nearest resolving name turns each report
// line into a one-line fix. Levenshtein, two rows, no package.
const edit_distance = (a, b) => {
    let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
    for (let i = 1; i <= a.length; i++) {
        const row = [i];
        for (let j = 1; j <= b.length; j++) {
            row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        }
        prev = row;
    }
    return prev[b.length];
};

const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

const nearest = (token, names) => {
    let best = null;
    let best_distance = Infinity;
    for (const name of names) {
        const d = edit_distance(token, name);
        if (d < best_distance) { best = name; best_distance = d; }
    }
    return best;
};

// ------------------------------------------------------------------------ main

const usage = (msg) => {
    console.error(`${msg}\nUsage: node scripts/validate-operations.mjs [--only <path>[,<path>...]] [--report]`);
    process.exit(2);
};

const args = process.argv.slice(2);
let report_mode = false;
let only = null;
for (let i = 0; i < args.length; i++) {
    if (args[i] === '--report') report_mode = true;
    else if (args[i] === '--only') {
        const value = args[++i];
        if (!value || value.startsWith('--')) usage('--only needs a comma-separated list of files or directories');
        only = value.split(',').map(s => s.trim()).filter(Boolean);
    } else usage(`unknown argument '${args[i]}'`);
}

let contract;
try { contract = read_contract(); }
catch (e) { console.error(`Cannot read the operation contract: ${e.message}`); process.exit(1); }

const targets = [];
if (only) {
    for (const entry of only) {
        const resolved = path.resolve(ROOT, entry);
        if (!fs.existsSync(resolved)) usage(`--only '${entry}' does not exist`);
        if (fs.statSync(resolved).isDirectory()) targets.push(...markdown_under(resolved));
        else targets.push(resolved);
    }
} else {
    targets.push(...markdown_under(path.join(ROOT, 'plugins')));
    targets.push(...markdown_under(path.join(ROOT, 'docs')));
    targets.push(path.join(ROOT, 'README.md'));
}

// History is exempt, and only history. An ADR records what was decided at the time, in the words
// that were current then; a Changelog entry says what an operation used to be called. Both are
// meant to keep naming things this contract has renamed away, and rewriting them to satisfy a
// linter would be falsifying the record to make a tool happy. Everything else — every sentence
// that tells an agent what to do now — is checked.
//
// Scoped deliberately narrowly: the ADR directory, not all of docs/, and the Changelog section of
// a skill, not the whole skill.
const is_history_file = (file) => relative(file).startsWith('docs/adr/');
const CHANGELOG_HEADING = /^##\s+Changelog\s*$/;
const ANY_HEADING = /^##\s+/;

const files = [...new Set(targets.map(f => path.resolve(f)))].sort();

const unresolved = [];
let references = 0;
for (const file of files) {
    if (is_history_file(file)) continue;
    let in_changelog = false;
    fs.readFileSync(file, 'utf8').split(/\r?\n/).forEach((line, n) => {
        if (ANY_HEADING.test(line)) in_changelog = CHANGELOG_HEADING.test(line);
        if (in_changelog) return;
        for (const [, token] of line.matchAll(OPERATION)) {
            const segments = token.split('.');
            if (!contract.entities.has(segments[0])) continue;
            if (segments.length === 2 && FILE_EXTENSIONS.has(segments[1])) continue;
            references++;
            if (contract.permitted.has(token)) continue;
            unresolved.push({ file: relative(file), line: n + 1, token });
        }
    });
}

if (report_mode) {
    const counts = new Map();
    for (const u of unresolved) counts.set(u.file, (counts.get(u.file) ?? 0) + 1);
    const rows = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    if (!rows.length) {
        console.log(`No unresolved operation references — ${plural(references, 'reference')} across `
            + `${plural(files.length, 'file')} all resolve.`);
    } else {
        console.log('Operation references that do not resolve to the contract:\n');
        for (const [file, count] of rows) console.log(`  ${String(count).padStart(4)}  ${file}`);
        console.log(`\n  ${String(unresolved.length).padStart(4)}  total across ${plural(rows.length, 'file')}`);
        console.log(`\n${plural(contract.names.size, 'operation')} declared in ${plural(contract.fragments, 'fragment')}; `
            + `${plural(references, 'operation reference')} seen in ${plural(files.length, 'file')}.`);
    }
    process.exit(0);
}

if (unresolved.length) {
    console.error(`Operation names that do not exist in the contract (${unresolved.length}):`);
    for (const u of unresolved) {
        console.error(`  ${u.file}:${u.line}  ${u.token}  — nearest contract name: ${nearest(u.token, contract.sorted)}`);
    }
    console.error('\nEvery operation named in prose must be declared in the operation fragments. '
        + 'Rename the reference, or add the operation to the contract first.');
    process.exit(1);
}

// The resolving set is one name larger than the contract: a declared absence is a name the
// contract states it does not define, and it resolves so that the sentence saying so does not
// read as a reference to a missing operation. Counting it as an operation would publish a
// contract size that is wrong by exactly the number of absences we were careful to declare.
console.log(`OK — ${plural(references, 'operation reference')} across ${plural(files.length, 'file')} `
    + `resolve to ${plural(contract.names.size, 'operation')} in `
    + `${plural(contract.fragments, 'fragment')}`
    + (contract.declared_absent ? `, plus ${plural(contract.declared_absent, 'name')} the contract declares absent.` : '.'));
