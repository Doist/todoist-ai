import type { TodoistApi } from '@doist/todoist-api-typescript'
import { getToolOutput } from '../mcp-helpers.js'
import type { TodoistTool } from '../todoist-tool.js'
import { ToolNames } from '../utils/tool-names.js'

const ArgsSchema = {}

type UserPlan = 'Todoist Free' | 'Todoist Pro' | 'Todoist Business'

type UserInfoStructured = Record<string, unknown> & {
    type: 'user_info'
    fullName: string
    timezone: string
    currentLocalTime: string
    startDay: number
    startDayName: string
    weekStartDate: string
    weekEndDate: string
    currentWeekNumber: number
    completedToday: number
    dailyGoal: number
    weeklyGoal: number
    email: string
    plan: UserPlan
}

function getUserPlan(user: { isPremium: boolean; businessAccountId?: string | null }): UserPlan {
    if (user.businessAccountId) {
        return 'Todoist Business'
    }
    if (user.isPremium) {
        return 'Todoist Pro'
    }
    return 'Todoist Free'
}

// Helper functions for date and time calculations
function getWeekStartDate(date: Date, startDay: number): Date {
    const currentDay = date.getDay() || 7 // Convert Sunday (0) to 7 for ISO format
    const daysFromStart = (currentDay - startDay + 7) % 7
    const weekStart = new Date(date)
    weekStart.setDate(date.getDate() - daysFromStart)
    return weekStart
}

function getWeekEndDate(weekStart: Date): Date {
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    return weekEnd
}

function getWeekNumber(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1)
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
}

function getDayName(dayNumber: number): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    // Convert ISO day number (1=Monday, 7=Sunday) to array index (0=Sunday, 6=Saturday)
    const index = dayNumber === 7 ? 0 : dayNumber
    return days[index] ?? 'Unknown'
}

function formatDate(date: Date): string {
    return date.toISOString().split('T')[0] ?? ''
}

function formatLocalTime(date: Date, timezone: string): string {
    return date.toLocaleString('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    })
}

async function generateUserInfo(
    client: TodoistApi,
): Promise<{ textContent: string; structuredContent: UserInfoStructured }> {
    // Get user information from Todoist API
    const user = await client.getUser()

    // Parse timezone from user data
    const timezone = user.tzInfo?.timezone ?? 'UTC'

    // Get current time in user's timezone
    const now = new Date()
    const localTime = formatLocalTime(now, timezone)

    // Calculate week information based on user's start day
    const startDay = user.startDay ?? 1 // Default to Monday if not set
    const startDayName = getDayName(startDay)

    // Determine user's plan
    const plan = getUserPlan(user)

    // Create a date object in user's timezone for accurate week calculations
    const userDate = new Date(now.toLocaleString('en-US', { timeZone: timezone }))
    const weekStart = getWeekStartDate(userDate, startDay)
    const weekEnd = getWeekEndDate(weekStart)
    const weekNumber = getWeekNumber(userDate)

    // Generate markdown text content
    const lines: string[] = [
        '# User Information',
        '',
        `**Full Name:** ${user.fullName}`,
        `**Email:** ${user.email}`,
        `**Timezone:** ${timezone}`,
        `**Current Local Time:** ${localTime}`,
        '',
        '## Week Settings',
        `**Week Start Day:** ${startDayName} (${startDay})`,
        `**Current Week:** Week ${weekNumber}`,
        `**Week Start Date:** ${formatDate(weekStart)}`,
        `**Week End Date:** ${formatDate(weekEnd)}`,
        '',
        '## Daily Progress',
        `**Completed Today:** ${user.completedToday}`,
        `**Daily Goal:** ${user.dailyGoal}`,
        `**Weekly Goal:** ${user.weeklyGoal}`,
        '',
        '## Account Info',
        `**Plan:** ${plan}`,
    ]

    const textContent = lines.join('\n')

    // Generate structured content
    const structuredContent: UserInfoStructured = {
        type: 'user_info',
        fullName: user.fullName,
        timezone: timezone,
        currentLocalTime: localTime,
        startDay: startDay,
        startDayName: startDayName,
        weekStartDate: formatDate(weekStart),
        weekEndDate: formatDate(weekEnd),
        currentWeekNumber: weekNumber,
        completedToday: user.completedToday,
        dailyGoal: user.dailyGoal,
        weeklyGoal: user.weeklyGoal,
        email: user.email,
        plan: plan,
    }

    return { textContent, structuredContent }
}

const userInfo = {
    name: ToolNames.USER_INFO,
    description:
        'Get comprehensive user information including full name, email, timezone with current local time, week start day preferences, current week dates, daily/weekly goal progress, and user plan (Free/Pro/Business).',
    parameters: ArgsSchema,
    async execute(_args, client) {
        const result = await generateUserInfo(client)

        return getToolOutput({
            textContent: result.textContent,
            structuredContent: result.structuredContent,
        })
    },
} satisfies TodoistTool<typeof ArgsSchema>

export { userInfo, type UserInfoStructured }
