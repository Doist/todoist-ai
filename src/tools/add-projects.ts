import type { PersonalProject, WorkspaceProject } from '@doist/todoist-api-typescript'
import { z } from 'zod'
import type { TodoistTool } from '../todoist-tool.js'
import { mapProject } from '../tool-helpers.js'
import { ColorSchema } from '../utils/colors.js'
import { ProjectSchema as ProjectOutputSchema } from '../utils/output-schemas.js'
import { ToolNames } from '../utils/tool-names.js'

const ProjectSchema = z.object({
    name: z.string().min(1).describe('The name of the project.'),
    parentId: z
        .string()
        .optional()
        .describe('The ID of the parent project. If provided, creates this as a sub-project.'),
    isFavorite: z
        .boolean()
        .optional()
        .describe('Whether the project is a favorite. Defaults to false.'),
    viewStyle: z
        .enum(['list', 'board', 'calendar'])
        .optional()
        .describe('The project view style. Defaults to "list".'),
    color: ColorSchema,
})

const ArgsSchema = {
    projects: z.array(ProjectSchema).min(1).describe('The array of projects to add.'),
}

const OutputSchema = {
    projects: z.array(ProjectOutputSchema).describe('The created projects.'),
    totalCount: z.number().describe('The total number of projects created.'),
}

const addProjects = {
    name: ToolNames.ADD_PROJECTS,
    description: 'Add one or more new projects.',
    parameters: ArgsSchema,
    outputSchema: OutputSchema,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    async execute({ projects }, client) {
        const newProjects = await Promise.all(projects.map((project) => client.addProject(project)))
        const textContent = generateTextContent({ projects: newProjects })
        const mappedProjects = newProjects.map(mapProject)

        return {
            textContent,
            structuredContent: {
                projects: mappedProjects,
                totalCount: mappedProjects.length,
            },
        }
    },
} satisfies TodoistTool<typeof ArgsSchema, typeof OutputSchema>

function generateTextContent({ projects }: { projects: (PersonalProject | WorkspaceProject)[] }) {
    const count = projects.length
    const projectList = projects.map((project) => `• ${project.name} (id=${project.id})`).join('\n')

    const summary = `Added ${count} project${count === 1 ? '' : 's'}:\n${projectList}`

    return summary
}

export { addProjects }
