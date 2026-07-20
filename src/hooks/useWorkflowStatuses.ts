import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { dataClient as api } from '@/lib/dataClient'
import { queryKeys } from '@/lib/queryClient'
import type { WorkflowStatus } from '@/types'

export function useWorkflowStatuses() {
  return useQuery({
    queryKey: queryKeys.workflowStatuses.all,
    queryFn: async () => (await api.list<WorkflowStatus>('/workflow-statuses')).items,
  })
}

export function useCreateWorkflowStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Partial<WorkflowStatus>) => api.post<WorkflowStatus>('/workflow-statuses', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.workflowStatuses.all }),
  })
}

export function useUpdateWorkflowStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<WorkflowStatus> }) =>
      api.patch<WorkflowStatus>(`/workflow-statuses/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.workflowStatuses.all }),
  })
}

export function useDeleteWorkflowStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.del(`/workflow-statuses/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.workflowStatuses.all }),
  })
}

/** Soft-archive a column (hides it from the board; sets `archivedAt`). */
export function useArchiveWorkflowStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.post<WorkflowStatus>(`/workflow-statuses/${id}/archive`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.workflowStatuses.all }),
  })
}
