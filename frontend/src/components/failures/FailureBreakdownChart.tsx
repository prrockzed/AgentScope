'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { FailureSummary } from '@/types'

interface Props {
  data: FailureSummary[]
}

export function FailureBreakdownChart({ data }: Props) {
  const height = Math.max(120, data.length * 44)

  return (
    <div
      className="rounded-lg p-5 flex flex-col gap-4"
      style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-custom)' }}
    >
      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
        Failure breakdown
      </p>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
        >
          <XAxis
            type="number"
            tick={{ fill: '#8b8a9b', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="reason"
            width={180}
            tick={{ fill: '#8b8a9b', fontSize: 11, fontFamily: 'monospace' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#111118',
              border: '1px solid #1e1e2e',
              color: '#f1f0f5',
            }}
            formatter={(v) => [v, 'Count']}
          />
          <Bar dataKey="count" fill="#ef4444" radius={[0, 3, 3, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
