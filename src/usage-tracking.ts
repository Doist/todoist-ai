import { AsyncLocalStorage } from 'node:async_hooks'
import { randomUUID } from 'node:crypto'
import {
    type CustomFetch,
    type CustomFetchResponse,
    getDefaultDispatcher,
    TodoistApi,
} from '@doist/todoist-sdk'
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

async function attachDispatcher(options: RequestInit): Promise<void> {
    const dispatcher = await getDefaultDispatcher()
    if (dispatcher !== undefined) {
        // @ts-expect-error - dispatcher is a valid option for Node's fetch but not in the TS types
        options.dispatcher = dispatcher
    }
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
    // Only attach the EnvHttpProxyAgent dispatcher when running through the
    // real native fetch. Test stubs pass an explicit `baseFetch` and don't
    // need (or understand) the dispatcher option.
    const useDispatcher = baseFetch === globalThis.fetch
    return async (url, options = {}) => {
        const { timeout: timeoutMs, headers, signal, ...rest } = options

        let abortSignal = signal
        if (timeoutMs) {
            const timeoutSignal = AbortSignal.timeout(timeoutMs)
            abortSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal
        }

        const fetchOptions: RequestInit = {
            ...rest,
            signal: abortSignal,
            headers: mergeTodoistHeaders(headers),
        }
        if (useDispatcher) {
            await attachDispatcher(fetchOptions)
        }

        const response = await baseFetch(url, fetchOptions)
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
