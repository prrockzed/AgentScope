import { useQuery } from '@tanstack/react-query'
import { getOptimizations } from '@/lib/api'

export function useOptimizations() {
  return useQuery({
    queryKey: ['optimizations'],
    queryFn: getOptimizations,
  })
}
