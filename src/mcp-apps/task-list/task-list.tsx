import { TaskListItem } from './task-item'
import styles from './task-list.module.css'
import type { PriorityLevel, Task } from './types'

type Props = {
    tasks: Task[]
    onCompleteTask: (taskId: string) => void
}

const PRIORITY_ORDER: Record<PriorityLevel, number> = { p1: 4, p2: 3, p3: 2, p4: 1 }

function sortByPriorityDesc(task1: Task, task2: Task): number {
    const priority1 = PRIORITY_ORDER[task1.priority] ?? 1
    const priority2 = PRIORITY_ORDER[task2.priority] ?? 1
    return priority2 - priority1
}

function TaskList({ tasks, onCompleteTask }: Props) {
    const orderedTasks = [...tasks].sort(sortByPriorityDesc)

    return (
        <ul className={styles.taskList}>
            {orderedTasks.map((task) => (
                <TaskListItem
                    key={task.id}
                    id={task.id}
                    onComplete={onCompleteTask}
                    priority={task.priority}
                    content={task.content}
                />
            ))}
        </ul>
    )
}

export { TaskList }
