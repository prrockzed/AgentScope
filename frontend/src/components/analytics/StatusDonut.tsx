'use client'

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { AgentRun } from '@/types'

const COLORS: Record<string, string> = {
  SUCCESS: '#22c55e',
  FAILED: '#ef4444',
  RUNNING: '#3b82f6',
}

interface Props {
  runs: AgentRun[]
}

export function StatusDonut({ runs }: Props) {
  const counts: Record<string, number> = {}
  for (const run of runs) {
    counts[run.status] = (counts[run.status] ?? 0) + 1
  }
  const data = Object.entries(counts).map(([name, value]) => ({ name, value }))

  return (
    <div
      className="rounded-lg p-5 flex flex-col gap-4"
      style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-custom)' }}
    >
      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
        Status distribution
      </p>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={80}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={COLORS[entry.name] ?? '#8b8a9b'} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ backgroundColor: '#111118', border: '1px solid #1e1e2e', color: '#f1f0f5' }}
          />
          <Legend
            formatter={(value) => (
              <span style={{ color: '#8b8a9b', fontSize: 12 }}>{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
