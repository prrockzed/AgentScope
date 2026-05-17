'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createRun } from '@/lib/api'

export function useCreateRun() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ task, agentType, model }: { task: string; agentType?: string; model?: string }) =>
      createRun(task, agentType, model),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['runs'] })
    },
  })
}
