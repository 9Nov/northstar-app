import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const roundId = searchParams.get('round_id')

  // Get all users (role=user) with their section and round
  let userQuery = supabaseAdmin
    .from('users')
    .select('id, name, surname, username, sections(id, name), rounds(id, name)')
    .eq('role', 'user')
    .order('name')

  if (roundId) {
    userQuery = userQuery.eq('round_id', roundId)
  }

  const { data: users, error: userErr } = await userQuery
  if (userErr) return NextResponse.json({ error: userErr.message }, { status: 500 })

  // Get all registrations with northstar type name
  const { data: registrations, error: regErr } = await supabaseAdmin
    .from('registrations')
    .select('user_id, round_section_quotas(northstar_types(name))')

  if (regErr) return NextResponse.json({ error: regErr.message }, { status: 500 })

  // Map user_id -> northstar type name
  const regMap = new Map<string, string>()
  for (const r of (registrations ?? [])) {
    const ntName = (r.round_section_quotas as any)?.northstar_types?.name ?? '-'
    regMap.set(r.user_id, ntName)
  }

  // Group all users by section
  const grouped: Record<string, { sectionId: string; sectionName: string; users: any[] }> = {}
  for (const u of (users ?? [])) {
    const sec = u.sections as unknown as { id: string; name: string } | null
    const sectionId = sec?.id ?? 'none'
    const sectionName = sec?.name ?? 'ไม่มี Section'
    if (!grouped[sectionId]) {
      grouped[sectionId] = { sectionId, sectionName, users: [] }
    }
    const northstarType = regMap.get(u.id) ?? null
    grouped[sectionId].users.push({
      id: u.id,
      name: u.name,
      surname: u.surname,
      username: u.username,
      round: (u.rounds as any)?.name ?? '-',
      northstarType,
      registered: regMap.has(u.id),
    })
  }

  const result = Object.values(grouped)
    .sort((a, b) => a.sectionName.localeCompare(b.sectionName, 'th'))

  const totalAll = (users ?? []).length
  const totalPending = (users ?? []).filter((u: any) => !regMap.has(u.id)).length

  return NextResponse.json({ totalAll, totalPending, sections: result })
}
