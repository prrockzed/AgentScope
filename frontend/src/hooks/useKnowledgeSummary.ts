import { useQuery } from '@tanstack/react-query'
import { getKnowledgeSummary } from '@/lib/api'

export function useKnowledgeSummary() {
  return useQuery({
    queryKey: ['knowledge-summary'],
    queryFn: getKnowledgeSummary,
    refetchInterval: 5000,
  })
}
