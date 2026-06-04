import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: rounds } = await supabaseAdmin
    .from('rounds')
    .select('id, name')
    .eq('is_open', true)
    .order('created_at', { ascending: false })

  if (!rounds?.length) return NextResponse.json({ rounds: [], sections: [], northstarTypes: [], quotaTable: {}, chartData: {} })

  const roundIds = rounds.map(r => r.id)

  const [{ data: quotas }, { data: sections }, { data: northstarTypes }] = await Promise.all([
    supabaseAdmin
      .from('round_section_quotas')
      .select('id, round_id, section_id, northstar_type_id, quota')
      .in('round_id', roundIds),
    supabaseAdmin.from('sections').select('id, name'),
    supabaseAdmin.from('northstar_types').select('id, name, display_order').order('display_order'),
  ])

  const quotaIds = (quotas ?? []).map(q => q.id)
  const { data: regs } = await supabaseAdmin
    .from('registrations')
    .select('round_section_quota_id')
    .in('round_section_quota_id', quotaIds)

  const usedMap = new Map<string, number>()
  for (const reg of regs ?? []) {
    usedMap.set(reg.round_section_quota_id, (usedMap.get(reg.round_section_quota_id) ?? 0) + 1)
  }

  const sectionMap = new Map((sections ?? []).map(s => [s.id, s.name]))
  const quotaTable: Record<string, any[]> = {}
  const chartData: Record<string, any[]> = {}

  for (const round of rounds) {
    const roundQuotas = (quotas ?? []).filter(q => q.round_id === round.id)

    const sectionMap2 = new Map<string, any[]>()
    for (const q of roundQuotas) {
      if (!sectionMap2.has(q.section_id)) sectionMap2.set(q.section_id, [])
      const used = usedMap.get(q.id) ?? 0
      sectionMap2.get(q.section_id)!.push({
        northstar_type_id: q.northstar_type_id,
        quota: q.quota,
        used,
        remaining: q.quota - used,
      })
    }

    quotaTable[round.id] = Array.from(sectionMap2.entries()).map(([sid, types]) => ({
      sectionId: sid,
      sectionName: sectionMap.get(sid) ?? sid,
      types,
      totalQuota: types.reduce((s, t) => s + t.quota, 0),
      totalUsed: types.reduce((s, t) => s + t.used, 0),
      totalRemaining: types.reduce((s, t) => s + t.remaining, 0),
    }))

    const typeRows = new Map<string, any>()
    for (const nt of northstarTypes ?? []) {
      typeRows.set(nt.id, { type: nt.name })
    }
    for (const q of roundQuotas) {
      const used = usedMap.get(q.id) ?? 0
      const remaining = q.quota - used
      const row = typeRows.get(q.northstar_type_id)
      if (row) {
        const sName = sectionMap.get(q.section_id) ?? q.section_id
        row[`${sName}__used`] = (row[`${sName}__used`] ?? 0) + used
        row[`${sName}__remaining`] = (row[`${sName}__remaining`] ?? 0) + remaining
      }
    }
    chartData[round.id] = Array.from(typeRows.values())
  }

  return NextResponse.json({ rounds, sections, northstarTypes, quotaTable, chartData })
}