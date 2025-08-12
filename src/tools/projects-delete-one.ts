import { z } from 'zod'
import type { TodoistTool } from '../todoist-tool'

const ArgsSchema = {
    id: z.string().min(1).describe('The ID of the project to delete.'),
}

const projectsDeleteOne = {
    name: 'projects-delete-one',
    description: 'Delete a project by its ID.',
    parameters: ArgsSchema,
    async execute(args, client) {
        await client.deleteProject(args.id)
        return { success: true }
    },
} satisfies TodoistTool<typeof ArgsSchema>

export { projectsDeleteOne }
