// Validates every skill against the contract (docs/skill-contract.md) and every pack
// against the architecture invariants (docs/packs.md).
// Usage: npm run validate  — exits 1 with a per-skill error list on violations.

import fs from 'node:fs';
import path from 'node:path';
import {
    ROOT, read_packs, pack_map, reachable_packs, skill_dirs, parse_skill_md,
    CATEGORIES, MATURITIES, STATUSES, RELATION_KEYS, HARD_RELATIONS,
    CODEX_CATEGORIES, CODEX_CAPABILITIES, CODEX_ASSET_FIELDS,
} from './lib.mjs';

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SEMVER = /^\d+\.\d+\.\d+$/;

// Repo-root paths a skill must never reference: they are NOT copied when a host
// installs a single pack, so the reference would dangle on a user's machine.
// Note `templates/` is deliberately absent — a skill may legitimately ship its own.
const ROOT_ONLY = /^(docs|scripts)\//;
const ROOT_FILES = new Set(['INDEX.md', 'CONTRIBUTING.md', 'README.md', 'packs.json']);

// Every markdown file inside a skill, not just SKILL.md: a reference file that dangles
// is the same bug as a SKILL.md link that dangles.
const markdown_files = (dir) => {
    const out = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) out.push(...markdown_files(full));
        else if (entry.name.endsWith('.md')) out.push(full);
    }
    return out;
};

const section_text = (body, heading) => {
    const lines = body.split(/\r?\n/);
    const start = lines.findIndex(l => l.trim() === `## ${heading}`);
    if (start === -1) return null;
    const rest = lines.slice(start + 1);
    const end = rest.findIndex(l => /^## /.test(l));
    return rest.slice(0, end === -1 ? undefined : end).join('\n').trim();
};

const errors = [];
const err = (subject, msg) => errors.push(`  ${subject}: ${msg}`);

// ---------------------------------------------------------------- pack registry

const registry = read_packs();
const packs = pack_map(registry);

for (const p of registry.packs) {
    if (!KEBAB.test(p.name)) err(p.name, 'pack name must be kebab-case');
    if (!SEMVER.test(p.version ?? '')) err(p.name, `pack version '${p.version}' is not semver`);
    if (!p.description || p.description.length < 40) err(p.name, 'pack description missing or too short');
    if (!fs.existsSync(path.join(ROOT, 'plugins', p.name))) err(p.name, 'declared in packs.json but plugins/<pack> does not exist');
    for (const dep of p.dependencies ?? []) {
        if (!packs.has(dep)) err(p.name, `dependency '${dep}' is not a declared pack`);
        if (dep === p.name) err(p.name, 'pack depends on itself');
    }
}

// The architecture invariant: the core carries no dependencies, so it stays usable
// with a provider other than Reply and without any orchestration runtime (docs/packs.md).
if ((packs.get('ai-sdr-core')?.dependencies ?? []).length) {
    err('ai-sdr-core', 'must not declare dependencies — it is the vendor-neutral base of the graph');
}
for (const [a, b] of [['reply-adapter', 'agentic-runtime'], ['agentic-runtime', 'reply-adapter']]) {
    if ((packs.get(a)?.dependencies ?? []).includes(b)) err(a, `must not depend on '${b}' — siblings stay independent`);
}

// Packs present on disk but absent from the registry would ship unvalidated.
for (const dir of fs.readdirSync(path.join(ROOT, 'plugins'))) {
    if (!packs.has(dir)) err(dir, 'directory under plugins/ is not declared in packs.json');
}

// ------------------------------------------------- host catalog presentation (REPLY-51541)
//
// `presentation` in packs.json is what a user reads in a host's plugin catalog before
// deciding to install. It is validated here, at the source, rather than in the generated
// manifests: a missing field would otherwise become `undefined` in shipped JSON, and the
// freshness check would happily call that up to date.

if (!registry.marketplace.displayName) {
    err('marketplace', 'marketplace.displayName missing — Codex renders the marketplace by it');
}

for (const p of registry.packs) {
    const pr = p.presentation;
    if (!pr || typeof pr !== 'object') { err(p.name, 'presentation block missing from packs.json'); continue; }

    if (!pr.shortDescription) err(p.name, 'presentation.shortDescription missing');
    else if (/[.!]$/.test(pr.shortDescription)) {
        err(p.name, 'presentation.shortDescription must not end in a full stop — host catalogs render it as a label, not a sentence');
    }
    if (!pr.longDescription || pr.longDescription.length < 80) {
        err(p.name, 'presentation.longDescription missing or too short (< 80 chars) — it is the catalog body text');
    }
    if (!CODEX_CATEGORIES.includes(pr.category)) {
        err(p.name, `presentation.category '${pr.category}' is not one of the categories Codex actually uses: ${CODEX_CATEGORIES.join(', ')}`);
    }
    const caps = Array.isArray(pr.capabilities) ? pr.capabilities : [];
    if (!caps.length) err(p.name, 'presentation.capabilities must list at least one capability');
    for (const c of caps) {
        if (!CODEX_CAPABILITIES.includes(c)) err(p.name, `presentation.capabilities '${c}' not in ${CODEX_CAPABILITIES.join('|')}`);
    }
    const prompts = Array.isArray(pr.examplePrompts) ? pr.examplePrompts : [];
    if (!prompts.length) err(p.name, 'presentation.examplePrompts must offer at least one prompt — hosts show them as starting points');
    for (const q of prompts) {
        if (typeof q !== 'string' || !q.trim()) err(p.name, 'presentation.examplePrompts contains an empty entry');
    }

    // The Codex manifest exposes skills with `skills: "./skills/"`. If that directory is
    // absent or empty the pack installs and contributes nothing — silently.
    const skills_root = path.join(ROOT, 'plugins', p.name, 'skills');
    if (!fs.existsSync(skills_root)) {
        err(p.name, 'plugins/<pack>/skills/ does not exist — the manifest\'s skills path would not resolve');
    } else if (!fs.readdirSync(skills_root).some(d => fs.statSync(path.join(skills_root, d)).isDirectory())) {
        err(p.name, 'plugins/<pack>/skills/ contains no skill directories');
    }

    // Any image the Codex manifest names must ship inside the pack. Nothing emits these
    // yet (brand assets are REPLY-51558); the check exists so they cannot arrive broken.
    const codex_manifest = path.join(ROOT, 'plugins', p.name, '.codex-plugin', 'plugin.json');
    if (!fs.existsSync(codex_manifest)) {
        err(p.name, '.codex-plugin/plugin.json missing — run `npm run build-manifests`');
    } else {
        let iface;
        try { iface = JSON.parse(fs.readFileSync(codex_manifest, 'utf8')).interface ?? {}; }
        catch (e) { err(p.name, `.codex-plugin/plugin.json is not valid JSON: ${e.message}`); iface = {}; }
        for (const field of CODEX_ASSET_FIELDS) {
            for (const asset of [iface[field]].flat().filter(Boolean)) {
                const resolved = path.resolve(path.join(ROOT, 'plugins', p.name), asset);
                if (!fs.existsSync(resolved)) {
                    err(p.name, `interface.${field} → '${asset}' does not exist inside the pack`);
                }
            }
        }
    }
}

// ---------------------------------------------------------------------- skills

const dirs = skill_dirs();
if (dirs.length === 0) {
    console.error('No skills found under plugins/*/skills/');
    process.exit(1);
}

const pack_of = new Map(dirs.map(d => [d.name, d.pack]));
const known_names = new Set(dirs.map(d => d.name));

const duplicates = dirs.map(d => d.name).filter((n, i, a) => a.indexOf(n) !== i);
for (const name of new Set(duplicates)) {
    err(name, 'skill name is used in more than one pack — names must be globally unique (hosts flatten them)');
}

for (const { pack, name, dir } of dirs) {
    const file = path.join(dir, 'SKILL.md');
    if (!fs.existsSync(file)) { err(name, 'SKILL.md missing'); continue; }
    let parsed;
    try { parsed = parse_skill_md(file); }
    catch (e) { err(name, `frontmatter: ${e.message}`); continue; }
    const { data, body } = parsed;

    if (!KEBAB.test(name)) err(name, 'directory name must be kebab-case');
    if (data.name !== name) err(name, `frontmatter name '${data.name}' != directory name`);
    if (typeof data.description !== 'string' || data.description.length < 20) {
        err(name, 'description missing or too short (< 20 chars) — hosts route on it');
    }
    const md = data.metadata;
    if (!md || typeof md !== 'object') { err(name, 'metadata block missing'); continue; }
    if (!SEMVER.test(md.version ?? '')) err(name, `metadata.version '${md.version}' is not semver`);
    if (!CATEGORIES.includes(md.category)) err(name, `metadata.category '${md.category}' not in ${CATEGORIES.join('|')}`);
    if (!MATURITIES.includes(md.maturity)) err(name, `metadata.maturity '${md.maturity}' not in ${MATURITIES.join('|')}`);
    if (!STATUSES.includes(md.status)) err(name, `metadata.status '${md.status}' not in ${STATUSES.join('|')}`);
    if (!md.owner) err(name, 'metadata.owner missing');
    if (md.pack !== pack) err(name, `metadata.pack '${md.pack}' does not match its directory (plugins/${pack}/)`);

    // Relations: targets must exist, and a HARD relation may only point into a pack
    // this pack can actually reach — otherwise a solo install of it is broken.
    const allowed = reachable_packs(pack, registry);
    if (md.relations && typeof md.relations === 'object') {
        for (const [key, value] of Object.entries(md.relations)) {
            if (!RELATION_KEYS.includes(key)) err(name, `relations key '${key}' not in ${RELATION_KEYS.join('|')}`);
            const list = Array.isArray(value) ? value : [value];
            for (const target of list) {
                if (!target) continue;
                if (!known_names.has(target)) { err(name, `relations.${key} → '${target}' is not a known skill`); continue; }
                const target_pack = pack_of.get(target);
                if (HARD_RELATIONS.includes(key) && !allowed.has(target_pack)) {
                    err(name, `relations.${key} → '${target}' lives in pack '${target_pack}', which '${pack}' does not depend on. ` +
                        'A hard dependency cannot cross that boundary — use recommends, or move the knowledge.');
                }
            }
        }
    }

    // Body requirements
    if (section_text(body, 'Purpose') === null) err(name, 'body missing "## Purpose" section');
    if (section_text(body, 'Changelog') === null) err(name, 'body missing "## Changelog" section');
    if (md.maturity === 'production') {
        for (const required of ['Validation', 'Safety']) {
            if (!section_text(body, required)) err(name, `maturity=production requires a non-empty "## ${required}" section`);
        }
    }
    if (md.status === 'deprecated' && !(md.relations?.supersedes?.length || section_text(body, 'Purpose')?.includes('deprecated'))) {
        err(name, 'status=deprecated: point to a successor (relations.supersedes) or explain in Purpose');
    }

    // Self-containment: nothing may reference a file outside its own pack, because
    // hosts install a pack by copying only that directory.
    const pack_root = path.join(ROOT, 'plugins', pack);
    for (const md_file of markdown_files(dir)) {
        const where = `${name}${md_file === file ? '' : `/${path.relative(dir, md_file).replace(/\\/g, '/')}`}`;
        const text = fs.readFileSync(md_file, 'utf8');
        for (const [, target] of text.matchAll(/\]\(([^)\s]+)\)/g)) {
            if (/^(https?:|mailto:|#)/.test(target)) continue;
            const clean = target.split('#')[0];
            if (!clean) continue;
            const resolved = path.resolve(path.dirname(md_file), clean);
            if (!resolved.startsWith(pack_root + path.sep)) {
                err(where, `link '${target}' escapes the pack root — reference other skills by name, keep files inside the skill`);
            } else if (!fs.existsSync(resolved)) {
                err(where, `link '${target}' points at a file that does not exist in the pack`);
            }
        }
        // Prose references to repo-only locations are the same bug in a different shape.
        for (const [, quoted] of text.matchAll(/`([A-Za-z0-9_./-]+\.(?:md|json|mjs|ya?ml))`/g)) {
            if (ROOT_ONLY.test(quoted) || ROOT_FILES.has(quoted)) {
                err(where, `references repo-only path \`${quoted}\`, which is not copied when the pack is installed alone`);
            }
        }
    }
}

if (errors.length) {
    console.error(`Contract / architecture violations (${errors.length}):\n${errors.join('\n')}`);
    process.exit(1);
}
console.log(`OK — ${registry.packs.length} packs, ${dirs.length} skills pass the contract.`);
