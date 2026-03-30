import { convertPriorityToNumber } from '../../utils/priorities.js'
import { TaskListItem } from './task-item'
import styles from './task-list.module.css'
import type { Task } from './types'

type Props = {
    tasks: Task[]
    onCompleteTask: (taskId: string) => void
}

function sortByPriorityDesc(task1: Task, task2: Task): number {
    const priority1 = convertPriorityToNumber(task1.priority)
    const priority2 = convertPriorityToNumber(task2.priority)
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
