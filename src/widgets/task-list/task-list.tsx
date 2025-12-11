import { z } from 'zod'

import { findTasksByDate } from '../../tools/find-tasks-by-date'
import { convertPriorityToNumber } from '../../utils/priorities'
import styles from './task-list.module.css'
import { TaskListItem } from './task-list-item'

import '../main.css'

type Task = z.infer<typeof findTasksByDate.outputSchema.tasks>[number]
type Props = {
    tasks: Task[]
    onCompleteTask: (taskId: string) => void
}

function sortByPriorityDesc(task1: Task, task2: Task): number {
    const numericPriority1 = convertPriorityToNumber(task1.priority)
    const numericPriority2 = convertPriorityToNumber(task2.priority)
    return numericPriority2 - numericPriority1
}

function TaskList({ tasks, onCompleteTask }: Props) {
    return (
        <ul className={styles.taskList}>
            {tasks.toSorted(sortByPriorityDesc).map((task) => (
                <TaskListItem
                    key={task.id}
                    id={task.id}
                    onComplete={onCompleteTask}
                    priority={task.priority ?? 'p4'}
                    content={task.content}
                />
            ))}
        </ul>
    )
}

export { TaskList }
