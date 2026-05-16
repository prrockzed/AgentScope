import { useMutation, useQueryClient } from '@tanstack/react-query'
import { generateEval } from '@/lib/api'

export function useGenerateEval() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (runId: string) => generateEval(runId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['regression-tests'] }),
  })
}
