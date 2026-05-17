'use client'

import { useState, useCallback } from 'react'

const KEY = 'agentscope:defaultAgent'
const FALLBACK = 'tool_agent'

export function useDefaultAgent() {
  const [agentId, setAgentIdState] = useState<string>(
    () =>
      (typeof window !== 'undefined' ? localStorage.getItem(KEY) : null) ??
      FALLBACK,
  )

  const setDefault = useCallback((id: string) => {
    localStorage.setItem(KEY, id)
    setAgentIdState(id)
  }, [])

  return { agentId, setDefault }
}
