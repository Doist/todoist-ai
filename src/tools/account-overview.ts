import type { Section, TodoistApi } from '@doist/todoist-api-typescript'
import type { TodoistTool } from '../todoist-tool'
import { type Project, isPersonalProject } from './shared'

const ArgsSchema = {}

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
            childOrder: (p as { childOrder?: number }).childOrder ?? 0,
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

const accountOverview = {
    name: 'account-overview',
    description:
        'Get a Markdown overview of all projects (with hierarchy and sections) and the inbox project. Useful in almost any context before engaging with Todoist further.',
    parameters: ArgsSchema,
    async execute(_args, client) {
        const { results: projects } = await client.getProjects({})
        const inbox = projects.find((p) => isPersonalProject(p) && p.inboxProject === true)
        const nonInbox = projects.filter((p) => !isPersonalProject(p) || p.inboxProject !== true)
        const tree = buildProjectTree(nonInbox)
        const allProjectIds = projects.map((p) => p.id)
        const sectionsByProject = await getSectionsByProject(client, allProjectIds)

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
        return lines.join('\n')
    },
} satisfies TodoistTool<typeof ArgsSchema>

export { accountOverview }
