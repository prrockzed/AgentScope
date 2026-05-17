import { useMutation, useQueryClient } from '@tanstack/react-query'
import { analyzeWithAI } from '@/lib/api'

export function useAnalyzeWithAI(runId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => analyzeWithAI(runId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['optimizations', 'run', runId] })
      void qc.invalidateQueries({ queryKey: ['optimizations'] })
    },
  })
}
