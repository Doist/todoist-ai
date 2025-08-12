import { getMcpServer } from './mcp-server'

import { projectsAddOne } from './tools/projects-add-one'
import { projectsDeleteOne } from './tools/projects-delete-one'
import { projectsList } from './tools/projects-list'
import { projectsSearch } from './tools/projects-search'
import { projectsUpdateOne } from './tools/projects-update-one'

import { sectionsAddOne } from './tools/sections-add-one'
import { sectionsDeleteOne } from './tools/sections-delete-one'
import { sectionsSearch } from './tools/sections-search'
import { sectionsUpdateOne } from './tools/sections-update-one'

import { tasksAddMultiple } from './tools/tasks-add-multiple'
import { tasksCompleteMultiple } from './tools/tasks-complete-multiple'
import { tasksDeleteOne } from './tools/tasks-delete-one'
import { tasksListByDate } from './tools/tasks-list-by-date'
import { tasksListForProject } from './tools/tasks-list-for-project'
import { tasksListForSection } from './tools/tasks-list-for-section'
import { tasksListOverdue } from './tools/tasks-list-overdue'
import { tasksOrganizeMultiple } from './tools/tasks-organize-multiple'
import { tasksSearch } from './tools/tasks-search'
import { tasksUpdateOne } from './tools/tasks-update-one'

import { subtasksListForParentTask } from './tools/subtasks-list-for-parent-task'

import { accountOverview } from './tools/account-overview'
import { projectOverview } from './tools/project-overview'
import { tasksListCompleted } from './tools/tasks-list-completed'

const tools = {
    projectsList,
    projectsSearch,
    projectsAddOne,
    projectsUpdateOne,
    projectsDeleteOne,
    sectionsSearch,
    sectionsAddOne,
    sectionsUpdateOne,
    sectionsDeleteOne,
    tasksListByDate,
    tasksDeleteOne,
    tasksCompleteMultiple,
    tasksListForProject,
    tasksListOverdue,
    tasksListCompleted,
    tasksSearch,
    tasksAddMultiple,
    tasksUpdateOne,
    tasksOrganizeMultiple,
    tasksListForSection,
    subtasksListForParentTask,
    accountOverview,
    projectOverview,
}

export { tools, getMcpServer }

export {
    projectsList,
    projectsSearch,
    projectsAddOne,
    projectsUpdateOne,
    projectsDeleteOne,
    sectionsSearch,
    sectionsAddOne,
    sectionsUpdateOne,
    sectionsDeleteOne,
    tasksListByDate,
    tasksDeleteOne,
    tasksCompleteMultiple,
    tasksListForProject,
    tasksListOverdue,
    tasksSearch,
    tasksAddMultiple,
    tasksUpdateOne,
    tasksOrganizeMultiple,
    tasksListForSection,
    subtasksListForParentTask,
    accountOverview,
    projectOverview,
}
