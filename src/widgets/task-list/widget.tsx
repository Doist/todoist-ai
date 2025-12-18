import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { z } from 'zod'

import { findTasksByDate } from '../../tools/find-tasks-by-date'
import { Empty } from '../components/empty'
import { Loading } from '../components/loading'
import { useToolOutput } from '../open-ai/hooks'
import { TaskList } from './task-list'
import styles from './task-list.module.css'

function TaskListWidget() {
    const output = useToolOutput()
    const [tasks, setTasks] = useState<
        z.infer<typeof findTasksByDate.outputSchema.tasks> | undefined
    >(output?.tasks)

    useEffect(
        function syncOutputToLocalState() {
            setTasks(output?.tasks)
        },
        [output?.tasks],
    )

    function optimisticallyCompleteTask(taskId: string): void {
        setTasks((previousTasks) => previousTasks?.filter((task) => task.id !== taskId))
    }

    if (!tasks) {
        return <Loading />
    }

    if (tasks.length === 0) {
        return <Empty />
    }

    const title = 'Tasks for Today'

    return (
        <div className={styles.widgetContainer}>
            <h1 className={styles.widgetTitle}>{title}</h1>

            <TaskList tasks={tasks} onCompleteTask={optimisticallyCompleteTask} />
        </div>
    )
}

// Render function to be called by the inlined script
export function renderWidget(): void {
    const rootElement = document.getElementById('react-root')
    if (!rootElement) {
        throw new Error('Root element not found')
    }

    const root = createRoot(rootElement)
    root.render(<TaskListWidget />)
}
