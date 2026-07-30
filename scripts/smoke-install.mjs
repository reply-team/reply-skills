// Simulates what a host does when it installs a pack: copy ONLY that pack's directory,
// then check the result is usable on its own. Catches the class of bug where a skill
// works in the repo but dangles on a user's machine.
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
const fail = (pack, msg) => failures.push(`  [${pack}] ${msg}`);

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

const tmp_root = fs.mkdtempSync(path.join(os.tmpdir(), 'reply-skills-smoke-'));

for (const p of registry.packs) {
    // What the host physically puts on disk: this pack, plus the packs it declares.
    // reachable_packs() includes the pack itself.
    const installed = reachable_packs(p.name, registry);
    const target = path.join(tmp_root, p.name);
    fs.cpSync(path.join(ROOT, 'plugins', p.name), target, { recursive: true });

    if (!fs.existsSync(path.join(target, '.claude-plugin', 'plugin.json'))) {
        fail(p.name, 'installed copy has no .claude-plugin/plugin.json');
    }
    if (!fs.existsSync(path.join(target, 'CATALOG.md'))) {
        fail(p.name, 'installed copy has no CATALOG.md — an agent inside the pack has no catalog to read');
    }

    const skills_root = path.join(target, 'skills');
    if (!fs.existsSync(skills_root)) { fail(p.name, 'installed copy has no skills/ directory'); continue; }

    // Skills an agent can actually reach after this install.
    const available = new Set(all_skills.filter(s => installed.has(s.pack)).map(s => s.name));

    for (const name of fs.readdirSync(skills_root)) {
        const dir = path.join(skills_root, name);
        if (!fs.statSync(dir).isDirectory()) continue;
        const file = path.join(dir, 'SKILL.md');
        if (!fs.existsSync(file)) { fail(p.name, `${name}: SKILL.md missing from the installed copy`); continue; }

        const { data } = parse_skill_md(file);

        // Every local link in every markdown file must resolve inside the copied tree.
        for (const md_file of markdown_files(dir)) {
            const rel = path.relative(dir, md_file).replace(/\\/g, '/');
            for (const [, link] of fs.readFileSync(md_file, 'utf8').matchAll(/\]\(([^)\s]+)\)/g)) {
                if (/^(https?:|mailto:|#)/.test(link)) continue;
                const clean = link.split('#')[0];
                if (!clean) continue;
                if (!fs.existsSync(path.resolve(path.dirname(md_file), clean))) {
                    fail(p.name, `${name}/${rel}: link '${link}' does not resolve in the installed copy`);
                }
            }
        }

        // Hard dependencies must be satisfiable by what the host installed.
        for (const key of HARD_RELATIONS) {
            for (const dep of data.metadata?.relations?.[key] ?? []) {
                if (!dep) continue;
                if (!available.has(dep)) {
                    fail(p.name, `${name}: relations.${key} → '${dep}' (pack '${pack_of.get(dep) ?? '?'}') ` +
                        'is not present after installing this pack and its declared dependencies');
                }
            }
        }
    }
}

fs.rmSync(tmp_root, { recursive: true, force: true });

if (failures.length) {
    console.error(`Solo-install simulation failed (${failures.length}):\n${failures.join('\n')}`);
    process.exit(1);
}
console.log(`OK — each of the ${registry.packs.length} packs is self-contained when installed alone.`);
