import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { afterEach, describe, expect, it, vi } from 'vitest'

describe('registerTaskListApp', () => {
    afterEach(() => {
        vi.restoreAllMocks()
        vi.resetModules()
    })

    it('registers the real task list HTML when imported from source', async () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
        const registerResourceSpy = vi.spyOn(McpServer.prototype, 'registerResource')
        const { registerTaskListApp, taskListResourceUri } = await import('./resources.js')

        const server = new McpServer({ name: 'test-server', version: '1.0.0' })
        registerTaskListApp(server)

        expect(consoleErrorSpy).not.toHaveBeenCalled()
        expect(registerResourceSpy).toHaveBeenCalledTimes(1)

        const readCallback = registerResourceSpy.mock.calls[0]?.[3] as
            | (() => Promise<{ contents: Array<{ uri: string; text: string }> }>)
            | undefined

        expect(readCallback).toBeDefined()
        if (!readCallback) {
            throw new Error('registerResource callback was not captured')
        }

        const result = await readCallback()

        expect(result.contents).toHaveLength(1)
        expect(result.contents[0]?.uri).toBe(taskListResourceUri)
        expect(result.contents[0]?.text).toContain('<div id="root"></div>')
        expect(result.contents[0]?.text).toContain(
            '<script type="module" src="/main.tsx"></script>',
        )
    })
})
