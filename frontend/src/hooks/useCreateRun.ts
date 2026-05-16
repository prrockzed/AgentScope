'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createRun } from '@/lib/api'

export function useCreateRun() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (task: string) => createRun(task),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['runs'] })
    },
  })
}
