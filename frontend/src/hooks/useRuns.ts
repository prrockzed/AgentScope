'use client'

import { useQuery } from '@tanstack/react-query'
import { getRuns } from '@/lib/api'

export function useRuns() {
  return useQuery({
    queryKey: ['runs'],
    queryFn: getRuns,
    refetchInterval: (query) => {
      const data = query.state.data
      return data?.some((r) => r.status === 'RUNNING') ? 3000 : false
    },
  })
}
