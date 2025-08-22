import { getMcpServer } from './mcp-server.js'

// Task management tools
import { addTasks } from './tools/add-tasks.js'
import { completeTasks } from './tools/complete-tasks.js'
import { findCompletedTasks } from './tools/find-completed-tasks.js'
import { findTasksByDate } from './tools/find-tasks-by-date.js'
import { findTasks } from './tools/find-tasks.js'
import { updateTasks } from './tools/update-tasks.js'

// Project management tools
import { addProjects } from './tools/add-projects.js'
import { findProjects } from './tools/find-projects.js'
import { updateProjects } from './tools/update-projects.js'

// Section management tools
import { addSections } from './tools/add-sections.js'
import { findSections } from './tools/find-sections.js'
import { updateSections } from './tools/update-sections.js'

// General tools
import { deleteObject } from './tools/delete-object.js'
import { getOverview } from './tools/get-overview.js'

const tools = {
    // Task management tools
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
    // General tools
    getOverview,
    deleteObject,
}

export { tools, getMcpServer }

export {
    // Task management tools
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
    // General tools
    getOverview,
    deleteObject,
}
