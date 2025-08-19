import { getMcpServer } from './mcp-server.js'

import { deleteOne } from './tools/delete-one.js'
import { projectsList } from './tools/projects-list.js'
import { projectsManage } from './tools/projects-manage.js'

import { sectionsManage } from './tools/sections-manage.js'
import { sectionsSearch } from './tools/sections-search.js'

import { overview } from './tools/overview.js'
import { tasksAddMultiple } from './tools/tasks-add-multiple.js'
import { tasksCompleteMultiple } from './tools/tasks-complete-multiple.js'
import { tasksListByDate } from './tools/tasks-list-by-date.js'
import { tasksListCompleted } from './tools/tasks-list-completed.js'
import { tasksListForContainer } from './tools/tasks-list-for-container.js'
import { tasksOrganizeMultiple } from './tools/tasks-organize-multiple.js'
import { tasksSearch } from './tools/tasks-search.js'
import { tasksUpdateMultiple } from './tools/tasks-update-multiple.js'

const tools = {
    projectsList,
    projectsManage,
    deleteOne,
    sectionsSearch,
    sectionsManage,
    tasksListByDate,
    tasksListCompleted,
    tasksListForContainer,
    tasksCompleteMultiple,
    tasksSearch,
    tasksAddMultiple,
    tasksUpdateMultiple,
    tasksOrganizeMultiple,
    overview,
}

export { tools, getMcpServer }

export {
    projectsList,
    projectsManage,
    deleteOne,
    sectionsSearch,
    sectionsManage,
    tasksListByDate,
    tasksListForContainer,
    tasksListCompleted,
    tasksCompleteMultiple,
    tasksSearch,
    tasksAddMultiple,
    tasksUpdateMultiple,
    tasksOrganizeMultiple,
    overview,
}
