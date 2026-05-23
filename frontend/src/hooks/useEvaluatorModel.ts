'use client'

import { useState, useCallback } from 'react'

const KEY = 'agentscope:evaluatorModel'
const FALLBACK = ''

export function useEvaluatorModel() {
  const [modelId, setModelIdState] = useState<string>(
    () =>
      (typeof window !== 'undefined' ? localStorage.getItem(KEY) : null) ??
      FALLBACK,
  )

  const setEvaluatorModel = useCallback((id: string) => {
    localStorage.setItem(KEY, id)
    setModelIdState(id)
  }, [])

  return { modelId, setEvaluatorModel }
}
