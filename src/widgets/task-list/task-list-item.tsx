import DOMPurify from 'dompurify'
import { useCallback, useMemo } from 'react'
import snarkdown from 'snarkdown'
import styles from './task-list-item.module.css'

type PriorityLevel = 'p1' | 'p2' | 'p3' | 'p4'

type Props = {
    id: string
    onComplete: (taskId: string) => void
    priority: PriorityLevel
    content: string
}

function CheckBox({ priority, onClick }: { priority: PriorityLevel; onClick: () => void }) {
    const priorityClass = { p1: 'priority1', p2: 'priority2', p3: 'priority3', p4: 'priority4' }[
        priority
    ]

    return (
        <button
            type="button"
            className={`${styles.checkbox} ${styles[priorityClass]}`}
            onClick={onClick}
        >
            <span className={styles.checkboxBackground} />
            <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className={styles.checkmark}
                role="img"
                aria-label="Checkbox"
            >
                <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M16.5056 9.00958C16.2128 8.71668 15.7379 8.71668 15.445 9.00958L10.6715 13.7831L8.72649 11.8381C8.43359 11.5452 7.95872 11.5452 7.66583 11.8381C7.37294 12.1309 7.37293 12.6058 7.66583 12.8987L10.1407 15.3736C10.297 15.5299 10.5051 15.6028 10.7097 15.5923C10.8889 15.5833 11.0655 15.5104 11.2023 15.3735L16.5056 10.0702C16.7985 9.77735 16.7985 9.30247 16.5056 9.00958Z"
                    fill="currentColor"
                />
            </svg>
            <span className={styles.checkboxBorder} />
        </button>
    )
}

function TaskContent({ content }: { content: string }) {
    const sanitizedHtml = useMemo(
        function parseMarkdown() {
            const html = snarkdown(content)
            const sanitized = DOMPurify.sanitize(html, {
                ALLOWED_TAGS: ['strong', 'em', 'a', 'code', 'del', 's'],
                ALLOWED_ATTR: ['href'],
            })
            return sanitized.replace(/<a /g, '<a target="_blank" rel="noopener noreferrer" ')
        },
        [content],
    )

    return (
        <div
            className={styles.taskContent}
            // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized with DOMPurify
            dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
        />
    )
}

function TaskListItem({ onComplete, id, priority, content }: Props) {
    const handleComplete = useCallback(
        function handleComplete() {
            if (typeof window?.openai?.callTool === 'function') {
                window.openai.callTool('complete-tasks', { ids: [id] })
            }
            onComplete(id)
        },
        [onComplete, id],
    )

    return (
        <li className={styles.taskListItem}>
            <CheckBox priority={priority} onClick={handleComplete} />
            <TaskContent content={content} />
        </li>
    )
}

export { TaskListItem }
