import { TodoistApi } from '@doist/todoist-api-typescript'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp'
import { registerTool } from './mcp-helpers'

import { projectsAddOne } from './tools/projects-add-one'
import { projectsDeleteOne } from './tools/projects-delete-one'
import { projectsList } from './tools/projects-list'
import { projectsSearch } from './tools/projects-search'
import { projectsUpdateOne } from './tools/projects-update-one'

import { sectionsAddOne } from './tools/sections-add-one'
import { sectionsDeleteOne } from './tools/sections-delete-one'
import { sectionsSearch } from './tools/sections-search'
import { sectionsUpdateOne } from './tools/sections-update-one'

import { subtasksListForParentTask } from './tools/subtasks-list-for-parent-task'

import { accountOverview } from './tools/account-overview'
import { projectOverview } from './tools/project-overview'
import { tasksAddMultiple } from './tools/tasks-add-multiple'
import { tasksCompleteMultiple } from './tools/tasks-complete-multiple'
import { tasksDeleteOne } from './tools/tasks-delete-one'
import { tasksListByDate } from './tools/tasks-list-by-date'
import { tasksListForProject } from './tools/tasks-list-for-project'
import { tasksListForSection } from './tools/tasks-list-for-section'
import { tasksListOverdue } from './tools/tasks-list-overdue'
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

    registerTool(tasksListByDate, server, todoist)
    registerTool(tasksListOverdue, server, todoist)
    registerTool(tasksListForProject, server, todoist)
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
    registerTool(subtasksListForParentTask, server, todoist)
    registerTool(tasksListForSection, server, todoist)
    registerTool(projectsDeleteOne, server, todoist)
    registerTool(projectsSearch, server, todoist)
    registerTool(sectionsDeleteOne, server, todoist)
    registerTool(sectionsSearch, server, todoist)
    registerTool(accountOverview, server, todoist)
    registerTool(projectOverview, server, todoist)

    return server
}

export { getMcpServer }
