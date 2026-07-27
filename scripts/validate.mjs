// Validates every skill against the contract (docs/skill-contract.md).
// Usage: npm run validate  — exits 1 with a per-skill error list on violations.

import fs from 'node:fs';
import path from 'node:path';
import { skill_dirs, parse_skill_md, CATEGORIES, MATURITIES, STATUSES, RELATION_KEYS } from './lib.mjs';

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SEMVER = /^\d+\.\d+\.\d+$/;

const section_text = (body, heading) => {
    const lines = body.split(/\r?\n/);
    const start = lines.findIndex(l => l.trim() === `## ${heading}`);
    if (start === -1) return null;
    const rest = lines.slice(start + 1);
    const end = rest.findIndex(l => /^## /.test(l));
    return rest.slice(0, end === -1 ? undefined : end).join('\n').trim();
};

const errors = [];
const err = (skill, msg) => errors.push(`  ${skill}: ${msg}`);

const dirs = skill_dirs();
if (dirs.length === 0) {
    console.error('No skills found under plugins/*/skills/');
    process.exit(1);
}

const known_names = new Set(dirs.map(d => d.name));

for (const { name, dir } of dirs) {
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

    if (md.relations && typeof md.relations === 'object') {
        for (const [key, value] of Object.entries(md.relations)) {
            if (!RELATION_KEYS.includes(key)) err(name, `relations key '${key}' not in ${RELATION_KEYS.join('|')}`);
            const list = Array.isArray(value) ? value : [value];
            for (const target of list) {
                if (target && !known_names.has(target)) err(name, `relations.${key} → '${target}' is not a known skill`);
            }
        }
    }

    // Body requirements
    if (section_text(body, 'Purpose') === null) err(name, 'body missing "## Purpose" section');
    if (section_text(body, 'Changelog') === null) err(name, 'body missing "## Changelog" section');
    if (md.maturity === 'production') {
        for (const required of ['Validation', 'Safety']) {
            const text = section_text(body, required);
            if (!text) err(name, `maturity=production requires a non-empty "## ${required}" section`);
        }
    }
    if (md.status === 'deprecated' && !(md.relations?.supersedes?.length || section_text(body, 'Purpose')?.includes('deprecated'))) {
        // soft rule: deprecated skills should say what replaces them
        err(name, 'status=deprecated: point to a successor (relations.supersedes) or explain in Purpose');
    }
}

if (errors.length) {
    console.error(`Skill contract violations (${errors.length}):\n${errors.join('\n')}`);
    process.exit(1);
}
console.log(`OK — ${dirs.length} skills pass the contract.`);
