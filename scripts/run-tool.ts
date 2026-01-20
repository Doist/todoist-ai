#!/usr/bin/env npx tsx
/**
 * Run any Todoist tool directly without going through MCP.
 *
 * Usage:
 *   npx tsx scripts/run-tool.ts <tool-name> '<json-args>'
 *   npx tsx scripts/run-tool.ts <tool-name> --file <args.json>
 *   npx tsx scripts/run-tool.ts --list
 *
 * Examples:
 *   npx tsx scripts/run-tool.ts add-tasks '{"tasks":[{"content":"Test task","order":1}]}'
 *   npx tsx scripts/run-tool.ts find-tasks '{"query":"meeting"}'
 *   npx tsx scripts/run-tool.ts get-overview '{}'
 *
 * Requires TODOIST_API_KEY in .env file (and optionally TODOIST_BASE_URL).
 */
import { readFileSync } from 'node:fs'
import { TodoistApi } from '@doist/todoist-api-typescript'
import { config } from 'dotenv'
import type { TodoistTool } from '../src/todoist-tool.js'
import { addComments } from '../src/tools/add-comments.js'
import { addProjects } from '../src/tools/add-projects.js'
import { addSections } from '../src/tools/add-sections.js'
import { addTasks } from '../src/tools/add-tasks.js'
import { completeTasks } from '../src/tools/complete-tasks.js'
import { deleteObject } from '../src/tools/delete-object.js'
import { fetch } from '../src/tools/fetch.js'
import { fetchObject } from '../src/tools/fetch-object.js'
import { findActivity } from '../src/tools/find-activity.js'
import { findComments } from '../src/tools/find-comments.js'
import { findCompletedTasks } from '../src/tools/find-completed-tasks.js'
import { findProjectCollaborators } from '../src/tools/find-project-collaborators.js'
import { findProjects } from '../src/tools/find-projects.js'
import { findSections } from '../src/tools/find-sections.js'
import { findTasks } from '../src/tools/find-tasks.js'
import { findTasksByDate } from '../src/tools/find-tasks-by-date.js'
import { getOverview } from '../src/tools/get-overview.js'
import { manageAssignments } from '../src/tools/manage-assignments.js'
import { search } from '../src/tools/search.js'
import { updateComments } from '../src/tools/update-comments.js'
import { updateProjects } from '../src/tools/update-projects.js'
import { updateSections } from '../src/tools/update-sections.js'
import { updateTasks } from '../src/tools/update-tasks.js'
import { userInfo } from '../src/tools/user-info.js'

config()

// biome-ignore lint/suspicious/noExplicitAny: tools have varying schemas
const tools: Record<string, TodoistTool<any, any>> = {
    'add-tasks': addTasks,
    'add-projects': addProjects,
    'add-sections': addSections,
    'add-comments': addComments,
    'complete-tasks': completeTasks,
    'delete-object': deleteObject,
    fetch: fetch,
    'fetch-object': fetchObject,
    'find-activity': findActivity,
    'find-comments': findComments,
    'find-completed-tasks': findCompletedTasks,
    'find-project-collaborators': findProjectCollaborators,
    'find-projects': findProjects,
    'find-sections': findSections,
    'find-tasks': findTasks,
    'find-tasks-by-date': findTasksByDate,
    'get-overview': getOverview,
    'manage-assignments': manageAssignments,
    search: search,
    'update-comments': updateComments,
    'update-projects': updateProjects,
    'update-sections': updateSections,
    'update-tasks': updateTasks,
    'user-info': userInfo,
}

function printUsage() {
    console.log(`
Usage:
  npx tsx scripts/run-tool.ts <tool-name> '<json-args>'
  npx tsx scripts/run-tool.ts <tool-name> --file <args.json>
  npx tsx scripts/run-tool.ts --list

Available tools:
${Object.keys(tools)
    .sort()
    .map((name) => `  - ${name}`)
    .join('\n')}
`)
}

async function main() {
    const args = process.argv.slice(2)

    if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
        printUsage()
        process.exit(0)
    }

    if (args[0] === '--list') {
        console.log('Available tools:')
        for (const name of Object.keys(tools).sort()) {
            const tool = tools[name]
            console.log(`\n${name}:`)
            console.log(`  ${tool.description}`)
        }
        process.exit(0)
    }

    const toolName = args[0]
    const tool = tools[toolName]

    if (!tool) {
        console.error(`Unknown tool: ${toolName}`)
        console.error(`Available tools: ${Object.keys(tools).sort().join(', ')}`)
        process.exit(1)
    }

    let jsonArgs: string
    if (args[1] === '--file') {
        if (!args[2]) {
            console.error('--file requires a path argument')
            process.exit(1)
        }
        jsonArgs = readFileSync(args[2], 'utf-8')
    } else {
        jsonArgs = args[1] || '{}'
    }

    let parsedArgs: unknown
    try {
        parsedArgs = JSON.parse(jsonArgs)
    } catch (e) {
        console.error('Invalid JSON args:', e)
        process.exit(1)
    }

    const apiKey = process.env.TODOIST_API_KEY
    if (!apiKey) {
        console.error('TODOIST_API_KEY not found in environment or .env file')
        process.exit(1)
    }

    const baseUrl = process.env.TODOIST_BASE_URL
    const client = new TodoistApi(apiKey, baseUrl ? { baseUrl } : undefined)

    console.log(`Running ${toolName} with args:`)
    console.log(JSON.stringify(parsedArgs, null, 2))
    console.log('---')

    try {
        const result = await tool.execute(parsedArgs, client)

        if (result.textContent) {
            console.log('\nText output:')
            console.log(result.textContent)
        }

        if (result.structuredContent) {
            console.log('\nStructured output:')
            console.log(JSON.stringify(result.structuredContent, null, 2))
        }
    } catch (error) {
        console.error('Tool execution failed:', error)
        process.exit(1)
    }
}

main()
