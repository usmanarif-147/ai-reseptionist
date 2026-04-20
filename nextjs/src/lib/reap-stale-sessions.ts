import { createAdminClient } from '@/lib/supabase/admin'

const STALE_THRESHOLD_MS = 10 * 60 * 1000

export async function reapStaleSessions(businessId: string): Promise<number> {
  const supabase = createAdminClient()
  const cutoff = new Date(Date.now() - STALE_THRESHOLD_MS).toISOString()

  const { data: activeSessions, error: activeErr } = await supabase
    .from('chat_sessions')
    .select('id')
    .eq('business_id', businessId)
    .eq('status', 'active')

  if (activeErr || !activeSessions || activeSessions.length === 0) {
    return 0
  }

  const activeIds = activeSessions.map((s: { id: string }) => s.id)

  const { data: recentMessages, error: msgErr } = await supabase
    .from('chat_messages')
    .select('session_id')
    .in('session_id', activeIds)
    .gt('created_at', cutoff)

  if (msgErr) {
    return 0
  }

  const freshIds = new Set<string>(
    (recentMessages ?? []).map((m: { session_id: string }) => m.session_id)
  )
  const staleIds = activeIds.filter((id: string) => !freshIds.has(id))

  if (staleIds.length === 0) {
    return 0
  }

  const { error: updateErr } = await supabase
    .from('chat_sessions')
    .update({ status: 'expired', ended_at: new Date().toISOString() })
    .in('id', staleIds)
    .eq('business_id', businessId)
    .eq('status', 'active')

  if (updateErr) {
    return 0
  }

  return staleIds.length
}
