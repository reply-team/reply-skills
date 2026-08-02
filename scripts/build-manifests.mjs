// Generates the host-specific manifests from packs.json (the host-neutral source of truth):
//
//   Claude Code
//     .claude-plugin/marketplace.json            — one entry per pack
//     plugins/<pack>/.claude-plugin/plugin.json  — pack identity + native dependencies
//
//   Codex
//     .agents/plugins/marketplace.json           — one entry per pack
//     plugins/<pack>/.codex-plugin/plugin.json   — pack identity + skills path + catalog metadata
//
// Usage: npm run build-manifests   (or --check to verify freshness in CI)
//
// Why generated: the dependency graph and pack identity must not be maintained in six
// places. Two hosts can never disagree about names, versions or skills paths, because
// neither manifest is hand-written.

import fs from 'node:fs';
import path from 'node:path';
import { ROOT, read_packs } from './lib.mjs';

const registry = read_packs();
const check = process.argv.includes('--check');

const AUTHOR = { name: 'Reply.io' };
const REPO = 'https://github.com/reply-team/reply-skills';

// ------------------------------------------------------------------ Claude Code

const claude_marketplace = {
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
const claude_plugin = (p) => ({
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

// ------------------------------------------------------------------------ Codex
//
// Shape established by reading the 188 manifests the Codex CLI ships (the bundled
// marketplace plus the official 180-plugin one), because the public docs do not specify
// it. Two things worth not re-deriving:
//
//   * A marketplace entry carries exactly name / source / policy / category. No version,
//     no description, no author — those live in the plugin manifest.
//   * There is NO dependencies field: 0 of 188 manifests declare one. The format cannot
//     express our graph, so install order is the installer's job and is stated explicitly
//     in the README instead of being implied.

const CODEX_SKILLS_PATH = './skills/';

// Codex assigned this policy to our packs when reading the legacy Claude manifest, and
// it is what every bundled plugin uses. Keeping it identical means adding the native
// manifest cannot change install behaviour that already works.
const CODEX_POLICY = { installation: 'AVAILABLE', authentication: 'ON_INSTALL' };

const codex_marketplace = {
    name: registry.marketplace.name,
    interface: { displayName: registry.marketplace.displayName },
    plugins: registry.packs.map(p => ({
        name: p.name,
        source: { source: 'local', path: `./plugins/${p.name}` },
        policy: CODEX_POLICY,
        category: p.presentation.category,
    })),
};

const codex_plugin = (p) => ({
    name: p.name,
    version: p.version,
    description: p.description,
    author: AUTHOR,
    homepage: REPO,
    repository: REPO,
    license: 'MIT',
    keywords: p.keywords,
    skills: CODEX_SKILLS_PATH,
    // `interface` is what a user sees in the plugin catalog. Image fields (logo,
    // composerIcon, brandColor, screenshots) are deliberately absent until brand assets
    // exist. Inventing branding would be worse than an unadorned entry.
    interface: {
        displayName: p.displayName,
        shortDescription: p.presentation.shortDescription,
        longDescription: p.presentation.longDescription,
        developerName: AUTHOR.name,
        category: p.presentation.category,
        capabilities: p.presentation.capabilities,
        defaultPrompt: p.presentation.examplePrompts,
    },
});

// ---------------------------------------------------------------------- emit

const targets = [
    { file: path.join(ROOT, '.claude-plugin', 'marketplace.json'), data: claude_marketplace },
    ...registry.packs.map(p => ({
        file: path.join(ROOT, 'plugins', p.name, '.claude-plugin', 'plugin.json'),
        data: claude_plugin(p),
    })),
    { file: path.join(ROOT, '.agents', 'plugins', 'marketplace.json'), data: codex_marketplace },
    ...registry.packs.map(p => ({
        file: path.join(ROOT, 'plugins', p.name, '.codex-plugin', 'plugin.json'),
        data: codex_plugin(p),
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
    console.log(`Host manifests are up to date (${targets.length} files, 2 hosts).`);
} else {
    console.log(`Wrote ${targets.length} host manifests for ${registry.packs.length} packs across 2 hosts.`);
}
