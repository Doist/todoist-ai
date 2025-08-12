import { z } from 'zod'
import type { TodoistTool } from '../todoist-tool'

const ArgsSchema = {
    type: z.enum(['project', 'section', 'task']).describe('The type of entity to delete.'),
    id: z.string().min(1).describe('The ID of the entity to delete.'),
}

const deleteOne = {
    name: 'delete-one',
    description: 'Delete a project, section, or task by its ID.',
    parameters: ArgsSchema,
    async execute(args, client) {
        switch (args.type) {
            case 'project':
                await client.deleteProject(args.id)
                break
            case 'section':
                await client.deleteSection(args.id)
                break
            case 'task':
                await client.deleteTask(args.id)
                break
        }
        return { success: true }
    },
} satisfies TodoistTool<typeof ArgsSchema>

export { deleteOne }
