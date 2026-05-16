import { useMutation, useQueryClient } from '@tanstack/react-query'
import { unsaveRun } from '@/lib/api'

export function useUnsaveRun() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (runId: string) => unsaveRun(runId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['saved-runs'] }),
  })
}
