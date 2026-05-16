'use client'

import { useQuery } from '@tanstack/react-query'
import { getRun } from '@/lib/api'

export function useRun(id: string) {
  return useQuery({
    queryKey: ['runs', id],
    queryFn: () => getRun(id),
    refetchInterval: (query) => {
      const data = query.state.data
      return data?.status === 'RUNNING' ? 3000 : false
    },
  })
}
