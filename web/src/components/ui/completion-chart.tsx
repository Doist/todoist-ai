'use client'

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts'

interface Props {
  days: Array<{ date: string; completed: number }>
  dailyGoal: number
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs">
      <div className="text-slate-400">{label}</div>
      <div className="font-bold text-indigo-400">{payload[0].value} tasks</div>
    </div>
  )
}

export default function CompletionChart({ days, dailyGoal }: Props) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={days} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
        <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#1e293b' }} />
        <Bar dataKey="completed" radius={[4, 4, 0, 0]}>
          {days.map((entry, i) => (
            <Cell key={i} fill={entry.completed >= dailyGoal ? '#6366f1' : '#334155'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
