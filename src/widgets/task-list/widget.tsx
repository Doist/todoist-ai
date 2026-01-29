import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { z } from 'zod'

import { findTasksByDate } from '../../tools/find-tasks-by-date'
import { Empty } from '../components/empty'
import { Loading } from '../components/loading'
import { initializeOpenAiBridge } from '../open-ai/bridge'
import { useToolOutput } from '../open-ai/hooks'
import { TaskList } from './task-list'
import styles from './task-list.module.css'

initializeOpenAiBridge()

function OpenInTodoistIcon() {
    return (
        <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
        >
            <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M5.02511 4.81798C5.02511 5.09412 5.24897 5.31798 5.52511 5.31798L9.97486 5.31798L4.4291 10.8637C4.25336 11.0395 4.26919 11.3402 4.46445 11.5355C4.65971 11.7308 4.96047 11.7466 5.1362 11.5709L10.682 6.02509L10.682 10.4748C10.682 10.751 10.9058 10.9748 11.182 10.9748C11.4581 10.9748 11.682 10.751 11.682 10.4748V4.81798C11.682 4.54184 11.4581 4.31798 11.182 4.31798L5.52511 4.31798C5.24897 4.31798 5.02511 4.54184 5.02511 4.81798Z"
                fill="currentColor"
            />
        </svg>
    )
}

function OpenInTodoistButton() {
    return (
        <a
            href="https://app.todoist.com/app"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.openInTodoistButton}
        >
            Open in Todoist
            <OpenInTodoistIcon />
        </a>
    )
}

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
        return (
            <>
                <Empty />
                <OpenInTodoistButton />
            </>
        )
    }

    const title = 'Tasks for Today'

    return (
        <div className={styles.widgetContainer}>
            <h1 className={styles.widgetTitle}>{title}</h1>

            <TaskList tasks={tasks} onCompleteTask={optimisticallyCompleteTask} />

            <OpenInTodoistButton />
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
