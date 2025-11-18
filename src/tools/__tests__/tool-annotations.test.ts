import { describe, expect, it, vi } from 'vitest'
import { getMcpServer } from '../../mcp-server.js'
import { ToolNames } from '../../utils/tool-names.js'

// Tool read-only or read-write categorization.
// Update this when adding new tools.
// true = read-only, false = read-write
const TOOL_READ_ONLY_CATEGORIZATION = {
    'find-projects': true,
    'find-tasks': true,
    'find-tasks-by-date': true,
    'find-completed-tasks': true,
    'find-sections': true,
    'find-comments': true,
    'find-activity': true,
    'find-project-collaborators': true,
    'user-info': true,
    'get-overview': true,
    search: true,
    fetch: true,
    'add-tasks': false,
    'update-tasks': false,
    'complete-tasks': false,
    'add-projects': false,
    'update-projects': false,
    'add-sections': false,
    'update-sections': false,
    'add-comments': false,
    'update-comments': false,
    'delete-object': false,
    'manage-assignments': false,
} as const

describe('Tool annotations', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('should have all tools categorized', () => {
        // Ensure all tools from ToolNames are categorized
        expect(Object.values(ToolNames).sort()).toEqual(
            Object.keys(TOOL_READ_ONLY_CATEGORIZATION).sort(),
        )
    })

    it('should register tools with correct readOnlyHint annotations', async () => {
        // Spy on registerTool to capture registered tools
        const mcpHelpersModule = await import('../../mcp-helpers.js')
        const registerSpy = vi.spyOn(mcpHelpersModule, 'registerTool')

        // Initialize MCP server (triggers registerTool for all tools)
        await getMcpServer({ todoistApiKey: 'test-token' })

        // Verify each tool's annotation matches its categorization
        for (const call of registerSpy.mock.calls) {
            const tool = call[0] // First argument is the tool object
            const toolName = tool.name as keyof typeof TOOL_READ_ONLY_CATEGORIZATION
            const expectedReadOnly = TOOL_READ_ONLY_CATEGORIZATION[toolName]
            const hasReadOnlyHint = tool.annotations?.readOnlyHint === true

            expect(hasReadOnlyHint).toBe(expectedReadOnly)
        }
    })
})
