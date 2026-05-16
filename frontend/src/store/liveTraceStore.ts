'use client'

import { create } from 'zustand'
import type { TraceStep } from '@/types'

interface LiveTraceState {
  steps: TraceStep[]
  addStep: (step: TraceStep) => void
  clearSteps: () => void
}

export const useLiveTraceStore = create<LiveTraceState>((set) => ({
  steps: [],
  addStep: (step) =>
    set((state) => {
      const map = new Map(state.steps.map((s) => [s.id, s]))
      map.set(step.id, step)
      const sorted = Array.from(map.values()).sort(
        (a, b) => a.stepNumber - b.stepNumber
      )
      return { steps: sorted }
    }),
  clearSteps: () => set({ steps: [] }),
}))
