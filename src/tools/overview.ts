import type { Section, TodoistApi } from '@doist/todoist-api-typescript'
import { z } from 'zod'
import { getToolOutput } from '../mcp-helpers.js'
import type { TodoistTool } from '../todoist-tool.js'
import { type Project, isPersonalProject, mapTask } from '../tool-helpers.js'
import { ApiLimits } from '../utils/constants.js'
import { ToolNames } from '../utils/tool-names.js'

const ArgsSchema = {
    projectId: z
        .string()
        .min(1)
        .optional()
        .describe(
            'Optional project ID. If provided, shows detailed overview of that project. If omitted, shows overview of all projects.',
        ),
}

// Types and helpers from account-overview
type ProjectWithChildren = Project & {
    children: ProjectWithChildren[]
    childOrder: number
}

function buildProjectTree(projects: Project[]): Project[] {
    // Sort projects by childOrder, then build a tree
    const byId: Record<string, ProjectWithChildren> = {}
    for (const p of projects) {
        byId[p.id] = {
            ...p,
            children: [],
            childOrder: p.childOrder ?? 0,
        }
    }
    const roots: ProjectWithChildren[] = []
    for (const p of projects) {
        const current = byId[p.id]
        if (!current) continue
        if (isPersonalProject(p) && p.parentId) {
            const parent = byId[p.parentId]
            if (parent) {
                parent.children.push(current)
            } else {
                roots.push(current)
            }
        } else {
            roots.push(current)
        }
    }
    function sortTree(nodes: ProjectWithChildren[]) {
        nodes.sort((a, b) => a.childOrder - b.childOrder)
        for (const n of nodes) {
            sortTree(n.children)
        }
    }
    sortTree(roots)
    return roots
}

async function getSectionsByProject(
    client: TodoistApi,
    projectIds: string[],
): Promise<Record<string, Section[]>> {
    const result: Record<string, Section[]> = {}
    await Promise.all(
        projectIds.map(async (projectId) => {
            const { results } = await client.getSections({ projectId })
            result[projectId] = results
        }),
    )
    return result
}

function renderProjectMarkdown(
    project: ProjectWithChildren,
    sectionsByProject: Record<string, Section[]>,
    indent = '',
): string[] {
    const lines: string[] = []
    lines.push(`${indent}- Project: ${project.name} (id=${project.id})`)
    const sections = sectionsByProject[project.id] || []
    for (const section of sections) {
        lines.push(`${indent}  - Section: ${section.name} (id=${section.id})`)
    }
    for (const child of project.children) {
        lines.push(...renderProjectMarkdown(child, sectionsByProject, `${indent}  `))
    }
    return lines
}

// Types and helpers from project-overview
type MappedTask = ReturnType<typeof mapTask>

type TaskTreeNode = MappedTask & { children: TaskTreeNode[] }

function buildTaskTree(tasks: MappedTask[]): TaskTreeNode[] {
    const byId: Record<string, TaskTreeNode> = {}
    for (const task of tasks) {
        byId[task.id] = { ...task, children: [] }
    }
    const roots: TaskTreeNode[] = []
    for (const task of tasks) {
        const node = byId[task.id]
        if (!node) continue
        if (!task.parentId) {
            roots.push(node)
            continue
        }
        const parent = byId[task.parentId]
        if (parent) {
            parent.children.push(node)
        } else {
            roots.push(node)
        }
    }
    return roots
}

function renderTaskTreeMarkdown(tasks: TaskTreeNode[], indent = ''): string[] {
    const lines: string[] = []
    for (const task of tasks) {
        const idPart = `id=${task.id}`
        const duePart = task.dueDate ? `; due=${task.dueDate}` : ''
        const contentPart = `; content=${task.content}`
        lines.push(`${indent}- ${idPart}${duePart}${contentPart}`)
        if (task.children.length > 0) {
            lines.push(...renderTaskTreeMarkdown(task.children, `${indent}  `))
        }
    }
    return lines
}

type ProjectStructure = {
    id: string
    name: string
    parentId: string | null
    sections: Section[]
    children: ProjectStructure[]
}

type AccountOverviewStructured = Record<string, unknown> & {
    type: 'account_overview'
    inbox: {
        id: string
        name: string
        sections: Section[]
    } | null
    projects: ProjectStructure[]
    totalProjects: number
    totalSections: number
    hasNestedProjects: boolean
}

interface ProjectOverviewStructured extends Record<string, unknown> {
    type: 'project_overview'
    project: {
        id: string
        name: string
    }
    sections: Section[]
    tasks: Array<ReturnType<typeof mapTask> & { children: never[] }>
    stats: {
        totalTasks: number
        totalSections: number
        tasksWithoutSection: number
    }
}

function buildProjectStructure(
    project: ProjectWithChildren,
    sectionsByProject: Record<string, Section[]>,
): ProjectStructure {
    return {
        id: project.id,
        name: project.name,
        parentId: isPersonalProject(project) ? (project.parentId ?? null) : null,
        sections: sectionsByProject[project.id] || [],
        children: project.children.map((child) => buildProjectStructure(child, sectionsByProject)),
    }
}

async function getAllTasksForProject(client: TodoistApi, projectId: string): Promise<MappedTask[]> {
    let allTasks: MappedTask[] = []
    let cursor: string | undefined = undefined
    do {
        const { results, nextCursor } = await client.getTasks({
            projectId,
            limit: ApiLimits.TASKS_BATCH_SIZE,
            cursor: cursor ?? undefined,
        })
        allTasks = allTasks.concat(results.map(mapTask))
        cursor = nextCursor ?? undefined
    } while (cursor)
    return allTasks
}

async function getProjectSections(client: TodoistApi, projectId: string): Promise<Section[]> {
    const { results } = await client.getSections({ projectId })
    return results
}

async function generateAccountOverview(
    client: TodoistApi,
): Promise<{ textContent: string; structuredContent: AccountOverviewStructured }> {
    const { results: projects } = await client.getProjects({})
    const inbox = projects.find((p) => isPersonalProject(p) && p.inboxProject === true)
    const nonInbox = projects.filter((p) => !isPersonalProject(p) || p.inboxProject !== true)
    const tree = buildProjectTree(nonInbox)
    const allProjectIds = projects.map((p) => p.id)
    const sectionsByProject = await getSectionsByProject(client, allProjectIds)

    // Generate markdown text content
    const lines: string[] = ['# Personal Projects', '']
    if (inbox) {
        lines.push(`- Inbox Project: ${inbox.name} (id=${inbox.id})`)
        for (const section of sectionsByProject[inbox.id] || []) {
            lines.push(`  - Section: ${section.name} (id=${section.id})`)
        }
    }
    if (tree.length) {
        for (const project of tree as ProjectWithChildren[]) {
            lines.push(...renderProjectMarkdown(project, sectionsByProject))
        }
    } else {
        lines.push('_No projects found._')
    }
    lines.push('')
    // Add explanation about nesting if there are nested projects
    const hasNested = (tree as ProjectWithChildren[]).some((p) => p.children.length > 0)
    if (hasNested) {
        lines.push(
            '_Note: Indentation indicates that a project is a sub-project of the one above it. This allows for organizing projects hierarchically, with parent projects containing related sub-projects._',
            '',
        )
    }
    const textContent = lines.join('\n')

    // Generate structured content
    const structuredContent = {
        type: 'account_overview' as const,
        inbox: inbox
            ? {
                  id: inbox.id,
                  name: inbox.name,
                  sections: sectionsByProject[inbox.id] || [],
              }
            : null,
        projects: tree.map((project) =>
            buildProjectStructure(project as ProjectWithChildren, sectionsByProject),
        ),
        totalProjects: projects.length,
        totalSections: allProjectIds.reduce(
            (total, id) => total + (sectionsByProject[id]?.length || 0),
            0,
        ),
        hasNestedProjects: hasNested,
    }

    return { textContent, structuredContent }
}

async function generateProjectOverview(
    client: TodoistApi,
    projectId: string,
): Promise<{ textContent: string; structuredContent: ProjectOverviewStructured }> {
    const project: Project = await client.getProject(projectId)
    const sections = await getProjectSections(client, projectId)
    const allTasks = await getAllTasksForProject(client, projectId)

    // Group tasks by sectionId
    const tasksBySection: Record<string, MappedTask[]> = {}
    for (const section of sections) {
        tasksBySection[section.id] = []
    }
    const tasksWithoutSection: MappedTask[] = []
    for (const task of allTasks) {
        const sectionTasks = task.sectionId
            ? (tasksBySection[task.sectionId] ?? tasksWithoutSection)
            : tasksWithoutSection
        sectionTasks.push(task)
    }

    // Generate markdown text content
    const lines: string[] = [`# ${project.name}`]
    if (tasksWithoutSection.length > 0) {
        lines.push('')
        const tree = buildTaskTree(tasksWithoutSection)
        lines.push(...renderTaskTreeMarkdown(tree))
    }
    for (const section of sections) {
        lines.push('')
        lines.push(`## ${section.name}`)
        const sectionTasks = tasksBySection[section.id]
        if (!sectionTasks?.length) {
            continue
        }
        const tree = buildTaskTree(sectionTasks)
        lines.push(...renderTaskTreeMarkdown(tree))
    }
    const textContent = lines.join('\n')

    // Generate structured content
    const structuredContent = {
        type: 'project_overview' as const,
        project: {
            id: project.id,
            name: project.name,
        },
        sections: sections,
        tasks: allTasks.map((task) => ({
            ...task,
            children: [], // Tasks already include hierarchical info via parentId
        })),
        stats: {
            totalTasks: allTasks.length,
            totalSections: sections.length,
            tasksWithoutSection: tasksWithoutSection.length,
        },
    }

    return { textContent, structuredContent }
}

const overview = {
    name: ToolNames.OVERVIEW,
    description:
        'Get a Markdown overview. If no projectId is provided, shows all projects with hierarchy and sections (useful for navigation). If projectId is provided, shows detailed overview of that specific project including all tasks grouped by sections.',
    parameters: ArgsSchema,
    async execute(args, client) {
        const result = args.projectId
            ? await generateProjectOverview(client, args.projectId)
            : await generateAccountOverview(client)

        return getToolOutput({
            textContent: result.textContent,
            structuredContent: result.structuredContent,
        })
    },
} satisfies TodoistTool<typeof ArgsSchema>

export { overview, type AccountOverviewStructured, type ProjectOverviewStructured }
