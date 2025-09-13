import { getMcpServer } from './mcp-server.js'
import { addComments } from './tools/add-comments.js'
import { addProjects } from './tools/add-projects.js'
import { addSections } from './tools/add-sections.js'
import { addTasks } from './tools/add-tasks.js'
import { completeTasks } from './tools/complete-tasks.js'
import { deleteObject } from './tools/delete-object.js'
import { findComments } from './tools/find-comments.js'
import { findCompletedTasks } from './tools/find-completed-tasks.js'
import { findProjectCollaborators } from './tools/find-project-collaborators.js'
import { findProjects } from './tools/find-projects.js'
import { findSections } from './tools/find-sections.js'
import { findTasks } from './tools/find-tasks.js'
import { findTasksByDate } from './tools/find-tasks-by-date.js'
import { getOverview } from './tools/get-overview.js'
import { manageAssignments } from './tools/manage-assignments.js'
import { quickAddTask } from './tools/quick-add-task.js'
import { updateComments } from './tools/update-comments.js'
import { updateProjects } from './tools/update-projects.js'
import { updateSections } from './tools/update-sections.js'
import { updateTasks } from './tools/update-tasks.js'
import { userInfo } from './tools/user-info.js'

const tools = {
    quickAddTask,
    addTasks,
    completeTasks,
    updateTasks,
    findTasks,
    findTasksByDate,
    findCompletedTasks,
    // Project management tools
    addProjects,
    updateProjects,
    findProjects,
    // Section management tools
    addSections,
    updateSections,
    findSections,
    // Comment management tools
    addComments,
    updateComments,
    findComments,
    // General tools
    getOverview,
    deleteObject,
    userInfo,
    // Assignment and collaboration tools
    findProjectCollaborators,
    manageAssignments,
}

export { tools, getMcpServer }

export {
    // Task management tools
    quickAddTask,
    addTasks,
    completeTasks,
    updateTasks,
    findTasks,
    findTasksByDate,
    findCompletedTasks,
    // Project management tools
    addProjects,
    updateProjects,
    findProjects,
    // Section management tools
    addSections,
    updateSections,
    findSections,
    // Comment management tools
    addComments,
    updateComments,
    findComments,
    // General tools
    getOverview,
    deleteObject,
    userInfo,
    // Assignment and collaboration tools
    findProjectCollaborators,
    manageAssignments,
}
