import { TodoistApi } from '@doist/todoist-api-typescript'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp'
import { registerTool } from './mcp-helpers'

import { projectsAddOne } from './tools/projects-add-one'
import { projectsDeleteOne } from './tools/projects-delete-one'
import { projectsList } from './tools/projects-list'
import { projectsUpdateOne } from './tools/projects-update-one'

import { sectionsAddOne } from './tools/sections-add-one'
import { sectionsDeleteOne } from './tools/sections-delete-one'
import { sectionsSearch } from './tools/sections-search'
import { sectionsUpdateOne } from './tools/sections-update-one'

import { overview } from './tools/overview'
import { tasksAddMultiple } from './tools/tasks-add-multiple'
import { tasksCompleteMultiple } from './tools/tasks-complete-multiple'
import { tasksDeleteOne } from './tools/tasks-delete-one'
import { tasksListByDate } from './tools/tasks-list-by-date'
import { tasksListCompleted } from './tools/tasks-list-completed'
import { tasksListForContainer } from './tools/tasks-list-for-container'
import { tasksOrganizeMultiple } from './tools/tasks-organize-multiple'
import { tasksSearch } from './tools/tasks-search'
import { tasksUpdateOne } from './tools/tasks-update-one'

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
    registerTool(tasksUpdateOne, server, todoist)
    registerTool(tasksDeleteOne, server, todoist)
    registerTool(tasksCompleteMultiple, server, todoist)
    registerTool(projectsAddOne, server, todoist)
    registerTool(projectsUpdateOne, server, todoist)
    registerTool(sectionsAddOne, server, todoist)
    registerTool(sectionsUpdateOne, server, todoist)
    registerTool(tasksOrganizeMultiple, server, todoist)
    registerTool(projectsDeleteOne, server, todoist)
    registerTool(sectionsDeleteOne, server, todoist)
    registerTool(sectionsSearch, server, todoist)
    registerTool(overview, server, todoist)
    registerTool(tasksListForContainer, server, todoist)

    return server
}

export { getMcpServer }
