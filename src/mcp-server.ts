import { TodoistApi } from '@doist/todoist-api-typescript'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { registerTool } from './mcp-helpers.js'

// Task management tools
import { addTasks } from './tools/add-tasks.js'
import { completeTasks } from './tools/complete-tasks.js'
import { findCompletedTasks } from './tools/find-completed-tasks.js'
import { findTasksByDate } from './tools/find-tasks-by-date.js'
import { findTasks } from './tools/find-tasks.js'
import { updateTasks } from './tools/update-tasks.js'

// Project management tools
import { addProjects } from './tools/add-projects.js'
import { findProjects } from './tools/find-projects.js'
import { updateProjects } from './tools/update-projects.js'

// Section management tools
import { addSections } from './tools/add-sections.js'
import { findSections } from './tools/find-sections.js'
import { updateSections } from './tools/update-sections.js'

// Comment management tools
import { addComments } from './tools/add-comments.js'
import { findComments } from './tools/find-comments.js'
import { updateComments } from './tools/update-comments.js'

// General tools
import { deleteObject } from './tools/delete-object.js'
import { getOverview } from './tools/get-overview.js'

// Assignment and collaboration tools
import { findProjectCollaborators } from './tools/find-project-collaborators.js'
import { manageAssignments } from './tools/manage-assignments.js'

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

    // Task management tools
    registerTool(addTasks, server, todoist)
    registerTool(completeTasks, server, todoist)
    registerTool(updateTasks, server, todoist)
    registerTool(findTasks, server, todoist)
    registerTool(findTasksByDate, server, todoist)
    registerTool(findCompletedTasks, server, todoist)

    // Project management tools
    registerTool(addProjects, server, todoist)
    registerTool(updateProjects, server, todoist)
    registerTool(findProjects, server, todoist)

    // Section management tools
    registerTool(addSections, server, todoist)
    registerTool(updateSections, server, todoist)
    registerTool(findSections, server, todoist)

    // Comment management tools
    registerTool(addComments, server, todoist)
    registerTool(findComments, server, todoist)
    registerTool(updateComments, server, todoist)

    // General tools
    registerTool(getOverview, server, todoist)
    registerTool(deleteObject, server, todoist)

    // Assignment and collaboration tools
    registerTool(findProjectCollaborators, server, todoist)
    registerTool(manageAssignments, server, todoist)

    return server
}

export { getMcpServer }
