import { AsyncLocalStorage } from 'node:async_hooks'
import { randomUUID } from 'node:crypto'
import { TodoistApi, type CustomFetch, type CustomFetchResponse } from '@doist/todoist-sdk'
import packageJson from '../package.json' with { type: 'json' }

const TODOIST_AI_NAME = 'todoist-ai'
const TODOIST_AI_VERSION = packageJson.version
const SESSION_ID = randomUUID()
const toolContext = new AsyncLocalStorage<string>()

function getUserAgent(): string {
    return `${TODOIST_AI_NAME}/${TODOIST_AI_VERSION}`
}

export function normalizeUsageLabel(label: string): string {
    return label.trim().toLowerCase()
}

export function runWithUsageTrackingContext<T>(label: string, fn: () => T): T {
    return toolContext.run(normalizeUsageLabel(label), fn)
}

export function buildUsageTrackingHeaders(label?: string): Record<string, string> {
    const normalizedLabel = label ? normalizeUsageLabel(label) : toolContext.getStore()

    return {
        'User-Agent': getUserAgent(),
        'doist-platform': 'mcp',
        'doist-version': TODOIST_AI_VERSION,
        'X-TD-Request-Id': randomUUID(),
        'X-TD-Session-Id': SESSION_ID,
        'X-TD-MCP-Tool': normalizedLabel ?? 'unknown',
    }
}

function mergeTodoistHeaders(headersInit?: HeadersInit): Record<string, string> {
    const mergedHeaders = new Headers(headersInit)
    for (const [key, value] of Object.entries(buildUsageTrackingHeaders())) {
        mergedHeaders.set(key, value)
    }
    return Object.fromEntries(mergedHeaders.entries())
}

function toCustomFetchResponse(response: Response): CustomFetchResponse {
    return {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        text: () => response.text(),
        json: () => response.json(),
    }
}

export function createTrackedFetch(baseFetch: typeof fetch = globalThis.fetch): CustomFetch {
    return async (url, options = {}) => {
        const { timeout: timeoutMs, headers, signal, ...rest } = options

        let abortSignal = signal
        if (timeoutMs) {
            const timeoutSignal = AbortSignal.timeout(timeoutMs)
            abortSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal
        }

        const response = await baseFetch(url, {
            ...rest,
            signal: abortSignal,
            headers: mergeTodoistHeaders(headers),
        })

        return toCustomFetchResponse(response)
    }
}

export function createTodoistClient(
    apiKey: string,
    { baseUrl }: { baseUrl?: string } = {},
): TodoistApi {
    return new TodoistApi(apiKey, {
        customFetch: createTrackedFetch(),
        ...(baseUrl ? { baseUrl } : {}),
    })
}

export { TODOIST_AI_VERSION }
