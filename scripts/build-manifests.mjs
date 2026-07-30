// Generates the host-specific manifests from packs.json (the host-neutral source of truth):
//   .claude-plugin/marketplace.json            — one entry per pack
//   plugins/<pack>/.claude-plugin/plugin.json  — pack identity + native dependencies
//
// Usage: npm run build-manifests   (or --check to verify freshness in CI)
//
// Why generated: the dependency graph must not be maintained in four places. When a
// second host is added (Codex — REPLY-51541) its manifests are emitted from here too,
// so the two hosts can never disagree about names, versions or dependencies.

import fs from 'node:fs';
import path from 'node:path';
import { ROOT, read_packs } from './lib.mjs';

const registry = read_packs();
const check = process.argv.includes('--check');

const AUTHOR = { name: 'Reply.io' };
const REPO = 'https://github.com/reply-team/reply-skills';

const marketplace = {
    name: registry.marketplace.name,
    description: registry.marketplace.description,
    owner: registry.marketplace.owner,
    plugins: registry.packs.map(p => ({
        name: p.name,
        source: `./plugins/${p.name}`,
        description: p.description,
        version: p.version,
        author: AUTHOR,
    })),
};

// Claude Code resolves `dependencies` as an array of pack names within the same
// marketplace — verified by install, not by manifest validation (which accepts
// several spellings without discriminating between them).
const plugin_manifest = (p) => ({
    name: p.name,
    displayName: p.displayName,
    description: p.description,
    version: p.version,
    author: AUTHOR,
    homepage: REPO,
    repository: REPO,
    license: 'MIT',
    keywords: p.keywords,
    ...(p.dependencies.length ? { dependencies: p.dependencies } : {}),
});

const targets = [
    { file: path.join(ROOT, '.claude-plugin', 'marketplace.json'), data: marketplace },
    ...registry.packs.map(p => ({
        file: path.join(ROOT, 'plugins', p.name, '.claude-plugin', 'plugin.json'),
        data: plugin_manifest(p),
    })),
];

const stale = [];
for (const { file, data } of targets) {
    const text = JSON.stringify(data, null, 2) + '\n';
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

if (check) {
    if (stale.length) {
        console.error(
            `Host manifests are stale (${stale.length}):\n${stale.map(f => `  ${f}`).join('\n')}\n` +
            'Run `npm run build-manifests` and commit the result.'
        );
        process.exit(1);
    }
    console.log(`Host manifests are up to date (${targets.length} files).`);
} else {
    console.log(`Wrote ${targets.length} host manifests for ${registry.packs.length} packs.`);
}
