'use client'

import { useState, useCallback } from 'react'

const KEY = 'agentscope:defaultModel'
const FALLBACK = 'qwen3:4b'

export function useDefaultModel() {
  const [modelId, setModelIdState] = useState<string>(
    () =>
      (typeof window !== 'undefined' ? localStorage.getItem(KEY) : null) ??
      FALLBACK,
  )

  const setDefault = useCallback((id: string) => {
    localStorage.setItem(KEY, id)
    setModelIdState(id)
  }, [])

  return { modelId, setDefault }
}
