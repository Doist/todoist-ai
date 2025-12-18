import { taskListWidget } from 'virtual:todoist-ai-widgets'

type TaskListWidget = {
    fileName: string
    content: string
}

const missingWidget: TaskListWidget = {
    fileName: `task-list-widget.html`,
    content: `<!doctype html>
<html>
  <body>
    <p>Task list widget is missing. Run "npm run build" to generate it.</p>
  </body>
</html>`,
}

function loadTaskListWidget(loadedWidget: TaskListWidget = taskListWidget): TaskListWidget {
    if (!loadedWidget || !loadedWidget.content) {
        return missingWidget
    }

    return loadedWidget
}

export { loadTaskListWidget }
