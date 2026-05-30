import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

// Returns quota status per northstar type for the current user's section + round
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sectionId = (session.user as any).section_id
  const roundId = (session.user as any).round_id

  if (!sectionId || !roundId) return NextResponse.json([])

  // Get all quota rows for this round + section
  const { data: quotaRows } = await supabaseAdmin
    .from('round_section_quotas')
    .select('id, northstar_type_id, quota')
    .eq('round_id', roundId)
    .eq('section_id', sectionId)

  if (!quotaRows?.length) return NextResponse.json([])

  // Count used per quota id
  const quotaIds = quotaRows.map(q => q.id)
  const { data: regs } = await supabaseAdmin
    .from('registrations')
    .select('round_section_quota_id')
    .in('round_section_quota_id', quotaIds)

  const usedMap = new Map<string, number>()
  for (const reg of regs ?? []) {
    usedMap.set(reg.round_section_quota_id, (usedMap.get(reg.round_section_quota_id) ?? 0) + 1)
  }

  const result = quotaRows.map(q => ({
    northstar_type_id: q.northstar_type_id,
    quota: q.quota,
    used: usedMap.get(q.id) ?? 0,
    remaining: q.quota - (usedMap.get(q.id) ?? 0),
    is_full: (usedMap.get(q.id) ?? 0) >= q.quota,
  }))

  return NextResponse.json(result)
}
