import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Plugin, PluginContext } from 'vite'

import { buildInlineWidget, type InlineWidgetBuildResult } from './inline-widget-builder.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

type InlineWidgetConfig = {
    entryFile: string
    htmlTemplate: string
    outputName: string
}

const TASK_LIST_WIDGET: InlineWidgetConfig = {
    entryFile: 'src/widgets/task-list/widget.tsx',
    htmlTemplate: 'src/widgets/task-list/template.html',
    outputName: 'task-list-widget',
}

const WIDGET_SOURCE_PATTERN = /src[\\/]widgets[\\/].+\.(tsx?|css|html|svg)$/
const WIDGET_FILE_EXTENSIONS = /\.(tsx?|css|html|svg)$/
const WIDGET_SOURCE_DIR = 'src/widgets'

function getWidgetSourceFiles(rootDir: string): string[] {
    const widgetsDir = join(rootDir, WIDGET_SOURCE_DIR)
    if (!existsSync(widgetsDir)) {
        return []
    }

    const files: string[] = []
    const entries = readdirSync(widgetsDir, { withFileTypes: true, recursive: true })

    for (const entry of entries) {
        if (entry.isFile() && WIDGET_FILE_EXTENSIONS.test(entry.name)) {
            const parentPath = entry.parentPath ?? entry.path
            files.push(join(parentPath, entry.name))
        }
    }

    return files
}

export function inlineWidgetsVitePlugin(): Plugin {
    let cachedResult: InlineWidgetBuildResult | undefined
    let isWatchMode = false
    let projectRoot: string
    const virtualModuleId = 'virtual:todoist-ai-widgets'
    const resolvedVirtualModuleId = `\0${virtualModuleId}`

    async function rebuildWidget(): Promise<void> {
        const buildTimestamp = process.env.BUILD_TIMESTAMP ?? Date.now().toString()
        cachedResult = await buildInlineWidget(TASK_LIST_WIDGET, { buildTimestamp })
    }

    function writePreviewHtml(): void {
        if (!cachedResult) {
            return
        }

        const previewDir = resolve(projectRoot, 'dist', 'dev')
        if (!existsSync(previewDir)) {
            mkdirSync(previewDir, { recursive: true })
        }

        const previewPath = resolve(previewDir, `${TASK_LIST_WIDGET.outputName}.html`)
        writeFileSync(previewPath, cachedResult.content, 'utf-8')
        console.log(`[widgets] Preview written to ${previewPath}`)
    }

    function addWidgetFilesToWatch(ctx: PluginContext): void {
        const widgetFiles = getWidgetSourceFiles(projectRoot)
        for (const file of widgetFiles) {
            ctx.addWatchFile(file)
        }
        if (widgetFiles.length > 0) {
            console.log(`[widgets] Watching ${widgetFiles.length} widget source files`)
        }
    }

    return {
        name: 'todoist-ai-inline-widgets',
        enforce: 'pre' as const,

        configResolved(config) {
            projectRoot = config.root
            isWatchMode = config.command === 'build' && Boolean(config.build.watch)
        },

        async buildStart() {
            await rebuildWidget()
            addWidgetFilesToWatch(this)
        },

        async watchChange(id) {
            if (WIDGET_SOURCE_PATTERN.test(id)) {
                console.log(`[widgets] Detected change in ${id}, rebuilding...`)
                await rebuildWidget()

                // Write preview HTML in watch mode
                if (isWatchMode) {
                    writePreviewHtml()
                }
            }
        },

        writeBundle() {
            writePreviewHtml()
        },

        resolveId(id: string) {
            if (id === virtualModuleId) {
                return resolvedVirtualModuleId
            }

            return null
        },

        load(id: string) {
            if (id !== resolvedVirtualModuleId || !cachedResult) {
                return null
            }

            const moduleSource = `
                const taskListWidget = ${JSON.stringify(cachedResult)};
                export { taskListWidget };
                export default { taskListWidget };
            `
            return moduleSource
        },
    }
}
