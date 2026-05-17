'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createRun } from '@/lib/api'

export function useCreateRun() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ task, agentType }: { task: string; agentType?: string }) =>
      createRun(task, agentType),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['runs'] })
    },
  })
}
