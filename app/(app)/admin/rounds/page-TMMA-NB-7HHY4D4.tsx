import { createServiceClient } from '@/lib/supabase'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import AdminRoundsClient from './AdminRoundsClient'

export const dynamic = 'force-dynamic'

export default async function AdminRoundsPage() {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  if (user?.role !== 'admin') redirect('/dashboard')

  const supabase = createServiceClient()

  const { data: rounds } = await supabase
    .from('rounds')
    .select('id, name, is_open, created_at')
    .order('created_at', { ascending: false })

  const { data: sections } = await supabase
    .from('sections')
    .select('id, name')
    .order('name')

  const { data: northstarTypes } = await supabase
    .from('northstar_types')
    .select('id, name, display_order')
    .order('display_order')

  // For each round, get user count and quota data
  const { data: users } = await supabase
    .from('users')
    .select('round_id')
    .not('round_id', 'is', null)

  const { data: quotas } = await supabase
    .from('round_section_quotas')
    .select('id, round_id, section_id, northstar_type_id, quota')

  const userCountByRound: Record<string, number> = {}
  for (const u of users || []) {
    if (u.round_id) userCountByRound[u.round_id] = (userCountByRound[u.round_id] || 0) + 1
  }

  return (
    <AdminRoundsClient
      initialRounds={(rounds || []).map(r => ({ ...r, user_count: userCountByRound[r.id] || 0 }))}
      sections={sections || []}
      northstarTypes={(northstarTypes || []).sort((a, b) => a.display_order - b.display_order)}
      initialQuotas={quotas || []}
    />
  )
}
