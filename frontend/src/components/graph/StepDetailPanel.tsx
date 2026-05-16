'use client'

import { X } from 'lucide-react'
import { formatMs } from '@/lib/utils'
import type { TraceStep, EventType } from '@/types'

const eventTypeStyles: Record<EventType, { bg: string; color: string }> = {
  TOOL_CALL:          { bg: '#3b0764', color: '#a78bfa' },
  LLM_RESPONSE:       { bg: '#1e3a5f', color: '#3b82f6' },
  RETRY_TRIGGERED:    { bg: '#451a03', color: '#f59e0b' },
  VALIDATION_FAILURE: { bg: '#4c0519', color: '#ef4444' },
  RUN_COMPLETED:      { bg: '#14532d', color: '#22c55e' },
}

interface StepDetailPanelProps {
  step: TraceStep | null
  onClose: () => void
}

export function StepDetailPanel({ step, onClose }: StepDetailPanelProps) {
  const style = step ? (eventTypeStyles[step.eventType] ?? { bg: '#18181f', color: '#8b8a9b' }) : null

  return (
    <div
      style={{
        position: 'absolute',
        right: 0,
        top: 0,
        height: '100%',
        width: 320,
        backgroundColor: 'var(--bg-surface)',
        borderLeft: '1px solid var(--border-custom)',
        zIndex: 10,
        transform: step ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.2s ease',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {step && (
        <>
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderBottom: '1px solid var(--border-custom)',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  backgroundColor: style!.bg,
                  color: style!.color,
                  borderRadius: 4,
                  padding: '2px 6px',
                  fontSize: 11,
                  fontWeight: 500,
                }}
              >
                {step.eventType.replace(/_/g, ' ')}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>#{step.stepNumber}</span>
            </div>
            <button
              onClick={onClose}
              style={{
                color: 'var(--text-muted)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: 4,
                borderRadius: 4,
              }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '12px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            {/* Meta */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {step.toolName && (
                <div style={{ fontSize: 12 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Tool: </span>
                  <span style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                    {step.toolName}
                  </span>
                </div>
              )}
              <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 12 }}>
                <span>{step.status}</span>
                <span style={{ fontFamily: 'monospace' }}>{formatMs(step.latency)}</span>
                <span>{step.tokenUsage} tokens</span>
              </div>
            </div>

            {/* Prompt */}
            {step.prompt && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <p style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', margin: 0 }}>
                  Prompt
                </p>
                <pre
                  style={{
                    fontSize: 11,
                    fontFamily: 'monospace',
                    backgroundColor: 'var(--bg-elevated)',
                    color: 'var(--text-primary)',
                    borderRadius: 6,
                    padding: '8px 10px',
                    maxHeight: 160,
                    overflowY: 'auto',
                    whiteSpace: 'pre-wrap',
                    margin: 0,
                  }}
                >
                  {step.prompt}
                </pre>
              </div>
            )}

            {/* Response */}
            {step.response && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <p style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', margin: 0 }}>
                  Response
                </p>
                <pre
                  style={{
                    fontSize: 11,
                    fontFamily: 'monospace',
                    backgroundColor: 'var(--bg-elevated)',
                    color: 'var(--text-primary)',
                    borderRadius: 6,
                    padding: '8px 10px',
                    maxHeight: 160,
                    overflowY: 'auto',
                    whiteSpace: 'pre-wrap',
                    margin: 0,
                  }}
                >
                  {step.response}
                </pre>
              </div>
            )}

            {!step.prompt && !step.response && (
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                No prompt or response data.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
