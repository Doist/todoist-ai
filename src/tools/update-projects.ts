import type { PersonalProject, WorkspaceProject } from '@doist/todoist-api-typescript'
import { z } from 'zod'
import { getToolOutput } from '../mcp-helpers.js'
import type { TodoistTool } from '../todoist-tool.js'
import { formatNextSteps } from '../utils/response-builders.js'
import { ToolNames } from '../utils/tool-names.js'

const { FIND_PROJECTS, FIND_TASKS, GET_OVERVIEW } = ToolNames

const ProjectUpdateSchema = z.object({
    id: z.string().min(1).describe('The ID of the project to update.'),
    name: z.string().min(1).optional().describe('The new name of the project.'),
    isFavorite: z.boolean().optional().describe('Whether the project is a favorite.'),
    viewStyle: z.enum(['list', 'board', 'calendar']).optional().describe('The project view style.'),
})

type ProjectUpdate = z.infer<typeof ProjectUpdateSchema>

const ArgsSchema = {
    projects: z.array(ProjectUpdateSchema).min(1).describe('The projects to update.'),
}

const updateProjects = {
    name: ToolNames.UPDATE_PROJECTS,
    description: 'Update multiple existing projects with new values.',
    parameters: ArgsSchema,
    async execute(args, client) {
        const { projects } = args
        const updateProjectsPromises = projects.map(async (project) => {
            if (!hasUpdatesToMake(project)) {
                return undefined
            }

            const { id, ...updateArgs } = project
            return await client.updateProject(id, updateArgs)
        })

        const updatedProjects = (await Promise.all(updateProjectsPromises)).filter(
            (project): project is PersonalProject | WorkspaceProject => project !== undefined,
        )

        const textContent = generateTextContent({
            projects: updatedProjects,
            args,
        })

        return getToolOutput({
            textContent,
            structuredContent: {
                projects: updatedProjects,
                totalCount: updatedProjects.length,
                updatedProjectIds: updatedProjects.map((project) => project.id),
                appliedOperations: {
                    updateCount: updatedProjects.length,
                    skippedCount: projects.length - updatedProjects.length,
                },
            },
        })
    },
} satisfies TodoistTool<typeof ArgsSchema>

function generateTextContent({
    projects,
    args,
}: {
    projects: (PersonalProject | WorkspaceProject)[]
    args: z.infer<z.ZodObject<typeof ArgsSchema>>
}) {
    const totalRequested = args.projects.length
    const actuallyUpdated = projects.length
    const skipped = totalRequested - actuallyUpdated

    const count = projects.length
    const projectList = projects.map((project) => `• ${project.name} (id=${project.id})`).join('\n')

    let summary = `Updated ${count} project${count === 1 ? '' : 's'}`
    if (skipped > 0) {
        summary += ` (${skipped} skipped - no changes)`
    }

    if (count > 0) {
        summary += `:\n${projectList}`
    }

    // Context-aware next steps for updated projects
    const nextSteps: string[] = []

    if (projects.length > 0) {
        if (count === 1) {
            const project = projects[0]
            if (project) {
                nextSteps.push(
                    `Use ${GET_OVERVIEW} with projectId=${project.id} to see project structure`,
                )
                nextSteps.push(
                    `Use ${FIND_TASKS} with projectId=${project.id} to review existing tasks`,
                )
            }
        } else {
            nextSteps.push(`Use ${FIND_PROJECTS} to see all projects with updated names`)
            nextSteps.push(`Use ${GET_OVERVIEW} to see updated project hierarchy`)
        }
    } else {
        nextSteps.push(`Use ${FIND_PROJECTS} to see current projects`)
    }

    const next = formatNextSteps(nextSteps)
    return `${summary}\n${next}`
}

function hasUpdatesToMake({ id, ...otherUpdateArgs }: ProjectUpdate) {
    return Object.keys(otherUpdateArgs).length > 0
}

export { updateProjects }
