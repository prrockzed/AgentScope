'use client'

import { useEffect, useRef } from 'react'
import { useLiveTraceStore } from '@/store/liveTraceStore'
import type { TraceStep } from '@/types'

const WS_URL = 'ws://localhost:8080/ws/traces'

export function useTraceWebSocket(runId: string, enabled: boolean) {
  const addStep = useLiveTraceStore((s) => s.addStep)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    if (!enabled) {
      wsRef.current?.close()
      wsRef.current = null
      return
    }

    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    ws.onmessage = (event) => {
      try {
        const step = JSON.parse(event.data as string) as TraceStep
        if (step.runId === runId) {
          addStep(step)
        }
      } catch {
        // ignore malformed messages
      }
    }

    return () => {
      ws.close()
      wsRef.current = null
    }
  }, [enabled, runId, addStep])
}
