import { NextResponse } from 'next/server'
import { getProductivityStats } from '@/lib/todoist'
import { format, subDays } from 'date-fns'

export async function GET() {
  try {
    const stats = await getProductivityStats()

    // Build last 7 days from the days_items data
    const today = new Date()
    const days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(today, 6 - i)
      const dateStr = format(date, 'yyyy-MM-dd')
      const dayData = stats.days_items?.find((d) => d.date === dateStr)
      return {
        date: format(date, 'EEE'),
        completed: dayData?.total_completed ?? 0,
      }
    })

    const totalThisWeek = days.reduce((sum, d) => sum + d.completed, 0)
    const avgPerDay = totalThisWeek / 7

    return NextResponse.json({
      days,
      karma: stats.karma,
      dailyGoal: stats.goals?.daily_goal ?? 5,
      weeklyGoal: stats.goals?.weekly_goal ?? 25,
      totalThisWeek,
      avgPerDay,
    })
  } catch (error) {
    console.error('Analytics error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load analytics' },
      { status: 500 },
    )
  }
}
