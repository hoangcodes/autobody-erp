import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { dataClient as api } from '@/lib/dataClient'
import { queryKeys } from '@/lib/queryClient'
import type { Vehicle } from '@/types'

export function useVehicles(ownerCustomerId?: string) {
  return useQuery({
    queryKey: queryKeys.vehicles.list(ownerCustomerId),
    queryFn: async () => (await api.list<Vehicle>('/vehicles', { ownerCustomerId })).items,
    enabled: Boolean(ownerCustomerId),
  })
}

/** Full vehicle directory (unfiltered) — used where the UI needs to resolve
 * vehicle display info for a set of orders in bulk (e.g. the kanban board). */
export function useVehicleDirectory() {
  return useQuery({
    queryKey: queryKeys.vehicles.list(undefined),
    queryFn: async () => (await api.list<Vehicle>('/vehicles', { pageSize: 250 })).items,
  })
}

/** Resolve a single vehicle by id from the directory cache. */
export function useVehicle(id: string | undefined) {
  const directory = useVehicleDirectory()
  const vehicle = id ? directory.data?.find((v) => v.id === id) : undefined
  return { ...directory, data: vehicle }
}

export function useCreateVehicle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Partial<Vehicle>) => api.post<Vehicle>('/vehicles', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.vehicles.all }),
  })
}

export function useUpdateVehicle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<Vehicle> }) => api.patch<Vehicle>(`/vehicles/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.vehicles.all }),
  })
}

export interface DecodeVehicleBody {
  vin?: string
  plate?: string
  state?: string
  ymm?: { year: number; make: string; model: string }
}

export function useDecodeVehicle() {
  return useMutation({
    mutationFn: (body: DecodeVehicleBody) => api.post<Partial<Vehicle>>('/vehicles/decode', body),
  })
}
