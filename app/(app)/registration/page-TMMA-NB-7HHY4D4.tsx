import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import RegistrationClient from './RegistrationClient'

export const dynamic = 'force-dynamic'

export default async function RegistrationPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const user = session.user as any
  if (user.role === 'admin') redirect('/admin/rounds')

  const supabase = createServiceClient()

  // Get user full info
  const { data: userInfo } = await supabase
    .from('users')
    .select('id, name, surname, section_id, round_id, sections(id, name), rounds(id, name, is_open)')
    .eq('id', user.id)
    .single()

  if (!userInfo) {
    return <div className="p-8 text-red-500">ไม่พบข้อมูลผู้ใช้</div>
  }

  const round = userInfo.rounds as any
  const section = userInfo.sections as any

  if (!round) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">ลงทะเบียน Northstar</h1>
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-5 py-4 rounded-xl">
          ยังไม่ได้ผูกกับรอบการอบรม กรุณาติดต่อ Admin
        </div>
      </div>
    )
  }

  if (!round.is_open) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">ลงทะเบียน Northstar</h1>
        <div className="bg-gray-100 border border-gray-200 text-gray-600 px-5 py-4 rounded-xl">
          <strong>รอบ: {round.name}</strong><br />
          การลงทะเบียนรอบนี้ยังไม่เปิด หรือปิดแล้ว กรุณาติดต่อ Admin
        </div>
      </div>
    )
  }

  // Check existing registration
  const { data: existing } = await supabase
    .from('registrations')
    .select('id, round_section_quota_id, round_section_quotas(id, northstar_type_id, northstar_types(id, name))')
    .eq('user_id', user.id)
    .single()

  // Get northstar types with quotas for this round+section
  const { data: quotaData } = await supabase
    .from('round_section_quotas')
    .select('id, northstar_type_id, quota, northstar_types(id, name, display_order)')
    .eq('round_id', round.id)
    .eq('section_id', section?.id || '')
    .order('northstar_types(display_order)')

  // Get used counts
  const quotaIds = (quotaData || []).map(q => q.id)
  const { data: usedData } = await supabase
    .from('registrations')
    .select('round_section_quota_id')
    .in('round_section_quota_id', quotaIds)

  const usedMap: Record<string, number> = {}
  for (const r of usedData || []) {
    usedMap[r.round_section_quota_id] = (usedMap[r.round_section_quota_id] || 0) + 1
  }

  return (
    <RegistrationClient
      userId={user.id}
      userName={`${userInfo.name} ${userInfo.surname}`}
      sectionName={section?.name || '-'}
      roundId={round.id}
      roundName={round.name}
      quotaData={(quotaData || []).map(q => ({
        id: q.id,
        northstar_type_id: q.northstar_type_id,
        northstar_type_name: (q.northstar_types as any)?.name || '',
        northstar_type_order: (q.northstar_types as any)?.display_order || 0,
        quota: q.quota,
        used: usedMap[q.id] || 0,
      }))}
      existingRegistrationId={existing?.id || null}
      existingQuotaId={existing?.round_section_quota_id || null}
      existingNorthstarName={(existing?.round_section_quotas as any)?.northstar_types?.name || null}
    />
  )
}
