'use client'

import { memo } from 'react'
import { Handle, Position, type Node } from '@xyflow/react'
import { formatMs } from '@/lib/utils'
import type { TraceStep, EventType } from '@/types'

export interface StepNodeData extends Record<string, unknown> {
  step: TraceStep
  selected: boolean
}

export type StepNodeType = Node<StepNodeData, 'stepNode'>

const eventTypeStyles: Record<EventType, { bg: string; color: string; border: string }> = {
  TOOL_CALL:          { bg: '#3b0764', color: '#a78bfa', border: '#a78bfa' },
  LLM_RESPONSE:       { bg: '#1e3a5f', color: '#3b82f6', border: '#3b82f6' },
  RETRY_TRIGGERED:    { bg: '#451a03', color: '#f59e0b', border: '#f59e0b' },
  VALIDATION_FAILURE: { bg: '#4c0519', color: '#ef4444', border: '#ef4444' },
  RUN_COMPLETED:      { bg: '#14532d', color: '#22c55e', border: '#22c55e' },
}

function StepNodeInner({ data }: { data: StepNodeData }) {
  const { step, selected } = data
  const style = eventTypeStyles[step.eventType] ?? { bg: '#18181f', color: '#8b8a9b', border: '#8b8a9b' }

  return (
    <div
      style={{
        width: 260,
        minHeight: 80,
        backgroundColor: selected ? 'var(--bg-elevated)' : 'var(--bg-surface)',
        border: `1px solid var(--border-custom)`,
        borderLeft: `3px solid ${style.border}`,
        borderRadius: 8,
        boxShadow: selected ? '0 0 0 2px #7c3aed' : 'none',
        padding: '10px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        cursor: 'pointer',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />

      {/* Top row: step number + event type badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: '50%',
            backgroundColor: 'var(--bg-elevated)',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 10,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {step.stepNumber}
        </div>
        <span
          style={{
            backgroundColor: style.bg,
            color: style.color,
            borderRadius: 4,
            padding: '2px 6px',
            fontSize: 10,
            fontWeight: 500,
          }}
        >
          {step.eventType.replace(/_/g, ' ')}
        </span>
      </div>

      {/* Tool name */}
      {step.toolName && (
        <div
          style={{
            fontFamily: 'monospace',
            fontSize: 11,
            color: 'var(--text-muted)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {step.toolName}
        </div>
      )}

      {/* Bottom row: status · latency · tokens */}
      <div
        style={{
          fontSize: 10,
          color: 'var(--text-muted)',
          display: 'flex',
          gap: 6,
        }}
      >
        <span>{step.status}</span>
        <span>·</span>
        <span style={{ fontFamily: 'monospace' }}>{formatMs(step.latency)}</span>
        <span>·</span>
        <span>{step.tokenUsage} tok</span>
      </div>

      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  )
}

export const StepNode = memo(StepNodeInner)
