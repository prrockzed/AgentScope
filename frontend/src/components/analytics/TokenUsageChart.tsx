'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { truncateId } from '@/lib/utils'
import type { AgentRun } from '@/types'

interface Props {
  runs: AgentRun[]
}

export function TokenUsageChart({ runs }: Props) {
  const data = runs
    .filter((r) => r.totalTokens != null)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map((r) => ({ id: truncateId(r.id), tokens: r.totalTokens }))

  return (
    <div
      className="rounded-lg p-5 flex flex-col gap-4"
      style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-custom)' }}
    >
      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
        Token usage per run
      </p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
          <CartesianGrid stroke="#1e1e2e" strokeDasharray="3 3" />
          <XAxis
            dataKey="id"
            tick={{ fill: '#8b8a9b', fontSize: 10, fontFamily: 'monospace' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#8b8a9b', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#111118', border: '1px solid #1e1e2e', color: '#f1f0f5' }}
            formatter={(v) => [v ?? 0, 'Tokens']}
          />
          <Bar dataKey="tokens" fill="#7c3aed" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
