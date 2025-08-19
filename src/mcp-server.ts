import { TodoistApi } from '@doist/todoist-api-typescript'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { registerTool } from './mcp-helpers.js'

import { deleteOne } from './tools/delete-one.js'
import { projectsList } from './tools/projects-list.js'
import { projectsManage } from './tools/projects-manage.js'

import { sectionsManage } from './tools/sections-manage.js'
import { sectionsSearch } from './tools/sections-search.js'

import { overview } from './tools/overview.js'
import { tasksAddMultiple } from './tools/tasks-add-multiple.js'
import { tasksCompleteMultiple } from './tools/tasks-complete-multiple.js'
import { tasksListByDate } from './tools/tasks-list-by-date.js'
import { tasksListCompleted } from './tools/tasks-list-completed.js'
import { tasksListForContainer } from './tools/tasks-list-for-container.js'
import { tasksSearch } from './tools/tasks-search.js'
import { tasksUpdateMultiple } from './tools/tasks-update-multiple.js'

const instructions = `
Tools to help you manage your todoist tasks.
`

/**
 * Create the MCP server.
 * @param todoistApiKey - The API key for the todoist account.
 * @param baseUrl - The base URL for the todoist API.
 * @returns the MCP server.
 */
function getMcpServer({ todoistApiKey, baseUrl }: { todoistApiKey: string; baseUrl?: string }) {
    const server = new McpServer(
        { name: 'todoist-mcp-server', version: '0.1.0' },
        {
            capabilities: {
                tools: { listChanged: true },
            },
            instructions,
        },
    )

    const todoist = new TodoistApi(todoistApiKey, baseUrl)

    registerTool(tasksListCompleted, server, todoist)
    registerTool(tasksListByDate, server, todoist)
    registerTool(tasksSearch, server, todoist)
    registerTool(projectsList, server, todoist)
    registerTool(tasksAddMultiple, server, todoist)
    registerTool(tasksUpdateMultiple, server, todoist)
    registerTool(deleteOne, server, todoist)
    registerTool(tasksCompleteMultiple, server, todoist)
    registerTool(projectsManage, server, todoist)
    registerTool(sectionsManage, server, todoist)
    registerTool(sectionsSearch, server, todoist)
    registerTool(overview, server, todoist)
    registerTool(tasksListForContainer, server, todoist)

    return server
}

export { getMcpServer }
