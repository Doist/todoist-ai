declare module 'virtual:todoist-ai-widgets' {
    export type TaskListWidget = {
        fileName: string
        timestamp: string
        content: string
    }

    export const taskListWidget: TaskListWidget
    const defaultExport: { taskListWidget: TaskListWidget }
    export default defaultExport
}
