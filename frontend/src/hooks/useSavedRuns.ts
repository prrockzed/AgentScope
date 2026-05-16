import { useQuery } from '@tanstack/react-query'
import { getSavedRuns } from '@/lib/api'

export function useSavedRuns() {
  return useQuery({
    queryKey: ['saved-runs'],
    queryFn: getSavedRuns,
  })
}
