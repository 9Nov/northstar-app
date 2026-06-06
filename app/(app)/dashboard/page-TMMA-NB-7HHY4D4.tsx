import { createServiceClient } from '@/lib/supabase'
import DashboardClient from './DashboardClient'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = createServiceClient()

  // Fetch active rounds
  const { data: rounds } = await supabase
    .from('rounds')
    .select('id, name, is_open')
    .eq('is_open', true)
    .order('created_at', { ascending: false })

  if (!rounds || rounds.length === 0) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Dashboard</h1>
        <p className="text-gray-500 mb-8">Quota Monitor แบบ Real-time</p>
        <div className="flex flex-col items-center justify-center py-24 text-gray-400">
          <svg className="w-16 h-16 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-lg font-medium">ยังไม่มีรอบการอบรมที่เปิดอยู่ในขณะนี้</p>
        </div>
      </div>
    )
  }

  // Fetch quotas and registrations for all active rounds
  const roundIds = rounds.map(r => r.id)

  const { data: quotas } = await supabase
    .from('round_section_quotas')
    .select('id, round_id, section_id, northstar_type_id, quota, sections(id, name), northstar_types(id, name, display_order)')
    .in('round_id', roundIds)

  const { data: registrations } = await supabase
    .from('registrations')
    .select('id, round_section_quota_id')
    .in('round_section_quota_id', (quotas || []).map(q => q.id))

  return (
    <DashboardClient
      initialRounds={rounds as any}
      initialQuotas={(quotas || []) as any}
      initialRegistrations={(registrations || []) as any}
    />
  )
}
