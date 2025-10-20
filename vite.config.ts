import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig({
    plugins: [
        dts({
            include: ['src/**/*'],
            exclude: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
            entryRoot: 'src',
        }),
    ],

    // Build configuration for library mode
    build: {
        lib: {
            // Multiple entry points for CLI and library
            entry: {
                main: resolve(__dirname, 'src/main.ts'),
                index: resolve(__dirname, 'src/index.ts'),
            },
            formats: ['es'], // ESM only (matches package.json "type": "module")
            fileName: (_format, entryName) => `${entryName}.js`,
        },
        rollupOptions: {
            // Externalize dependencies to avoid bundling them
            external: [
                '@modelcontextprotocol/sdk',
                '@doist/todoist-api-typescript',
                'date-fns',
                'dotenv',
                'zod',
                // Node.js built-ins (both forms)
                'node:path',
                'node:fs',
                'node:url',
                'node:process',
                'path',
                'fs',
                'url',
                'process',
                /^node:/,
            ],
            output: {
                // Generate declarations separately
                preserveModules: false,
            },
        },
        target: 'node18', // Target Node.js 18+
        outDir: 'dist',
        emptyOutDir: true,
        sourcemap: false,
        ssr: true, // Server-side rendering mode for Node.js
        minify: false, // Keep readable for debugging
    },

    // Enable ?raw imports for future HTML/CSS template loading
    assetsInclude: ['**/*.html', '**/*.css'],

    // Test configuration with Vitest
    test: {
        globals: true, // Enable global test APIs (describe, it, expect, etc.)
        environment: 'node',
        include: ['src/**/*.{test,spec}.{js,ts}'],
        exclude: ['node_modules', 'dist'],
        coverage: {
            provider: 'v8',
            include: ['src/**/*.ts'],
            exclude: [
                'src/**/*.d.ts',
                'src/main.ts', // Exclude the MCP server entry point
                'src/**/*.test.ts',
                'src/**/*.spec.ts',
            ],
            reporter: ['text', 'json', 'html'],
        },
    },

    // Resolve configuration
    resolve: {
        alias: {
            // Enable clean imports within src/
            '@': resolve(__dirname, 'src'),
        },
    },

    // Ensure proper handling of ESM for Node.js
    esbuild: {
        target: 'node18',
        format: 'esm',
        platform: 'node',
    },
})
