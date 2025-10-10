import { TodoistApi } from '@doist/todoist-api-typescript'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { SpanStatusCode, trace } from '@opentelemetry/api'
import { registerTool } from './mcp-helpers.js'
import { addComments } from './tools/add-comments.js'
import { addProjects } from './tools/add-projects.js'
import { addSections } from './tools/add-sections.js'
import { addTasks } from './tools/add-tasks.js'
import { completeTasks } from './tools/complete-tasks.js'
import { deleteObject } from './tools/delete-object.js'
import { fetch } from './tools/fetch.js'
import { findComments } from './tools/find-comments.js'
import { findCompletedTasks } from './tools/find-completed-tasks.js'
import { findProjectCollaborators } from './tools/find-project-collaborators.js'
import { findProjects } from './tools/find-projects.js'
import { findSections } from './tools/find-sections.js'
import { findTasks } from './tools/find-tasks.js'
import { findTasksByDate } from './tools/find-tasks-by-date.js'
import { getOverview } from './tools/get-overview.js'
import { manageAssignments } from './tools/manage-assignments.js'
import { search } from './tools/search.js'
import { updateComments } from './tools/update-comments.js'
import { updateProjects } from './tools/update-projects.js'
import { updateSections } from './tools/update-sections.js'
import { updateTasks } from './tools/update-tasks.js'
import { userInfo } from './tools/user-info.js'

const tracer = trace.getTracer('todoist-mcp')

type UnderlyingSetRequestHandler = McpServer['server']['setRequestHandler']
type BoundUnderlyingSetRequestHandler = OmitThisParameter<UnderlyingSetRequestHandler>

export type SetRequestHandlerWithTracing = (
    ...args: Parameters<BoundUnderlyingSetRequestHandler>
) => ReturnType<BoundUnderlyingSetRequestHandler>
type ToolCallRequest = {
    id?: number | string
    params?: { name?: string }
}
type ToolCallExtra = {
    requestInfo?: { headers?: Record<string, string | string[]> }
}

const SAFE_HEADER_ATTRIBUTE_MAP: Record<string, string> = {
    'content-type': 'http.request.header.content_type',
    'user-agent': 'http.request.header.user_agent',
    'x-client-name': 'http.request.header.x_client_name',
    'x-request-id': 'http.request.header.x_request_id',
}

function toHeaderAttributes(
    headers: Record<string, string | string[] | undefined> | undefined,
): Record<string, string> {
    if (!headers) {
        return {}
    }

    const normalized: Record<string, string | string[] | undefined> = {}
    for (const [key, value] of Object.entries(headers)) {
        normalized[key.toLowerCase()] = value
    }

    const headerNames = Object.keys(normalized).sort()

    const attributes: Record<string, string> = {}
    if (headerNames.length > 0) {
        attributes['http.request.header_names'] = headerNames.join(',')
    }

    for (const [headerName, attributeName] of Object.entries(SAFE_HEADER_ATTRIBUTE_MAP)) {
        const value = normalized[headerName]
        if (!value) {
            continue
        }

        const formatted = Array.isArray(value) ? value.join(',') : value
        if (!formatted) {
            continue
        }

        attributes[attributeName] = formatted
    }

    return attributes
}

const instructions = `
## Todoist Task and Project Management Tools

You have access to comprehensive Todoist management tools for personal productivity and team collaboration. Use these tools to help users manage tasks, projects, sections, comments, and assignments effectively.

### Core Capabilities:
- Create, update, complete, and search tasks with rich metadata (priorities, due dates, durations, assignments)
- Manage projects and sections with flexible organization
- Handle comments and collaboration features
- Bulk assignment operations for team workflows
- Get overviews and insights about workload and progress

### Tool Usage Guidelines:

**Task Management:**
- **add-tasks**: Create tasks with content, description, priority (p1=highest, p2=high, p3=medium, p4=lowest/default), dueString (natural language like "tomorrow", "next Friday", "2024-12-25"), duration (formats like "2h", "90m", "2h30m"), and assignments to project collaborators
- **update-tasks**: Modify existing tasks - get task IDs from search results first, only include fields that need changes
- **complete-tasks**: Mark tasks as done using task IDs
- **find-tasks**: Search by text, project/section/parent container, responsible user, or labels. Requires at least one search parameter
- **find-tasks-by-date**: Get tasks by date range (startDate: YYYY-MM-DD or 'today' which includes overdue tasks) or specific day counts
- **find-completed-tasks**: View completed tasks by completion date or original due date

**Project & Organization:**
- **add-projects/update-projects/find-projects**: Manage project lifecycle with names, favorites, and view styles (list/board/calendar)
- **add-sections/update-sections/find-sections**: Organize tasks within projects using sections
- **get-overview**: Get comprehensive Markdown overview of entire account or specific project with task hierarchies

**Collaboration & Comments:**
- **add-comments/update-comments/find-comments**: Manage task and project discussions
- **find-project-collaborators**: Find team members by name or email for assignments
- **manage-assignments**: Bulk assign/unassign/reassign up to 50 tasks with atomic operations and dry-run validation

**General Operations:**
- **delete-object**: Remove projects, sections, tasks, or comments by type and ID
- **user-info**: Get user details including timezone, goals, and plan information

### Best Practices:

1. **Task Creation**: Write clear, actionable task titles. Use natural language for due dates ("tomorrow", "next Monday"). Set appropriate priorities and include detailed descriptions when needed.

2. **Search Strategy**: Use specific search queries combining multiple filters for precise results. When searching for tasks, start with broader queries and narrow down as needed.

3. **Assignments**: Always validate project collaborators exist before assigning tasks. Use find-project-collaborators to verify user access.

4. **Bulk Operations**: When working with multiple items, prefer bulk tools (complete-tasks, manage-assignments) over individual operations for better performance.

5. **Date Handling**: All dates respect user timezone settings. Use 'today' keyword for dynamic date filtering (includes overdue tasks).

6. **Labels**: Use label filtering with AND/OR operators for advanced task organization. Most search tools support labels parameter.

7. **Pagination**: Large result sets use cursor-based pagination. Use limit parameter to control result size (default varies by tool).

8. **Error Handling**: All tools provide detailed error messages and next-step suggestions. Pay attention to validation feedback for corrective actions.

### Common Workflows:

- **Daily Planning**: Use find-tasks-by-date with 'today' and get-overview for project status
- **Team Assignment**: find-project-collaborators → add-tasks with responsibleUser → manage-assignments for bulk changes
- **Task Search**: find-tasks with multiple filters → update-tasks or complete-tasks based on results
- **Project Organization**: add-projects → add-sections → add-tasks with projectId and sectionId
- **Progress Reviews**: find-completed-tasks with date ranges → get-overview for project summaries

Always provide clear, actionable task titles and descriptions. Use the overview tools to give users context about their workload and project status.
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

    instrumentToolRequests(server)

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
    registerTool(userInfo, server, todoist)

    // Assignment and collaboration tools
    registerTool(findProjectCollaborators, server, todoist)
    registerTool(manageAssignments, server, todoist)

    // OpenAI MCP tools
    registerTool(search, server, todoist)
    registerTool(fetch, server, todoist)

    return server
}

function instrumentToolRequests(server: McpServer) {
    const underlyingServer = server.server
    const originalSetRequestHandler = underlyingServer.setRequestHandler.bind(underlyingServer)

    const setRequestHandlerWithTracing: SetRequestHandlerWithTracing = (schema, handler) => {
        const method = schema?.shape?.method?.value

        if (method === 'tools/call') {
            const wrappedHandler: typeof handler = async (request, extra) => {
                const typedRequest = request as ToolCallRequest
                const typedExtra = extra as ToolCallExtra

                if (!typedExtra?.requestInfo) {
                    return handler(request, extra)
                }

                const baseAttributes: Record<string, string> = {
                    'mcp.tool.name': typedRequest.params?.name ?? 'unknown',
                }

                if (typedRequest?.id !== undefined) {
                    baseAttributes['mcp.request.id'] = String(typedRequest.id)
                }

                const clientInfo = underlyingServer.getClientVersion?.()
                if (clientInfo?.name) {
                    baseAttributes['mcp.client.name'] = clientInfo.name
                }
                if (clientInfo?.version) {
                    baseAttributes['mcp.client.version'] = clientInfo.version
                }

                const headerAttributes = toHeaderAttributes(typedExtra.requestInfo.headers)
                Object.assign(baseAttributes, headerAttributes)

                return tracer.startActiveSpan(
                    'mcp.http.request',
                    { attributes: baseAttributes },
                    async (span) => {
                        if (!span) {
                            return handler(request, extra)
                        }

                        try {
                            const result = await handler(request, extra)

                            if (result && typeof result === 'object' && 'isError' in result) {
                                const isError = Boolean((result as { isError?: boolean }).isError)
                                span.setAttribute('mcp.tool.success', !isError)
                                span.setStatus({
                                    code: isError ? SpanStatusCode.ERROR : SpanStatusCode.OK,
                                })
                            } else {
                                span.setAttribute('mcp.tool.success', true)
                                span.setStatus({ code: SpanStatusCode.OK })
                            }

                            return result
                        } catch (error) {
                            span.setAttribute('mcp.tool.success', false)
                            const err = error instanceof Error ? error : new Error(String(error))
                            span.recordException(err)
                            span.setStatus({ code: SpanStatusCode.ERROR, message: err.message })
                            throw error
                        } finally {
                            span.end()
                        }
                    },
                )
            }

            const result = originalSetRequestHandler(schema, wrappedHandler)
            underlyingServer.setRequestHandler = originalSetRequestHandler
            return result
        }

        return originalSetRequestHandler(schema, handler)
    }

    underlyingServer.setRequestHandler = setRequestHandlerWithTracing
}

export { getMcpServer }
