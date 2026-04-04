'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { BarChart3, TrendingUp, Clock, Target, Loader2, AlertCircle, CheckCheck } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

// Load the recharts-based chart only on the client — it uses browser APIs
const CompletionChart = dynamic(() => import('@/components/ui/completion-chart'), {
  ssr: false,
  loading: () => <div className="h-56 animate-pulse rounded-lg bg-slate-800/50" />,
})

interface Stats {
  days: Array<{ date: string; completed: number }>
  karma: number
  dailyGoal: number
  weeklyGoal: number
  totalThisWeek: number
  avgPerDay: number
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/analytics')
      .then(async (r) => {
        const data = await r.json()
        if (!r.ok) throw new Error(data.error ?? `HTTP ${r.status}`)
        return data
      })
      .then(setStats)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const days = stats?.days ?? []
  const dailyGoal = stats?.dailyGoal ?? 5

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <BarChart3 className="size-6 text-indigo-400" />
          <h1 className="text-2xl font-bold text-slate-100">Life Analytics</h1>
        </div>
        <p className="mt-1 text-slate-500">Productivity patterns from your Todoist data</p>
      </div>

      {loading && (
        <div className="flex items-center gap-3 text-slate-400">
          <Loader2 className="size-5 animate-spin" />
          Loading analytics…
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </div>
      )}

      {stats && (
        <div className="space-y-6">
          {/* KPI row */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { label: 'Tasks This Week', value: stats.totalThisWeek, icon: CheckCheck, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
              { label: 'Daily Average', value: stats.avgPerDay.toFixed(1), icon: TrendingUp, color: 'text-blue-400', bg: 'bg-blue-500/10' },
              { label: 'Daily Goal', value: stats.dailyGoal, icon: Target, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
              { label: 'Karma Score', value: stats.karma.toLocaleString(), icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10' },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <Card key={label} className="flex items-center gap-4">
                <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${bg}`}>
                  <Icon className={`size-5 ${color}`} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-100">{value}</div>
                  <div className="text-xs text-slate-500">{label}</div>
                </div>
              </Card>
            ))}
          </div>

          {/* 7-day bar chart */}
          {days.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Tasks Completed — Last 7 Days</CardTitle>
                <Badge variant={stats.totalThisWeek >= stats.weeklyGoal ? 'success' : 'warning'}>
                  {stats.totalThisWeek}/{stats.weeklyGoal} weekly goal
                </Badge>
              </CardHeader>
              <div className="h-56">
                <CompletionChart days={days} dailyGoal={dailyGoal} />
              </div>
            </Card>
          )}

          {/* Coming soon panels */}
          <div className="grid gap-4 lg:grid-cols-2">
            {[
              { title: 'Circadian Productivity', desc: 'What hour of the day do you complete the most tasks?' },
              { title: 'Overdue Patterns', desc: 'Which projects and task types are most frequently delayed?' },
              { title: 'Task Volume by Project', desc: 'Where is your time and energy actually going?' },
              { title: 'Time Debt Tracker', desc: 'Compare estimated vs actual completion time.' },
            ].map(({ title, desc }) => (
              <Card key={title} className="relative overflow-hidden">
                <div className="opacity-40">
                  <div className="mb-2 text-sm font-semibold text-slate-300">{title}</div>
                  <p className="text-xs text-slate-500">{desc}</p>
                </div>
                <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-slate-900/80 backdrop-blur-sm">
                  <Badge variant="muted">Coming in Phase 3</Badge>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
