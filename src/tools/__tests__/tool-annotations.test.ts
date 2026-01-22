import { describe, expect, it, vi } from 'vitest'
import { getMcpServer } from '../../mcp-server.js'
import type { ToolMutability } from '../../todoist-tool.js'
import { ToolNames } from '../../utils/tool-names.js'

// Tool mutability categorization.
// Update this when adding new tools.
const TOOL_MUTABILITY_CATEGORIZATION: Record<string, ToolMutability> = {
    'find-projects': 'readonly',
    'find-tasks': 'readonly',
    'find-tasks-by-date': 'readonly',
    'find-completed-tasks': 'readonly',
    'find-sections': 'readonly',
    'find-comments': 'readonly',
    'find-activity': 'readonly',
    'find-project-collaborators': 'readonly',
    'user-info': 'readonly',
    'get-overview': 'readonly',
    search: 'readonly',
    fetch: 'readonly',
    'fetch-object': 'readonly',
    'add-tasks': 'additive',
    'add-projects': 'additive',
    'add-sections': 'additive',
    'add-comments': 'additive',
    'update-tasks': 'mutating',
    'update-projects': 'mutating',
    'update-sections': 'mutating',
    'update-comments': 'mutating',
    'complete-tasks': 'mutating',
    'delete-object': 'mutating',
    'manage-assignments': 'mutating',
} as const

describe('Tool annotations', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('should have all tools categorized', () => {
        // Ensure all tools from ToolNames are categorized
        expect(Object.values(ToolNames).sort()).toEqual(
            Object.keys(TOOL_MUTABILITY_CATEGORIZATION).sort(),
        )
    })

    it('should register tools with correct mutability', async () => {
        // Spy on registerTool to capture registered tools
        const mcpHelpersModule = await import('../../mcp-helpers.js')
        const registerSpy = vi.spyOn(mcpHelpersModule, 'registerTool')

        // Initialize MCP server (triggers registerTool for all tools)
        await getMcpServer({ todoistApiKey: 'test-token' })

        // Verify each tool has mutability set correctly
        for (const call of registerSpy.mock.calls) {
            const args = call[0] // First argument is the named args object
            const tool = args.tool
            const toolName = tool.name as keyof typeof TOOL_MUTABILITY_CATEGORIZATION
            const expectedMutability = TOOL_MUTABILITY_CATEGORIZATION[toolName]

            // Verify mutability is set on tool
            expect(tool.mutability).toBe(expectedMutability)
        }

        registerSpy.mockRestore()
    })
})
