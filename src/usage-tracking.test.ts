import { getDefaultDispatcher } from '@doist/todoist-sdk'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
    buildUsageTrackingHeaders,
    createTrackedFetch,
    runWithUsageTrackingContext,
} from './usage-tracking.js'

vi.mock('@doist/todoist-sdk', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@doist/todoist-sdk')>()
    return {
        ...actual,
        getDefaultDispatcher: vi.fn(() => Promise.resolve(undefined)),
    }
})

const getDefaultDispatcherMock = vi.mocked(getDefaultDispatcher)

function createJsonResponse(body: unknown = { ok: true }): Response {
    return new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'content-type': 'application/json' },
    })
}

describe('usage tracking', () => {
    it('builds mcp tracking headers with tool metadata', () => {
        const headers = runWithUsageTrackingContext('Find-Tasks', () => buildUsageTrackingHeaders())

        expect(headers['User-Agent']).toMatch(/^todoist-ai\/\d+\.\d+\.\d+$/)
        expect(headers['doist-platform']).toBe('mcp')
        expect(headers['doist-version']).toMatch(/^\d+\.\d+\.\d+$/)
        expect(headers['X-TD-Request-Id']).toBeTruthy()
        expect(headers['X-TD-Session-Id']).toBeTruthy()
        expect(headers['X-TD-MCP-Tool']).toBe('find-tasks')
    })

    it('falls back to unknown when no tool context is set', () => {
        expect(buildUsageTrackingHeaders()['X-TD-MCP-Tool']).toBe('unknown')
    })

    it('injects tracking headers into sdk custom fetch requests', async () => {
        const captured: RequestInit[] = []
        const trackedFetch = createTrackedFetch(async (_url, options) => {
            captured.push(options ?? {})
            return createJsonResponse()
        })

        const response = await runWithUsageTrackingContext('find-tasks', async () => {
            await trackedFetch('https://api.todoist.com/api/v1/tasks', {
                method: 'GET',
                headers: { Authorization: 'Bearer token' },
            })

            return trackedFetch('https://api.todoist.com/api/v1/tasks', {
                method: 'GET',
                headers: { Authorization: 'Bearer token' },
            })
        })

        expect(captured).toHaveLength(2)
        const [firstRequest, secondRequest] = captured
        expect(firstRequest).toBeDefined()
        expect(secondRequest).toBeDefined()
        if (!firstRequest || !secondRequest) {
            throw new Error('tracked fetch did not capture both requests')
        }

        const firstHeaders = firstRequest.headers as Record<string, string>
        const secondHeaders = secondRequest.headers as Record<string, string>

        expect(firstHeaders.authorization).toBe('Bearer token')
        expect(firstHeaders['doist-platform']).toBe('mcp')
        expect(firstHeaders['doist-version']).toMatch(/^\d+\.\d+\.\d+$/)
        expect(firstHeaders['x-td-mcp-tool']).toBe('find-tasks')
        expect(firstHeaders['x-td-session-id']).toBe(secondHeaders['x-td-session-id'])
        expect(firstHeaders['x-td-request-id']).not.toBe(secondHeaders['x-td-request-id'])
        expect(response.ok).toBe(true)
    })

    it('isolates concurrent tool contexts', async () => {
        const capturedTools: string[] = []
        const trackedFetch = createTrackedFetch(async (_url, options) => {
            const headers = options?.headers as Record<string, string>
            const toolName = headers['x-td-mcp-tool']
            if (!toolName) {
                throw new Error('tracked fetch did not include the MCP tool header')
            }
            capturedTools.push(toolName)
            return createJsonResponse()
        })

        await Promise.all([
            runWithUsageTrackingContext('find-tasks', async () => {
                await new Promise((resolve) => setTimeout(resolve, 10))
                await trackedFetch('https://api.todoist.com/api/v1/tasks')
            }),
            runWithUsageTrackingContext('update-tasks', async () => {
                await trackedFetch('https://api.todoist.com/api/v1/tasks')
            }),
        ])

        expect(capturedTools.sort()).toEqual(['find-tasks', 'update-tasks'])
    })

    it('maps sdk timeouts to abort signals', async () => {
        let captured: RequestInit | undefined
        const trackedFetch = createTrackedFetch(async (_url, options) => {
            captured = options
            return createJsonResponse()
        })

        await trackedFetch('https://api.todoist.com/api/v1/tasks', {
            method: 'GET',
            timeout: 250,
        })

        expect(captured?.signal).toBeInstanceOf(AbortSignal)
        expect(captured?.signal?.aborted).toBe(false)

        await new Promise((resolve) => setTimeout(resolve, 300))

        expect(captured?.signal?.aborted).toBe(true)
    })

    describe('proxy dispatcher injection', () => {
        afterEach(() => {
            getDefaultDispatcherMock.mockReset()
            getDefaultDispatcherMock.mockResolvedValue(undefined)
        })

        it('attaches the env proxy dispatcher when createTrackedFetch uses native fetch', async () => {
            const fakeDispatcher = { kind: 'env-http-proxy-agent' } as unknown as NonNullable<
                Awaited<ReturnType<typeof getDefaultDispatcher>>
            >
            getDefaultDispatcherMock.mockResolvedValue(fakeDispatcher)

            let captured: RequestInit | undefined
            const originalFetch = globalThis.fetch
            globalThis.fetch = (async (_url: RequestInfo | URL, options?: RequestInit) => {
                captured = options
                return createJsonResponse()
            }) as typeof fetch

            try {
                const trackedFetch = createTrackedFetch()
                await trackedFetch('https://api.todoist.com/api/v1/tasks', { method: 'GET' })
            } finally {
                globalThis.fetch = originalFetch
            }

            expect(getDefaultDispatcherMock).toHaveBeenCalled()
            expect(captured).toBeTruthy()
            expect((captured as unknown as { dispatcher?: unknown }).dispatcher).toBe(
                fakeDispatcher,
            )
        })

        it('does not attach a dispatcher when createTrackedFetch is given a stub', async () => {
            let captured: RequestInit | undefined
            const trackedFetch = createTrackedFetch(async (_url, options) => {
                captured = options
                return createJsonResponse()
            })

            await trackedFetch('https://api.todoist.com/api/v1/tasks', { method: 'GET' })

            expect(getDefaultDispatcherMock).not.toHaveBeenCalled()
            expect(captured).toBeTruthy()
            expect((captured as unknown as { dispatcher?: unknown }).dispatcher).toBeUndefined()
        })
    })

    it('combines sdk timeouts with existing abort signals', async () => {
        const abortController = new AbortController()

        let captured: RequestInit | undefined
        const trackedFetch = createTrackedFetch(async (_url, options) => {
            captured = options
            return createJsonResponse()
        })

        await trackedFetch('https://api.todoist.com/api/v1/tasks', {
            method: 'GET',
            signal: abortController.signal,
            timeout: 250,
        })

        expect(captured?.signal).toBeInstanceOf(AbortSignal)
        expect(captured?.signal).not.toBe(abortController.signal)
        expect(captured?.signal?.aborted).toBe(false)

        abortController.abort()

        expect(captured?.signal?.aborted).toBe(true)
    })
})
