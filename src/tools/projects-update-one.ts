import { z } from 'zod'
import type { TodoistTool } from '../todoist-tool'

const ArgsSchema = {
    id: z.string().min(1).describe('The ID of the project to update.'),
    name: z.string().min(1).describe('The new name for the project.'),
}

const projectsUpdateOne = {
    name: 'projects-update-one',
    description: "Update a project's name by its ID.",
    parameters: ArgsSchema,
    async execute(args, client) {
        const { id, name } = args
        const project = await client.updateProject(id, { name })
        return project
    },
} satisfies TodoistTool<typeof ArgsSchema>

export { projectsUpdateOne }
