import type { Priority } from '../../utils/priorities.js'

export type Task = {
    id: string
    content: string
    priority: Priority
}
