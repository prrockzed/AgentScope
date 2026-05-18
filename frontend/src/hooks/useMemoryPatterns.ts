import { useQuery } from '@tanstack/react-query'
import { getMemoryPatterns } from '@/lib/api'

export function useMemoryPatterns() {
  return useQuery({
    queryKey: ['memory-patterns'],
    queryFn: getMemoryPatterns,
    refetchInterval: 5000,
  })
}
