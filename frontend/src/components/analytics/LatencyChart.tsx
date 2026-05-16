'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import type { AgentRun } from '@/types'
import { formatDuration } from '@/lib/utils'

interface Props {
  runs: AgentRun[]
}

export function LatencyChart({ runs }: Props) {
  const data = runs
    .filter((r) => r.totalLatency != null)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map((r, i) => ({ index: i + 1, latency: r.totalLatency }))

  return (
    <div
      className="rounded-lg p-5 flex flex-col gap-4"
      style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-custom)' }}
    >
      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
        Latency over runs
      </p>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
          <CartesianGrid stroke="#1e1e2e" strokeDasharray="3 3" />
          <XAxis
            dataKey="index"
            tick={{ fill: '#8b8a9b', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#8b8a9b', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => formatDuration(v as number)}
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#111118', border: '1px solid #1e1e2e', color: '#f1f0f5' }}
            formatter={(v) => [formatDuration(v as number), 'Latency']}
          />
          <Line
            type="monotone"
            dataKey="latency"
            stroke="#7c3aed"
            strokeWidth={2}
            dot={{ fill: '#7c3aed', r: 4 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
