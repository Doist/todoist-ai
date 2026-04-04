'use client'

import { useState } from 'react'
import {
  Brain, RefreshCw, AlertCircle, Trash2, Archive, Calendar,
  Clock, Scissors, CheckCircle2, Copy, Zap, ThumbsUp, ThumbsDown,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn, priorityBg } from '@/lib/utils'
import type { ChiefOfStaffReport, SuggestionAction, TaskSuggestion } from '../api/chief-of-staff/route'

const ACTION_META: Record<SuggestionAction, { label: string; icon: React.ElementType; color: string }> = {
  delete: { label: 'Delete', icon: Trash2, color: 'text-red-400' },
  archive: { label: 'Archive', icon: Archive, color: 'text-amber-400' },
  reschedule_next_week: { label: 'Next Week', icon: Calendar, color: 'text-blue-400' },
  reschedule_someday: { label: 'Someday', icon: Clock, color: 'text-purple-400' },
  break_into_subtasks: { label: 'Break Down', icon: Scissors, color: 'text-indigo-400' },
  keep: { label: 'Keep', icon: CheckCircle2, color: 'text-emerald-400' },
}

function SuggestionCard({
  suggestion,
  onApprove,
  onDismiss,
  approved,
  dismissed,
}: {
  suggestion: TaskSuggestion
  onApprove: () => void
  onDismiss: () => void
  approved: boolean
  dismissed: boolean
}) {
  const meta = ACTION_META[suggestion.action]
  const Icon = meta.icon

  return (
    <div className={cn(
      'rounded-xl border p-4 transition-all',
      approved && 'border-emerald-500/30 bg-emerald-500/5 opacity-60',
      dismissed && 'border-slate-700/30 bg-slate-800/20 opacity-40',
      !approved && !dismissed && 'border-slate-700 bg-slate-900/60',
    )}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn('text-sm font-medium', dismissed ? 'text-slate-500 line-through' : 'text-slate-200')}>
              {suggestion.content}
            </span>
            <span className={cn('inline-flex items-center rounded-full border px-1.5 py-0.5 text-xs', priorityBg(suggestion.priority))}>
              {suggestion.priority}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>{suggestion.projectName}</span>
            {suggestion.daysSinceDue !== null && suggestion.daysSinceDue > 0 && (
              <span className="text-red-400">{suggestion.daysSinceDue}d overdue</span>
            )}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <Icon className={cn('size-3.5 shrink-0', meta.color)} />
            <span className={cn('text-xs font-medium', meta.color)}>{meta.label}</span>
            <span className="text-xs text-slate-500">— {suggestion.reason}</span>
          </div>
          {suggestion.newDueDate && (
            <div className="mt-1 text-xs text-blue-400">→ Move to {suggestion.newDueDate}</div>
          )}
        </div>

        {/* Action buttons */}
        {!approved && !dismissed && (
          <div className="flex shrink-0 gap-2">
            <button
              onClick={onApprove}
              className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
              title="Approve suggestion"
            >
              <ThumbsUp className="size-3.5" />
            </button>
            <button
              onClick={onDismiss}
              className="flex size-7 items-center justify-center rounded-lg bg-slate-800 text-slate-500 hover:bg-slate-700 transition-colors"
              title="Dismiss suggestion"
            >
              <ThumbsDown className="size-3.5" />
            </button>
          </div>
        )}
        {approved && <CheckCircle2 className="size-5 shrink-0 text-emerald-400" />}
      </div>
    </div>
  )
}

export default function ChiefOfStaffPage() {
  const [report, setReport] = useState<ChiefOfStaffReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [approved, setApproved] = useState<Set<string>>(new Set())
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [applying, setApplying] = useState(false)
  const [applyResult, setApplyResult] = useState<string | null>(null)

  async function runAnalysis() {
    setLoading(true)
    setError(null)
    setApproved(new Set())
    setDismissed(new Set())
    setApplyResult(null)
    try {
      const res = await fetch('/api/chief-of-staff')
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Unknown error')
      }
      setReport(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to run analysis')
    } finally {
      setLoading(false)
    }
  }

  async function applyApproved() {
    if (!report) return
    const toApply = report.suggestions.filter((s) => approved.has(s.taskId))
    if (toApply.length === 0) return

    setApplying(true)
    try {
      const res = await fetch('/api/chief-of-staff/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suggestions: toApply }),
      })
      if (!res.ok) throw new Error('Apply failed')
      const data = await res.json()
      setApplyResult(`Applied ${data.applied} actions successfully.`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to apply actions')
    } finally {
      setApplying(false)
    }
  }

  const approvedCount = approved.size
  const pendingCount = report ? report.suggestions.filter((s) => !approved.has(s.taskId) && !dismissed.has(s.taskId)).length : 0

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Brain className="size-6 text-indigo-400" />
            <h1 className="text-2xl font-bold text-slate-100">Chief of Staff</h1>
          </div>
          <p className="mt-1 text-slate-500">AI triage for your overdue and stale tasks</p>
        </div>
        <div className="flex items-center gap-3">
          {approvedCount > 0 && (
            <Button onClick={applyApproved} loading={applying} variant="secondary">
              <CheckCircle2 className="size-4" />
              Apply {approvedCount} Actions
            </Button>
          )}
          <Button onClick={runAnalysis} loading={loading} size="lg">
            {report ? <RefreshCw className="size-4" /> : <Brain className="size-4" />}
            {report ? 'Re-run Analysis' : 'Run Analysis'}
          </Button>
        </div>
      </div>

      {/* Apply result */}
      {applyResult && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
          <CheckCircle2 className="size-4 shrink-0" />
          {applyResult}
        </div>
      )}

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
            <Brain className="size-8 text-indigo-400" />
          </div>
          <h2 className="text-lg font-semibold text-slate-200">Your personal Chief of Staff</h2>
          <p className="mt-2 max-w-sm text-sm text-slate-500">
            AI scans all your overdue and stale tasks, then recommends specific actions —
            delete, archive, reschedule, or break down. You review before anything changes.
          </p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-800/50" />)}
        </div>
      )}

      {/* Report */}
      {report && !loading && (
        <div className="space-y-6">
          {/* Summary */}
          <Card>
            <p className="text-sm leading-relaxed text-slate-400">{report.summary}</p>
            <p className="mt-3 text-sm font-medium text-indigo-400 italic">✦ {report.motivationalNote}</p>
          </Card>

          {/* Quick wins */}
          {report.quickWins.length > 0 && (
            <Card>
              <div className="mb-3 flex items-center gap-2">
                <Zap className="size-4 text-amber-400" />
                <span className="text-sm font-semibold text-slate-200">Quick Wins (&lt;5 min each)</span>
              </div>
              <ul className="space-y-1.5">
                {report.quickWins.map((task, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-slate-400">
                    <CheckCircle2 className="size-3.5 text-amber-400 shrink-0" />
                    {task}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Duplicates */}
          {report.duplicatesFound.length > 0 && (
            <Card>
              <div className="mb-3 flex items-center gap-2">
                <Copy className="size-4 text-orange-400" />
                <span className="text-sm font-semibold text-slate-200">Possible Duplicates</span>
              </div>
              <div className="space-y-2">
                {report.duplicatesFound.map((dup, i) => (
                  <div key={i} className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-3 text-xs">
                    <div className="font-medium text-slate-300">"{dup.task1}"</div>
                    <div className="font-medium text-slate-300">"{dup.task2}"</div>
                    <div className="mt-1 text-slate-500">{dup.reason}</div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Overdue insight */}
          <Card>
            <div className="mb-2 flex items-center gap-2">
              <AlertCircle className="size-4 text-red-400" />
              <span className="text-sm font-semibold text-slate-200">Overdue Pattern</span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">{report.overdueCluster}</p>
          </Card>

          {/* Triage suggestions */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-200">
                Triage Suggestions
                <span className="ml-2 text-sm text-slate-500">({pendingCount} pending review)</span>
              </h2>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setApproved(new Set(report.suggestions.map((s) => s.taskId)))}
                >
                  Approve All
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setDismissed(new Set(report.suggestions.map((s) => s.taskId)))}
                >
                  Dismiss All
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              {report.suggestions.map((s) => (
                <SuggestionCard
                  key={s.taskId}
                  suggestion={s}
                  approved={approved.has(s.taskId)}
                  dismissed={dismissed.has(s.taskId)}
                  onApprove={() => {
                    setApproved((prev) => new Set(Array.from(prev).concat(s.taskId)))
                    setDismissed((prev) => { const n = new Set(prev); n.delete(s.taskId); return n })
                  }}
                  onDismiss={() => {
                    setDismissed((prev) => new Set(Array.from(prev).concat(s.taskId)))
                    setApproved((prev) => { const n = new Set(prev); n.delete(s.taskId); return n })
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
