// Shared helpers: the pack registry, skill discovery, and constrained-YAML frontmatter parsing.
// Zero dependencies by design (ADR-0003) — the frontmatter format is a documented
// subset (docs/skill-contract.md): scalars, `key: >` folded blocks, inline [a, b]
// arrays, and nested maps at 2/4-space indent. No anchors, no deep nesting.

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));

// ---------------------------------------------------------------- pack registry

// packs.json is the single host-neutral source of truth (docs/packs.md): pack identity,
// versions and the dependency graph. Host manifests are generated from it.
const read_packs = () => JSON.parse(fs.readFileSync(path.join(ROOT, 'packs.json'), 'utf8'));

// name -> pack entry
const pack_map = (registry = read_packs()) => new Map(registry.packs.map(p => [p.name, p]));

// Packs whose skills a given pack may reference with a HARD `depends-on`:
// itself plus everything reachable through its declared dependencies.
// A hard dependency outside this set would break a solo install of that pack.
const reachable_packs = (name, registry = read_packs()) => {
    const by_name = pack_map(registry);
    const seen = new Set();
    const walk = (n) => {
        if (seen.has(n)) return;
        seen.add(n);
        for (const dep of by_name.get(n)?.dependencies ?? []) walk(dep);
    };
    walk(name);
    return seen;
};

// ------------------------------------------------------------- skill discovery

const skill_dirs = () => {
    const out = [];
    const plugins_root = path.join(ROOT, 'plugins');
    for (const pack of fs.readdirSync(plugins_root)) {
        const skills_root = path.join(plugins_root, pack, 'skills');
        if (!fs.existsSync(skills_root)) continue;
        for (const name of fs.readdirSync(skills_root)) {
            const dir = path.join(skills_root, name);
            if (fs.statSync(dir).isDirectory()) out.push({ pack, name, dir });
        }
    }
    return out;
};

// ---------------------------------------------------------- frontmatter parsing

const strip_comment = (line) => {
    // Drop a trailing " # comment" when we're not inside [...] brackets.
    let depth = 0;
    for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '[') depth++;
        else if (c === ']') depth--;
        else if (c === '#' && depth === 0 && i > 0 && line[i - 1] === ' ') return line.slice(0, i).trimEnd();
    }
    return line;
};

const parse_value = (raw) => {
    const v = raw.trim();
    if (v.startsWith('[') && v.endsWith(']')) {
        const inner = v.slice(1, -1).trim();
        return inner === '' ? [] : inner.split(',').map(s => s.trim());
    }
    return v;
};

// Parse the frontmatter block of a SKILL.md into a plain object.
// Returns { data, body } or throws with a line-anchored message.
const parse_skill_md = (file) => {
    const text = fs.readFileSync(file, 'utf8');
    const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
    if (!m) throw new Error('missing frontmatter block (--- ... ---)');
    const lines = m[1].split(/\r?\n/);
    const data = {};
    // stack of [indent, object]
    const stack = [[0, data]];
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        if (!line.trim() || line.trim().startsWith('#')) continue;
        line = strip_comment(line);
        const indent = line.length - line.trimStart().length;
        const kv = line.trim().match(/^([A-Za-z0-9_-]+):(.*)$/);
        if (!kv) throw new Error(`line ${i + 1}: cannot parse '${line.trim()}'`);
        const key = kv[1];
        const rest = kv[2].trim();
        while (stack.length > 1 && indent < stack[stack.length - 1][0]) stack.pop();
        const parent = stack[stack.length - 1][1];
        if (rest === '>' || rest === '|') {
            // folded block: consume deeper-indented lines
            const parts = [];
            while (i + 1 < lines.length) {
                const next = lines[i + 1];
                const nindent = next.length - next.trimStart().length;
                if (!next.trim() || nindent > indent) { parts.push(next.trim()); i++; }
                else break;
            }
            parent[key] = parts.filter(Boolean).join(' ');
        } else if (rest === '') {
            parent[key] = {};
            stack.push([indent + 2, parent[key]]);
        } else {
            parent[key] = parse_value(rest);
        }
    }
    return { data, body: m[2] };
};

// Codex plugin-catalog vocabulary. Codex publishes no schema, so this is OBSERVED — read
// off the 188 manifests the CLI ships (bundled marketplace + the official 180-plugin one).
// Widen it deliberately if a future Codex version adds a value we want; do not widen it to
// make a typo pass.
const CODEX_CATEGORIES = [
    'Productivity', 'Developer Tools', 'Finance', 'Business & Operations', 'Data & Analytics',
    'Education & Research', 'Communication', 'Creativity', 'Security', 'Engineering', 'Travel', 'Other',
];
// Some third-party vendors use `capabilities` as free-text feature bullets. We keep to the
// three values that behave like a closed set, so our packs read consistently.
const CODEX_CAPABILITIES = ['Read', 'Write', 'Interactive'];
// interface fields that name an image file shipped inside the pack. None are emitted yet
// (we have no brand assets) — the validator checks them so that when they arrive, a
// dangling icon path cannot ship.
const CODEX_ASSET_FIELDS = ['logo', 'logoDark', 'composerIcon', 'screenshots'];

const CATEGORIES = ['operations', 'strategy', 'protection', 'execution', 'runtime', 'user-knowledge'];
const MATURITIES = ['draft', 'reviewed', 'validated', 'production'];
const STATUSES = ['active', 'deprecated', 'archived'];
const HARD_RELATIONS = ['depends-on', 'extends'];
const SOFT_RELATIONS = ['recommends', 'validates', 'validated-by', 'supersedes', 'alternative-to'];
const RELATION_KEYS = [...HARD_RELATIONS, ...SOFT_RELATIONS];

export {
    ROOT, read_packs, pack_map, reachable_packs, skill_dirs, parse_skill_md,
    CATEGORIES, MATURITIES, STATUSES, RELATION_KEYS, HARD_RELATIONS, SOFT_RELATIONS,
    CODEX_CATEGORIES, CODEX_CAPABILITIES, CODEX_ASSET_FIELDS,
};
