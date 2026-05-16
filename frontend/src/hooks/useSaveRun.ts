import { useMutation, useQueryClient } from '@tanstack/react-query'
import { saveRun, unsaveRun } from '@/lib/api'

export function useSaveRun(runId: string) {
  const qc = useQueryClient()

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['saved-runs'] })
    void qc.invalidateQueries({ queryKey: ['run-saved', runId] })
  }

  const save = useMutation({
    mutationFn: () => saveRun(runId),
    onSuccess: invalidate,
  })

  const unsave = useMutation({
    mutationFn: () => unsaveRun(runId),
    onSuccess: invalidate,
  })

  return { save, unsave }
}
