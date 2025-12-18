import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { BuildResult } from 'esbuild'
import { build } from 'esbuild'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const PLACEHOLDER = '<!-- INLINE_WIDGET_SCRIPT -->'

type InlineWidget = {
    entryFile: string
    htmlTemplate: string
    outputName: string
}

export type InlineWidgetBuildResult = {
    fileName: string
    content: string
}

export async function buildInlineWidget(
    widget: InlineWidget,
    { buildTimestamp }: { buildTimestamp: string },
): Promise<InlineWidgetBuildResult> {
    const projectRoot = resolve(__dirname, '..')
    const entryPath = join(projectRoot, widget.entryFile)
    const templatePath = join(projectRoot, widget.htmlTemplate)
    const outputFileName = `${widget.outputName}-${buildTimestamp}.html`

    if (!existsSync(templatePath)) {
        throw new Error(`HTML template not found: ${templatePath}`)
    }
    const htmlTemplateContent = readFileSync(templatePath, 'utf-8')
    if (!htmlTemplateContent.includes(PLACEHOLDER)) {
        throw new Error(`Placeholder ${PLACEHOLDER} not found in ${templatePath}`)
    }

    const result: BuildResult = await build({
        entryPoints: [entryPath],
        bundle: true,
        write: false,
        format: 'iife',
        platform: 'browser',
        target: 'es2020',
        minify: true,
        jsx: 'automatic',
        globalName: 'Widget',
        outdir: 'out',
        loader: {
            '.svg': 'dataurl',
        },
    })

    if (!result.outputFiles || result.outputFiles.length === 0) {
        throw new Error(`Failed to build ${widget.entryFile}`)
    }

    const jsFile = result.outputFiles.find((file) => file.path.endsWith('.js'))
    const cssFile = result.outputFiles.find((file) => file.path.endsWith('.css'))

    if (!jsFile) {
        throw new Error(`No JavaScript output found for ${widget.entryFile}`)
    }

    const bundledCode = jsFile.text
    const sanitizedBundledCode = bundledCode
        .replace(/<\/script/gi, '<\\/script')
        .replace(/<!--/g, '<\\!--')

    // Build the inline style tag if CSS exists
    const inlinedStyle = cssFile ? `<style>${cssFile.text}</style>` : ''

    const inlinedScript = `
        ${inlinedStyle}
        <script>
            ${sanitizedBundledCode}
            if (typeof Widget !== 'undefined' && typeof Widget.renderWidget === 'function') {
                Widget.renderWidget();
            }
        </script>
    `
    const finalHtml = htmlTemplateContent.replace(PLACEHOLDER, () => inlinedScript)

    return { fileName: outputFileName, content: finalHtml }
}
