import { useQuery } from '@tanstack/react-query'
import { getRegressionResults } from '@/lib/api'

export function useRegressionResults() {
  return useQuery({
    queryKey: ['regression-results'],
    queryFn: getRegressionResults,
    refetchInterval: 5000,
  })
}
