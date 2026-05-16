import { useQuery } from '@tanstack/react-query'
import { getRegressionTests } from '@/lib/api'

export function useRegressionTests() {
  return useQuery({
    queryKey: ['regression-tests'],
    queryFn: getRegressionTests,
    refetchInterval: 5000,
  })
}
