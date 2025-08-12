import { getMcpServer } from './mcp-server'

import { deleteOne } from './tools/delete-one'
import { projectsList } from './tools/projects-list'
import { projectsManage } from './tools/projects-manage'

import { sectionsManage } from './tools/sections-manage'
import { sectionsSearch } from './tools/sections-search'

import { overview } from './tools/overview'
import { tasksAddMultiple } from './tools/tasks-add-multiple'
import { tasksCompleteMultiple } from './tools/tasks-complete-multiple'
import { tasksListByDate } from './tools/tasks-list-by-date'
import { tasksListCompleted } from './tools/tasks-list-completed'
import { tasksListForContainer } from './tools/tasks-list-for-container'
import { tasksOrganizeMultiple } from './tools/tasks-organize-multiple'
import { tasksSearch } from './tools/tasks-search'
import { tasksUpdateOne } from './tools/tasks-update-one'

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
    tasksUpdateOne,
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
    tasksUpdateOne,
    tasksOrganizeMultiple,
    overview,
}
