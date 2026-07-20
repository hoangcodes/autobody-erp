import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { dataClient as api } from '@/lib/dataClient'
import { queryKeys } from '@/lib/queryClient'
import type { Conversation, Message, MessageTemplate } from '@/types'

export function useConversations() {
  return useQuery({
    queryKey: queryKeys.messages.conversations,
    queryFn: async () => (await api.list<Conversation>('/messages')).items,
    refetchInterval: 20_000,
  })
}

export function useMessageThread(customerId?: string, orderId?: string) {
  return useQuery({
    queryKey: queryKeys.messages.thread(customerId, orderId),
    queryFn: async () =>
      (await api.list<Message>('/messages/thread', { customerId, orderId })).items,
    enabled: Boolean(customerId),
    refetchInterval: 15_000,
  })
}

export interface SendMessageBody {
  customerId: string
  orderId?: string
  channel: 'sms' | 'email'
  body: string
  subject?: string
  templateId?: string
}

export function useSendMessage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: SendMessageBody) => api.post<Message>('/messages', body),
    onSuccess: (_msg, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.messages.thread(vars.customerId, vars.orderId) })
      qc.invalidateQueries({ queryKey: queryKeys.messages.conversations })
    },
  })
}

export function useMarkMessageRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (messageId: string) => api.post(`/messages/${messageId}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.messages.conversations }),
  })
}

export function useMessageTemplates() {
  return useQuery({
    queryKey: queryKeys.messages.templates,
    queryFn: async () => (await api.list<MessageTemplate>('/message-templates')).items,
  })
}
