import { getMcpServer } from './mcp-server'

import { deleteOne } from './tools/delete-one'
import { projectsAddOne } from './tools/projects-add-one'
import { projectsList } from './tools/projects-list'
import { projectsUpdateOne } from './tools/projects-update-one'

import { sectionsAddOne } from './tools/sections-add-one'
import { sectionsSearch } from './tools/sections-search'
import { sectionsUpdateOne } from './tools/sections-update-one'

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
    projectsAddOne,
    projectsUpdateOne,
    deleteOne,
    sectionsSearch,
    sectionsAddOne,
    sectionsUpdateOne,
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
    projectsAddOne,
    projectsUpdateOne,
    deleteOne,
    sectionsSearch,
    sectionsAddOne,
    sectionsUpdateOne,
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
