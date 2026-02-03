import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { getMcpServer } from '../../mcp-server.js'
import { ToolNames } from '../../utils/tool-names.js'

type ToolExpectation = {
    name: string
    title: string
    readOnlyHint: boolean
    destructiveHint: boolean
    idempotentHint: boolean
}

const TOOL_EXPECTATIONS: ToolExpectation[] = [
    {
        name: ToolNames.ADD_TASKS,
        title: 'Todoist: Add Tasks',
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
    },
    {
        name: ToolNames.COMPLETE_TASKS,
        title: 'Todoist: Complete Tasks',
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
    },
    {
        name: ToolNames.UPDATE_TASKS,
        title: 'Todoist: Update Tasks',
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
    },
    {
        name: ToolNames.FIND_TASKS,
        title: 'Todoist: Find Tasks',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
    },
    {
        name: ToolNames.FIND_TASKS_BY_DATE,
        title: 'Todoist: Find Tasks By Date',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
    },
    {
        name: ToolNames.FIND_COMPLETED_TASKS,
        title: 'Todoist: Find Completed Tasks',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
    },
    {
        name: ToolNames.ADD_PROJECTS,
        title: 'Todoist: Add Projects',
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
    },
    {
        name: ToolNames.UPDATE_PROJECTS,
        title: 'Todoist: Update Projects',
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
    },
    {
        name: ToolNames.FIND_PROJECTS,
        title: 'Todoist: Find Projects',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
    },
    {
        name: ToolNames.ADD_SECTIONS,
        title: 'Todoist: Add Sections',
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
    },
    {
        name: ToolNames.UPDATE_SECTIONS,
        title: 'Todoist: Update Sections',
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
    },
    {
        name: ToolNames.FIND_SECTIONS,
        title: 'Todoist: Find Sections',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
    },
    {
        name: ToolNames.ADD_COMMENTS,
        title: 'Todoist: Add Comments',
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
    },
    {
        name: ToolNames.UPDATE_COMMENTS,
        title: 'Todoist: Update Comments',
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
    },
    {
        name: ToolNames.FIND_COMMENTS,
        title: 'Todoist: Find Comments',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
    },
    {
        name: ToolNames.FIND_PROJECT_COLLABORATORS,
        title: 'Todoist: Find Project Collaborators',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
    },
    {
        name: ToolNames.MANAGE_ASSIGNMENTS,
        title: 'Todoist: Manage Assignments',
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
    },
    {
        name: ToolNames.FIND_ACTIVITY,
        title: 'Todoist: Find Activity',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
    },
    {
        name: ToolNames.GET_OVERVIEW,
        title: 'Todoist: Get Overview',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
    },
    {
        name: ToolNames.DELETE_OBJECT,
        title: 'Todoist: Delete Object',
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
    },
    {
        name: ToolNames.FETCH_OBJECT,
        title: 'Todoist: Fetch Object',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
    },
    {
        name: ToolNames.USER_INFO,
        title: 'Todoist: User Info',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
    },
    {
        name: ToolNames.LIST_WORKSPACES,
        title: 'Todoist: List Workspaces',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
    },
    {
        name: ToolNames.SEARCH,
        title: 'Todoist: Search',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
    },
    {
        name: ToolNames.FETCH,
        title: 'Todoist: Fetch',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
    },
]

describe('Tool annotations', () => {
    const registered: Map<string, { annotations?: unknown }> = new Map()

    beforeAll(() => {
        const registerToolSpy = vi.spyOn(McpServer.prototype, 'registerTool')
        getMcpServer({ todoistApiKey: 'test-token' })

        const calls = registerToolSpy.mock.calls as unknown as Array<[unknown, unknown]>
        for (const call of calls) {
            const name = call[0]
            const toolSpec = call[1]
            if (typeof name !== 'string') continue
            if (!toolSpec || typeof toolSpec !== 'object') continue

            registered.set(name, toolSpec as { annotations?: unknown })
        }

        registerToolSpy.mockRestore()
    })

    it('should cover all tools', () => {
        expect(Object.values(ToolNames).sort()).toEqual(TOOL_EXPECTATIONS.map((t) => t.name).sort())
    })

    describe.each(TOOL_EXPECTATIONS)('$name', (toolExpectation) => {
        it('should have correct MCP ToolAnnotations', () => {
            const toolSpec = registered.get(toolExpectation.name)
            expect(toolSpec).toBeDefined()

            const annotations = toolSpec?.annotations as Record<string, unknown> | undefined
            expect(annotations).toBeDefined()

            expect(annotations).toMatchObject({
                title: toolExpectation.title,
                openWorldHint: false,
                readOnlyHint: toolExpectation.readOnlyHint,
                destructiveHint: toolExpectation.destructiveHint,
                idempotentHint: toolExpectation.idempotentHint,
            })
        })
    })
})
