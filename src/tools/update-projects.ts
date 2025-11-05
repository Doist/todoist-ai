import type { PersonalProject, WorkspaceProject } from '@doist/todoist-api-typescript'
import { z } from 'zod'
import type { TodoistTool } from '../todoist-tool.js'
import { ProjectSchema as ProjectOutputSchema } from '../utils/output-schemas.js'
import { ToolNames } from '../utils/tool-names.js'

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

const OutputSchema = {
    projects: z.array(ProjectOutputSchema).describe('The updated projects.'),
    totalCount: z.number().describe('The total number of projects updated.'),
    updatedProjectIds: z.array(z.string()).describe('The IDs of the updated projects.'),
    appliedOperations: z
        .object({
            updateCount: z.number().describe('The number of projects actually updated.'),
            skippedCount: z.number().describe('The number of projects skipped (no changes).'),
        })
        .describe('Summary of operations performed.'),
}

const updateProjects = {
    name: ToolNames.UPDATE_PROJECTS,
    description: 'Update multiple existing projects with new values.',
    parameters: ArgsSchema,
    outputSchema: OutputSchema,
    async execute(args, client) {
        const { projects } = args
        const updateProjectsPromises = projects.map(async (project) => {
            if (!hasUpdatesToMake(project)) {
                return undefined
            }

            const { id, ...updateArgs } = project
            return await client.updateProject(id, updateArgs)
        })

        const updatedProjects = (await Promise.all(updateProjectsPromises))
            .filter(
                (project): project is PersonalProject | WorkspaceProject => project !== undefined,
            )
            .map((project) => ({
                ...project,
                parentId: 'parentId' in project ? project.parentId : null,
                inboxProject: 'inboxProject' in project ? project.inboxProject : false,
            }))

        const textContent = generateTextContent({
            projects: updatedProjects,
            args,
        })

        return {
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
        }
    },
} satisfies TodoistTool<typeof ArgsSchema, typeof OutputSchema>

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

    return summary
}

function hasUpdatesToMake({ id, ...otherUpdateArgs }: ProjectUpdate) {
    return Object.keys(otherUpdateArgs).length > 0
}

export { updateProjects }
