import { api } from '@/lib/api-client'

/** Wipes and reseeds the demo playground back to its fixed starting dataset. */
export function resetDemoPlayground(): Promise<void> {
  return api.post<void>('/api/demo/reset')
}
