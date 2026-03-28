/**
 * @type {import('semantic-release').GlobalConfig}
 */
export default {
    branches: ['main'],
    plugins: [
        ['@semantic-release/commit-analyzer', { preset: 'conventionalcommits' }],
        ['@semantic-release/release-notes-generator', { preset: 'conventionalcommits' }],
        '@semantic-release/changelog',
        [
            '@semantic-release/exec',
            { prepareCmd: 'npx @biomejs/biome format --write CHANGELOG.md' },
        ],
        '@semantic-release/npm',
        [
            '@semantic-release/git',
            {
                assets: ['CHANGELOG.md', 'package.json', 'package-lock.json'],
                // biome-ignore lint/suspicious/noTemplateCurlyInString: semantic-release template
                message: 'chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}',
            },
        ],
        '@semantic-release/github',
    ],
}
