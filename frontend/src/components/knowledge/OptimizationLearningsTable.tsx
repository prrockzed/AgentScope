'use client'

import type { OptimizationLearning } from '@/types'

interface Props {
  data: OptimizationLearning[]
}

const categoryColors: Record<string, string> = {
  LATENCY:         '#818cf8',
  RETRIES:         '#f472b6',
  TOKENS:          '#34d399',
  PROMPT:          '#fbbf24',
  FORMAT:          '#60a5fa',
  RUNTIME:         '#f87171',
  MODEL_CHOICE:    '#a78bfa',
  PROMPT_QUALITY:  '#fbbf24',
  TOOL_USAGE:      '#2dd4bf',
  AGENT_STRATEGY:  '#818cf8',
  PERFORMANCE:     '#34d399',
  RELIABILITY:     '#f472b6',
}

function CategoryChip({ category }: { category: string }) {
  const color = categoryColors[category] ?? 'var(--text-muted)'
  return (
    <span className="text-xs font-mono font-medium" style={{ color }}>
      {category}
    </span>
  )
}

export function OptimizationLearningsTable({ data }: Props) {
  if (data.length === 0) {
    return (
      <div
        className="rounded-lg p-8 text-sm text-center"
        style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-custom)', color: 'var(--text-muted)' }}
      >
        No optimization patterns yet. Suggestions from completed runs will be aggregated here.
      </div>
    )
  }

  return (
    <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-custom)' }}>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ backgroundColor: 'var(--bg-surface)', borderBottom: '1px solid var(--border-custom)' }}>
            <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--text-muted)' }}>Category</th>
            <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--text-muted)' }}>Occurrences</th>
            <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--text-muted)' }}>Top Suggestion</th>
          </tr>
        </thead>
        <tbody>
          {data.map((l, idx) => (
            <tr
              key={l.category}
              style={{
                backgroundColor: idx % 2 === 0 ? 'var(--bg-base)' : 'var(--bg-surface)',
                borderBottom: '1px solid var(--border-custom)',
              }}
            >
              <td className="px-4 py-3">
                <CategoryChip category={l.category} />
              </td>
              <td className="px-4 py-3">
                <span
                  className="rounded-full px-2 py-0.5 text-xs font-semibold"
                  style={{ backgroundColor: '#2e1065', color: '#a78bfa' }}
                >
                  {l.count}
                </span>
              </td>
              <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-primary)' }}>
                {l.topSuggestion.length > 120
                  ? l.topSuggestion.slice(0, 120) + '…'
                  : l.topSuggestion}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
