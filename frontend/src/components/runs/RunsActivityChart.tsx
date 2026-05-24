'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import type { AgentRun } from '@/types'

type Granularity = 'Hourly' | '4-Hourly' | 'Daily'

const WINDOW_SIZE: Record<Granularity, number> = { Hourly: 24, '4-Hourly': 24, Daily: 14 }
// Hourly  → 24 h window
// 4-Hourly → 24 × 4 h = 4 days window
// Daily   → 14 days window

const BAR_SIZE: Record<Granularity, number> = { Hourly: 10, '4-Hourly': 13, Daily: 20 }

// Show every Nth tick on the x-axis to avoid crowding
const TICK_INTERVAL: Record<Granularity, number> = { Hourly: 3, '4-Hourly': 5, Daily: 1 }

const SKELETON_HEIGHTS = [45, 70, 30, 85, 55, 40, 75, 60, 35, 80, 50, 65, 25, 70,
                          45, 55, 80, 35, 60, 75, 40, 65, 50, 30]

interface Bucket {
  label: string
  success: number
  failed: number
  running: number
}

function floorTo(date: Date, gran: Granularity): Date {
  const d = new Date(date)
  if (gran === 'Hourly') {
    d.setMinutes(0, 0, 0)
  } else if (gran === '4-Hourly') {
    d.setHours(Math.floor(d.getHours() / 4) * 4, 0, 0, 0)
  } else {
    d.setHours(0, 0, 0, 0)
  }
  return d
}

function addPeriods(date: Date, gran: Granularity, n: number): Date {
  const d = new Date(date)
  if (gran === 'Hourly') d.setHours(d.getHours() + n)
  else if (gran === '4-Hourly') d.setHours(d.getHours() + n * 4)
  else d.setDate(d.getDate() + n)
  return d
}

function toKey(date: Date, gran: Granularity): string {
  if (gran === 'Daily') return date.toISOString().slice(0, 10)
  // For Hourly and 4-Hourly the bucket boundary is always at a whole hour
  return date.toISOString().slice(0, 13)
}

function toLabel(date: Date, gran: Granularity): string {
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
  if (gran === 'Hourly') return time
  if (gran === '4-Hourly') {
    // At midnight show the date; otherwise show the time
    return date.getHours() === 0
      ? date.toLocaleDateString([], { month: 'short', day: 'numeric' })
      : time
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function toRangeLabel(start: Date, end: Date, gran: Granularity): string {
  const fmtDate = (d: Date) => d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  const fmtTime = (d: Date) =>
    d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })

  if (gran === 'Hourly') {
    const startDay = fmtDate(start)
    const endDay = fmtDate(addPeriods(end, 'Daily', -1))
    const prefix = startDay === endDay ? startDay : `${startDay} – ${endDay}`
    return `${prefix}  ${fmtTime(start)} – ${fmtTime(end)}`
  }
  if (gran === '4-Hourly') {
    return `${fmtDate(start)} – ${fmtDate(addPeriods(end, 'Daily', -1))}`
  }
  return `${fmtDate(start)} – ${fmtDate(addPeriods(end, 'Daily', -1))}`
}

interface Props {
  runs: AgentRun[] | undefined
  isLoading: boolean
  onRefresh: () => void
}

export function RunsActivityChart({ runs, isLoading, onRefresh }: Props) {
  const [gran, setGran] = useState<Granularity>('Hourly')
  const [offset, setOffset] = useState(0)
  const [clientNow, setClientNow] = useState<Date | null>(null)

  // Initialise on the client only to avoid SSR/client date mismatch
  useEffect(() => { setClientNow(new Date()) }, [])

  const windowSize = WINDOW_SIZE[gran]

  const { windowStart, windowEnd, buckets, totalRuns, failedRuns, runningRuns } =
    useMemo(() => {
      const now = floorTo(clientNow ?? new Date(), gran)
      const wEnd = addPeriods(now, gran, 1 + offset * windowSize)
      const wStart = addPeriods(wEnd, gran, -windowSize)

      const map = new Map<string, Bucket>()
      for (let i = 0; i < windowSize; i++) {
        const d = addPeriods(wStart, gran, i)
        map.set(toKey(d, gran), { label: toLabel(d, gran), success: 0, failed: 0, running: 0 })
      }

      let total = 0, failed = 0, running = 0
      if (runs) {
        for (const run of runs) {
          const key = toKey(floorTo(new Date(run.createdAt), gran), gran)
          const b = map.get(key)
          if (b) {
            total++
            if (run.status === 'SUCCESS') b.success++
            else if (run.status === 'FAILED') { b.failed++; failed++ }
            else if (run.status === 'RUNNING') { b.running++; running++ }
          }
        }
      }

      return {
        windowStart: wStart,
        windowEnd: wEnd,
        buckets: Array.from(map.values()),
        totalRuns: total,
        failedRuns: failed,
        runningRuns: running,
      }
    }, [runs, gran, offset, windowSize, clientNow])

  const controlStyle = {
    backgroundColor: 'var(--bg-elevated)',
    border: '1px solid var(--border-custom)',
    color: 'var(--text-primary)',
  }

  return (
    <div
      className="rounded-lg flex flex-col"
      style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-custom)' }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 flex-wrap"
        style={{ borderBottom: '1px solid var(--border-custom)' }}
      >
        {/* Date navigation */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setOffset((o) => o - 1)}
            className="flex items-center justify-center w-6 h-6 rounded"
            style={{ color: 'var(--text-muted)' }}
          >
            <ChevronLeft size={14} />
          </button>
          <span
            className="text-xs font-mono px-2 py-1 rounded"
            style={{ minWidth: 170, textAlign: 'center', ...controlStyle }}
            suppressHydrationWarning
          >
            {clientNow ? toRangeLabel(windowStart, windowEnd, gran) : '—'}
          </span>
          <button
            onClick={() => setOffset((o) => o + 1)}
            disabled={offset >= 0}
            className="flex items-center justify-center w-6 h-6 rounded disabled:opacity-30"
            style={{ color: 'var(--text-muted)' }}
          >
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#22c55e', flexShrink: 0 }} />
            {isLoading ? '—' : `${totalRuns} total runs`}
          </span>
          <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#ef4444', flexShrink: 0 }} />
            {isLoading ? '—' : `${failedRuns} failed`}
          </span>
          {!isLoading && runningRuns > 0 && (
            <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#3b82f6', flexShrink: 0 }} />
              {`${runningRuns} running`}
            </span>
          )}
        </div>

        {/* Granularity + Refresh */}
        <div className="flex items-center gap-2 ml-auto">
          <select
            value={gran}
            onChange={(e) => { setGran(e.target.value as Granularity); setOffset(0) }}
            className="text-xs rounded px-2 py-1 outline-none cursor-pointer"
            style={controlStyle}
          >
            <option value="Hourly">Hourly</option>
            <option value="4-Hourly">Every 4h</option>
            <option value="Daily">Daily</option>
          </select>
          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 rounded px-2 py-1 text-xs"
            style={{ ...controlStyle, color: 'var(--text-muted)' }}
          >
            <RefreshCw size={11} />
            Refresh
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="px-2 pt-4 pb-1">
        {isLoading ? (
          <div className="flex items-end gap-[3px] h-[130px] px-6">
            {SKELETON_HEIGHTS.slice(0, windowSize).map((h, i) => (
              <div key={i} className="flex-1 flex items-end">
                <Skeleton
                  className="w-full rounded-sm"
                  style={{ height: `${h}%`, backgroundColor: 'var(--bg-elevated)' }}
                />
              </div>
            ))}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={130}>
            <BarChart
              data={buckets}
              barSize={BAR_SIZE[gran]}
              margin={{ top: 4, right: 8, bottom: 0, left: -24 }}
            >
              <CartesianGrid
                stroke="var(--border-custom)"
                strokeDasharray="3 3"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{ fill: '#6b7280', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                interval={TICK_INTERVAL[gran]}
              />
              <YAxis
                tick={{ fill: '#6b7280', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
                width={32}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#111118',
                  border: '1px solid #1e1e2e',
                  color: '#f1f0f5',
                  fontSize: 12,
                  borderRadius: 6,
                }}
                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                formatter={(value, name) => [
                  value,
                  name === 'success' ? 'Success' : name === 'failed' ? 'Failed' : 'Running',
                ]}
              />
              <Bar dataKey="success" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} />
              <Bar dataKey="running" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
              <Bar dataKey="failed" stackId="a" fill="#ef4444" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
