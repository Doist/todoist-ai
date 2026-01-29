import { App } from '@modelcontextprotocol/ext-apps'

import {
    type OpenAiApi,
    type OpenAiGlobals,
    SET_GLOBALS_EVENT_TYPE,
    SetGlobalsEvent,
    type UnknownObject,
} from './types'

type OpenAiGlobalsShape = OpenAiGlobals<UnknownObject, UnknownObject, UnknownObject, UnknownObject>

type AppToolResult = NonNullable<App['ontoolresult']> extends (params: infer P) => void ? P : never
type AppToolInput = NonNullable<App['ontoolinput']> extends (params: infer P) => void ? P : never
type AppToolInputPartial =
    NonNullable<App['ontoolinputpartial']> extends (params: infer P) => void ? P : never
type AppHostContext =
    NonNullable<App['onhostcontextchanged']> extends (params: infer P) => void ? P : never

type McpHostContext = {
    theme?: 'light' | 'dark'
    locale?: string
    displayMode?: OpenAiGlobalsShape['displayMode']
    platform?: 'mobile' | 'desktop' | 'web' | 'unknown'
    containerDimensions?: { maxHeight?: number; height?: number }
    safeAreaInsets?: { top: number; right: number; bottom: number; left: number }
    deviceCapabilities?: { hover?: boolean; touch?: boolean }
}

let bridgeInitialized = false

function dispatchGlobals(globals: Partial<OpenAiGlobalsShape>) {
    if (typeof window === 'undefined') {
        return
    }

    window.dispatchEvent(
        new SetGlobalsEvent(SET_GLOBALS_EVENT_TYPE, {
            detail: { globals },
        }),
    )
}

function updateOpenAiGlobals(patch: Partial<OpenAiGlobalsShape>) {
    if (typeof window === 'undefined' || !window.openai) {
        return
    }

    Object.assign(window.openai, patch)
    dispatchGlobals(patch)
}

function getDefaultGlobals(): OpenAiGlobalsShape {
    return {
        theme: 'light',
        userAgent: {
            device: { type: 'unknown' },
            capabilities: {
                hover: false,
                touch: typeof navigator !== 'undefined' ? navigator.maxTouchPoints > 0 : false,
            },
        },
        locale: typeof navigator !== 'undefined' ? navigator.language : 'en',
        maxHeight: typeof window !== 'undefined' ? window.innerHeight : 0,
        displayMode: 'inline',
        safeArea: {
            insets: { top: 0, right: 0, bottom: 0, left: 0 },
        },
        toolInput: {},
        toolOutput: null,
        toolResponseMetadata: null,
        widgetState: null,
        setWidgetState: async (state) => {
            updateOpenAiGlobals({ widgetState: state })
        },
    }
}

function mapHostContextToGlobals(context: McpHostContext): Partial<OpenAiGlobalsShape> {
    const patch: Partial<OpenAiGlobalsShape> = {}

    if (context.theme) {
        patch.theme = context.theme
    }

    if (context.locale) {
        patch.locale = context.locale
    }

    if (context.displayMode) {
        patch.displayMode = context.displayMode
    }

    if (context.containerDimensions) {
        patch.maxHeight =
            context.containerDimensions.maxHeight ??
            context.containerDimensions.height ??
            window.innerHeight
    }

    if (context.safeAreaInsets) {
        patch.safeArea = { insets: context.safeAreaInsets }
    }

    if (context.deviceCapabilities || context.platform) {
        patch.userAgent = {
            device: {
                type:
                    context.platform === 'mobile'
                        ? 'mobile'
                        : context.platform === 'desktop' || context.platform === 'web'
                          ? 'desktop'
                          : 'unknown',
            },
            capabilities: {
                hover: context.deviceCapabilities?.hover ?? false,
                touch:
                    context.deviceCapabilities?.touch ??
                    (typeof navigator !== 'undefined' ? navigator.maxTouchPoints > 0 : false),
            },
        }
    }

    return patch
}

type TextContentBlock = { type: 'text'; text: string; mimeType?: string }

function isTextContentBlock(block: unknown): block is TextContentBlock {
    if (!block || typeof block !== 'object') {
        return false
    }

    const candidate = block as TextContentBlock
    return candidate.type === 'text' && typeof candidate.text === 'string'
}

function getContentArray(result: AppToolResult): unknown[] {
    const content = (result as { content?: unknown }).content
    return Array.isArray(content) ? content : []
}

function getStructuredContent(result: AppToolResult): UnknownObject | null {
    const structured = (result as { structuredContent?: unknown }).structuredContent
    if (!structured || typeof structured !== 'object') {
        return null
    }

    return structured as UnknownObject
}

function getToolMeta(result: AppToolResult): UnknownObject | null {
    const meta = (result as { _meta?: unknown })._meta
    if (!meta || typeof meta !== 'object') {
        return null
    }

    return meta as UnknownObject
}

function parseStructuredContent(result: AppToolResult): UnknownObject | null {
    const structured = getStructuredContent(result)
    if (structured) {
        return structured
    }

    const jsonBlock = getContentArray(result).find(
        (block) => isTextContentBlock(block) && block.mimeType === 'application/json',
    ) as TextContentBlock | undefined
    if (!jsonBlock) {
        return null
    }

    try {
        const parsed = JSON.parse(jsonBlock.text)
        if (parsed && typeof parsed === 'object') {
            return parsed as UnknownObject
        }
    } catch (error) {
        console.warn('Failed to parse tool output JSON', error)
    }

    return null
}

function createOpenAiApi(app: App): OpenAiApi {
    return {
        callTool: async (name, args) => {
            const result = await app.callServerTool({
                name,
                arguments: args,
            })
            return { result: JSON.stringify(result) }
        },
        sendFollowUpMessage: async ({ prompt }) => {
            await app.sendMessage({
                role: 'user',
                content: [{ type: 'text', text: prompt }],
            })
        },
        openExternal: ({ href }) => {
            void app.openLink({ url: href })
        },
        requestDisplayMode: async ({ mode }) => {
            return app.requestDisplayMode({ mode })
        },
        requestModal: async () => {
            return null
        },
        requestClose: async () => {
            await app.close()
        },
    }
}

async function initializeMcpBridge() {
    const app = new App({ name: 'todoist-task-list', version: '1.0.0' })

    const initialGlobals = getDefaultGlobals()
    window.openai = {
        ...initialGlobals,
        ...createOpenAiApi(app),
    }
    dispatchGlobals(initialGlobals)

    app.ontoolinput = (notification: AppToolInput) => {
        const args = (notification as { arguments?: UnknownObject }).arguments ?? {}
        updateOpenAiGlobals({ toolInput: args })
    }

    app.ontoolinputpartial = (notification: AppToolInputPartial) => {
        const currentInput = (window.openai?.toolInput ?? {}) as UnknownObject
        const nextInput = {
            ...currentInput,
            ...((notification as { arguments?: UnknownObject }).arguments ?? {}),
        }
        updateOpenAiGlobals({ toolInput: nextInput })
    }

    app.ontoolresult = (notification: AppToolResult) => {
        const structuredContent = parseStructuredContent(notification)
        updateOpenAiGlobals({
            toolOutput: structuredContent,
            toolResponseMetadata: getToolMeta(notification),
        })
    }

    app.onhostcontextchanged = (notification: AppHostContext) => {
        updateOpenAiGlobals(mapHostContextToGlobals(notification as McpHostContext))
    }

    try {
        await app.connect()
        const hostContext = await app.getHostContext()
        updateOpenAiGlobals(mapHostContextToGlobals(hostContext as McpHostContext))
    } catch (error) {
        console.warn('Failed to connect MCP App host', error)
    }
}

export function initializeOpenAiBridge() {
    if (bridgeInitialized || typeof window === 'undefined') {
        return
    }

    bridgeInitialized = true

    if (window.openai) {
        return
    }

    if (window.parent === window) {
        return
    }

    void initializeMcpBridge()
}
