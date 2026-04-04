'use client'

import { useState } from 'react'
import {
  Sparkles, RefreshCw, AlertCircle, Trophy, Target, TrendingUp,
  CheckCheck, BarChart3, Star, Lightbulb, ArrowRight,
} from 'lucide-react'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { WeeklyReport } from '../api/weekly-review/route'

function SectionTitle({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <Icon className="size-5 text-indigo-400" />
      <h2 className="text-base font-semibold text-slate-200">{title}</h2>
    </div>
  )
}

function ProjectStatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'on_track':
      return <Badge variant="success">On Track</Badge>
    case 'needs_attention':
      return <Badge variant="warning">Needs Attention</Badge>
    case 'blocked':
      return <Badge variant="danger">Blocked</Badge>
    default:
      return <Badge variant="muted">{status}</Badge>
  }
}

export default function WeeklyReviewPage() {
  const [report, setReport] = useState<WeeklyReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function generateReview() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/weekly-review')
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Unknown error')
      }
      setReport(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate review')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Sparkles className="size-6 text-indigo-400" />
            <h1 className="text-2xl font-bold text-slate-100">Weekly Review</h1>
          </div>
          <p className="mt-1 text-slate-500">GTD-style review of your week</p>
        </div>
        <Button onClick={generateReview} loading={loading} size="lg">
          {report ? <RefreshCw className="size-4" /> : <Sparkles className="size-4" />}
          {report ? 'Regenerate' : 'Generate Review'}
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Empty state */}
      {!report && !loading && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 py-24 text-center">
          <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-indigo-600/10">
            <Sparkles className="size-8 text-indigo-400" />
          </div>
          <h2 className="text-lg font-semibold text-slate-200">Ready for your weekly review?</h2>
          <p className="mt-2 max-w-sm text-sm text-slate-500">
            AI will analyze your completed tasks, overdue items, and project health to generate a
            personalized GTD review report.
          </p>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-4">
          <div className="h-24 animate-pulse rounded-xl bg-slate-800/50" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-800/50" />)}
          </div>
          <div className="h-48 animate-pulse rounded-xl bg-slate-800/50" />
          <div className="h-32 animate-pulse rounded-xl bg-slate-800/50" />
        </div>
      )}

      {/* Report content */}
      {report && !loading && (
        <div className="space-y-6">
          {/* Period */}
          <div className="text-sm text-slate-500">
            Week of <span className="text-slate-300 font-medium">{report.weekStart} – {report.weekEnd}</span>
          </div>

          {/* Summary */}
          <Card>
            <p className="text-sm leading-relaxed text-slate-400">{report.summary}</p>
            <p className="mt-4 rounded-lg bg-indigo-600/10 px-4 py-2.5 text-sm font-medium text-indigo-300 italic border border-indigo-500/20">
              ✦ {report.motivationalNote}
            </p>
          </Card>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { label: 'Completed', value: report.stats.completed, icon: CheckCheck, color: 'text-emerald-400' },
              { label: 'Overdue', value: report.stats.overdue, icon: AlertCircle, color: 'text-red-400' },
              { label: 'Completion Rate', value: report.stats.completionRate, icon: TrendingUp, color: 'text-blue-400' },
              { label: 'Karma', value: report.stats.karmaScore.toLocaleString(), icon: Star, color: 'text-amber-400' },
              { label: 'Daily Goal', value: report.stats.dailyGoal, icon: Target, color: 'text-purple-400' },
              { label: 'Best Project', value: report.stats.mostActiveProject, icon: BarChart3, color: 'text-indigo-400' },
            ].map(({ label, value, icon: Icon, color }) => (
              <Card key={label} className="text-center">
                <Icon className={cn('mx-auto mb-2 size-5', color)} />
                <div className="text-lg font-bold text-slate-100 truncate">{value}</div>
                <div className="text-xs text-slate-500">{label}</div>
              </Card>
            ))}
          </div>

          {/* Wins */}
          <Card>
            <SectionTitle icon={Trophy} title="This Week's Wins" />
            <ul className="space-y-2">
              {report.wins.map((win, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-xs font-bold text-emerald-400">
                    {i + 1}
                  </span>
                  <span className="text-sm text-slate-300">{win}</span>
                </li>
              ))}
            </ul>
          </Card>

          {/* Projects + Overdue side by side */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Project highlights */}
            <Card>
              <SectionTitle icon={BarChart3} title="Project Highlights" />
              <div className="space-y-3">
                {report.projectHighlights.map((p) => (
                  <div key={p.name} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-slate-300">{p.name}</div>
                      <div className="text-xs text-slate-500">
                        {p.completed} done · {p.overdue} overdue
                      </div>
                    </div>
                    <ProjectStatusBadge status={p.status} />
                  </div>
                ))}
              </div>
            </Card>

            {/* Overdue analysis */}
            <Card>
              <SectionTitle icon={AlertCircle} title="Overdue Analysis" />
              <p className="text-sm leading-relaxed text-slate-400">{report.overdueAnalysis}</p>
            </Card>
          </div>

          {/* Focus areas for next week */}
          <Card>
            <SectionTitle icon={Target} title="Focus Areas — Next Week" />
            <div className="space-y-4">
              {report.focusAreas.map((area, i) => (
                <div key={i} className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-4">
                  <div className="flex items-center gap-2">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded bg-indigo-600/20 text-xs font-bold text-indigo-400">
                      {i + 1}
                    </span>
                    <span className="text-sm font-semibold text-slate-200">{area.title}</span>
                  </div>
                  <p className="mt-2 text-xs text-slate-400 leading-relaxed">{area.reason}</p>
                  {area.suggestedTasks && area.suggestedTasks.length > 0 && (
                    <ul className="mt-3 space-y-1.5">
                      {area.suggestedTasks.map((task, ti) => (
                        <li key={ti} className="flex items-center gap-2 text-xs text-slate-400">
                          <ArrowRight className="size-3 text-indigo-400 shrink-0" />
                          {task}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Behavioral insights */}
          <Card>
            <SectionTitle icon={Lightbulb} title="Behavioral Insights" />
            <ul className="space-y-3">
              {report.insights.map((insight, i) => (
                <li key={i} className="flex items-start gap-3">
                  <Lightbulb className="mt-0.5 size-4 shrink-0 text-amber-400" />
                  <span className="text-sm text-slate-400 leading-relaxed">{insight}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </div>
  )
}
