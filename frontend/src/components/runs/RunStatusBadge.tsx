import type { RunStatus } from '@/types'

const styles: Record<RunStatus, { bg: string; color: string; label: string }> = {
  RUNNING: { bg: '#1e3a5f', color: '#3b82f6', label: 'Running' },
  SUCCESS: { bg: '#14532d', color: '#22c55e', label: 'Success' },
  FAILED: { bg: '#4c0519', color: '#ef4444', label: 'Failed' },
  CANCELLED: { bg: '#1c1917', color: '#a8a29e', label: 'Cancelled' },
}

export function RunStatusBadge({ status }: { status: RunStatus }) {
  const s = styles[status]
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ backgroundColor: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  )
}
