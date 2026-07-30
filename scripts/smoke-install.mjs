// Simulates what a host physically puts on disk when it installs, then checks the result
// is usable. Catches the class of bug where a skill works in the repo but dangles on a
// user's machine.
//
// Two channels ship these skills, and they produce different shapes on disk:
//
//   1. PER-PACK  — Claude Code plugin install, or a directory copy of one pack.
//      Copies `plugins/<pack>/` and resolves declared pack dependencies.
//
//   2. FLAT      — `npx skills add reply-team/reply-skills` (skills.sh, REPLY-51556).
//      Copies every skill directory into ONE directory with no pack namespacing and
//      no dependency resolution. Verified against skills CLI 1.5.21.
//
// Both are simulated because each can fail in a way the other cannot see: the per-pack
// shape can dangle across a pack boundary, and the flat shape can silently overwrite two
// skills that share a name.
//
// This runs in plain Node with no host installed, so CI can gate every PR on it. It is
// not a substitute for a real `claude plugin install` — that verifies the host's own
// dependency resolution, and is run against a released tag.
//
// Usage: npm run smoke

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ROOT, read_packs, reachable_packs, skill_dirs, parse_skill_md, HARD_RELATIONS } from './lib.mjs';

const registry = read_packs();
const failures = [];
const fail = (scope, msg) => failures.push(`  [${scope}] ${msg}`);

const all_skills = skill_dirs();
const pack_of = new Map(all_skills.map(s => [s.name, s.pack]));

const markdown_files = (dir) => {
    const out = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) out.push(...markdown_files(full));
        else if (entry.name.endsWith('.md')) out.push(full);
    }
    return out;
};

// Every local link in every markdown file of an installed skill must resolve inside the
// tree the host actually copied. `dir` is the skill's directory in the simulated install.
const check_links = (scope, name, dir) => {
    for (const md_file of markdown_files(dir)) {
        const rel = path.relative(dir, md_file).replace(/\\/g, '/');
        for (const [, link] of fs.readFileSync(md_file, 'utf8').matchAll(/\]\(([^)\s]+)\)/g)) {
            if (/^(https?:|mailto:|#)/.test(link)) continue;
            const clean = link.split('#')[0];
            if (!clean) continue;
            if (!fs.existsSync(path.resolve(path.dirname(md_file), clean))) {
                fail(scope, `${name}/${rel}: link '${link}' does not resolve in the installed copy`);
            }
        }
    }
};

// Hard relations must be satisfiable from the set of skills the install actually produced.
const check_hard_relations = (scope, name, file, available) => {
    const { data } = parse_skill_md(file);
    for (const key of HARD_RELATIONS) {
        for (const dep of data.metadata?.relations?.[key] ?? []) {
            if (!dep) continue;
            if (!available.has(dep)) {
                fail(scope, `${name}: relations.${key} → '${dep}' (pack '${pack_of.get(dep) ?? '?'}') ` +
                    'is not present in this install');
            }
        }
    }
};

const tmp_root = fs.mkdtempSync(path.join(os.tmpdir(), 'reply-skills-smoke-'));

// ------------------------------------------------- channel 1: per-pack install

for (const p of registry.packs) {
    // What the host physically puts on disk: this pack, plus the packs it declares.
    // reachable_packs() includes the pack itself.
    const installed = reachable_packs(p.name, registry);
    const scope = `pack:${p.name}`;
    const target = path.join(tmp_root, 'per-pack', p.name);
    fs.cpSync(path.join(ROOT, 'plugins', p.name), target, { recursive: true });

    if (!fs.existsSync(path.join(target, '.claude-plugin', 'plugin.json'))) {
        fail(scope, 'installed copy has no .claude-plugin/plugin.json');
    }
    if (!fs.existsSync(path.join(target, 'CATALOG.md'))) {
        fail(scope, 'installed copy has no CATALOG.md — an agent inside the pack has no catalog to read');
    }

    const skills_root = path.join(target, 'skills');
    if (!fs.existsSync(skills_root)) { fail(scope, 'installed copy has no skills/ directory'); continue; }

    // Skills an agent can actually reach after this install.
    const available = new Set(all_skills.filter(s => installed.has(s.pack)).map(s => s.name));

    for (const name of fs.readdirSync(skills_root)) {
        const dir = path.join(skills_root, name);
        if (!fs.statSync(dir).isDirectory()) continue;
        const file = path.join(dir, 'SKILL.md');
        if (!fs.existsSync(file)) { fail(scope, `${name}: SKILL.md missing from the installed copy`); continue; }

        check_links(scope, name, dir);
        check_hard_relations(scope, name, file, available);
    }
}

// ----------------------------------------------------- channel 2: flat install
//
// `npx skills add` drops every skill into one directory keyed only by skill name —
// the pack disappears. Two consequences this asserts:
//
//   * A name shared by two packs is not a merge, it is a silent overwrite: one skill's
//     content wins and the other vanishes. The validator already requires globally
//     unique names; this proves the requirement is what actually protects this channel,
//     so nobody relaxes it without a failing test.
//   * Every skill must still be self-contained once the `plugins/<pack>/` wrapper is
//     gone, and no skill may reach for pack-level files (CATALOG.md, plugin.json) —
//     this channel does not install them.

const flat_scope = 'flat:npx-skills';
const flat_root = path.join(tmp_root, 'flat', 'skills');
fs.mkdirSync(flat_root, { recursive: true });

const placed = new Map(); // skill name -> pack that placed it

for (const s of all_skills) {
    const target = path.join(flat_root, s.name);
    if (placed.has(s.name)) {
        fail(flat_scope, `skill name '${s.name}' is shipped by both '${placed.get(s.name)}' and '${s.pack}'. ` +
            'A flat install keys only on the name, so one silently overwrites the other — rename one of them.');
        continue;
    }
    placed.set(s.name, s.pack);
    fs.cpSync(s.dir, target, { recursive: true });
}

// Installing everything is the shape this channel documents, so that is what is verified:
// all 18 skills present, nothing dangling, every hard relation satisfied.
const flat_available = new Set(placed.keys());

for (const name of placed.keys()) {
    const dir = path.join(flat_root, name);
    const file = path.join(dir, 'SKILL.md');
    if (!fs.existsSync(file)) { fail(flat_scope, `${name}: SKILL.md missing from the flat copy`); continue; }

    check_links(flat_scope, name, dir);
    check_hard_relations(flat_scope, name, file, flat_available);
}

if (placed.size !== all_skills.length) {
    fail(flat_scope, `flat install produced ${placed.size} skills from ${all_skills.length} in the repo — names collided`);
}

fs.rmSync(tmp_root, { recursive: true, force: true });

if (failures.length) {
    console.error(`Install simulation failed (${failures.length}):\n${failures.join('\n')}`);
    process.exit(1);
}
console.log(
    `OK — each of the ${registry.packs.length} packs is self-contained installed alone, ` +
    `and all ${placed.size} skills coexist in a flat install with unique names and no dangling links.`
);
