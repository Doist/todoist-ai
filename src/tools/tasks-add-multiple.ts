import type { Task } from '@doist/todoist-api-typescript'
import { z } from 'zod'
import type { TodoistTool } from '../todoist-tool.js'
import { mapTask } from '../tool-helpers.js'

const TaskSchema = z.object({
    content: z.string().min(1).describe('The content of the task to create.'),
    description: z.string().optional().describe('The description of the task.'),
    priority: z.number().int().min(1).max(4).optional().describe('The priority of the task (1-4).'),
    dueString: z.string().optional().describe('The due date for the task, in natural language.'),
})

const ArgsSchema = {
    projectId: z.string().optional().describe('The project ID to add the tasks to.'),
    sectionId: z.string().optional().describe('The section ID to add the tasks to.'),
    parentId: z.string().optional().describe('The parent task ID (for subtasks).'),
    tasks: z.array(TaskSchema).min(1).describe('The array of tasks to add.'),
}

const tasksAddMultiple = {
    name: 'tasks-add-multiple',
    description: 'Add one or more tasks to a project, section, or parent.',
    parameters: ArgsSchema,
    async execute(args, client) {
        const { projectId, sectionId, parentId, tasks } = args
        const newTasks: Task[] = []
        for (const task of tasks) {
            const taskArgs = { ...task, projectId, sectionId, parentId }
            newTasks.push(await client.addTask(taskArgs))
        }
        return newTasks.map(mapTask)
    },
} satisfies TodoistTool<typeof ArgsSchema>

export { tasksAddMultiple }
