import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig({
    plugins: [react(), viteSingleFile()],
    root: 'src/mcp-apps/task-list',
    publicDir: false,
    build: {
        outDir: '../../../dist/mcp-apps',
        emptyOutDir: false,
        assetsInlineLimit: 100000000,
        cssCodeSplit: false,
        target: 'es2020',
        rollupOptions: {
            input: 'src/mcp-apps/task-list/index.html',
            output: {
                inlineDynamicImports: true,
            },
        },
    },
})
