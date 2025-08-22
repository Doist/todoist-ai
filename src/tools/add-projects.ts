import type { PersonalProject, WorkspaceProject } from '@doist/todoist-api-typescript'
import { z } from 'zod'
import { getToolOutput } from '../mcp-helpers.js'
import type { TodoistTool } from '../todoist-tool.js'
import { formatNextSteps } from '../utils/response-builders.js'
import { ToolNames } from '../utils/tool-names.js'

const { ADD_SECTIONS, ADD_TASKS, FIND_PROJECTS, GET_OVERVIEW } = ToolNames

const ProjectSchema = z.object({
    name: z.string().min(1).describe('The name of the project.'),
    isFavorite: z
        .boolean()
        .optional()
        .describe('Whether the project is a favorite. Defaults to false.'),
    viewStyle: z
        .enum(['list', 'board', 'calendar'])
        .optional()
        .describe('The project view style. Defaults to "list".'),
})

const ArgsSchema = {
    projects: z.array(ProjectSchema).min(1).describe('The array of projects to add.'),
}

const addProjects = {
    name: ToolNames.ADD_PROJECTS,
    description: 'Add one or more new projects.',
    parameters: ArgsSchema,
    async execute({ projects }, client) {
        const newProjects = await Promise.all(projects.map((project) => client.addProject(project)))
        const textContent = generateTextContent({ projects: newProjects })

        return getToolOutput({
            textContent,
            structuredContent: {
                projects: newProjects,
                totalCount: newProjects.length,
            },
        })
    },
} satisfies TodoistTool<typeof ArgsSchema>

function generateTextContent({
    projects,
}: {
    projects: (PersonalProject | WorkspaceProject)[]
}) {
    const count = projects.length
    const projectList = projects.map((project) => `• ${project.name} (id=${project.id})`).join('\n')

    const summary = `Added ${count} project${count === 1 ? '' : 's'}:\n${projectList}`

    // Context-aware next steps for new projects
    const nextSteps: string[] = []

    if (count === 1) {
        const project = projects[0]
        if (project) {
            nextSteps.push(`Use ${ADD_SECTIONS} to organize new project with sections`)
            nextSteps.push(`Use ${ADD_TASKS} to add your first tasks to this project`)
            nextSteps.push(
                `Use ${GET_OVERVIEW} with projectId=${project.id} to see project structure`,
            )
        }
    } else {
        nextSteps.push(`Use ${ADD_SECTIONS} to organize these projects with sections`)
        nextSteps.push(`Use ${ADD_TASKS} to add tasks to these projects`)
        nextSteps.push(`Use ${FIND_PROJECTS} to see all projects including the new ones`)
        nextSteps.push(`Use ${GET_OVERVIEW} to see updated project hierarchy`)
    }

    const next = formatNextSteps(nextSteps)
    return `${summary}\n${next}`
}

export { addProjects }
