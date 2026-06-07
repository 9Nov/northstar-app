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

  // Get all registrations (user_id list)
  const { data: registrations, error: regErr } = await supabaseAdmin
    .from('registrations')
    .select('user_id')

  if (regErr) return NextResponse.json({ error: regErr.message }, { status: 500 })

  const registeredIds = new Set((registrations ?? []).map((r: any) => r.user_id))

  // Filter users who have NOT registered
  const pending = (users ?? []).filter((u: any) => !registeredIds.has(u.id))

  // Group by section
  const grouped: Record<string, { sectionId: string; sectionName: string; users: any[] }> = {}
  for (const u of pending) {
    const sectionId = u.sections?.id ?? 'none'
    const sectionName = u.sections?.name ?? 'ไม่มี Section'
    if (!grouped[sectionId]) {
      grouped[sectionId] = { sectionId, sectionName, users: [] }
    }
    grouped[sectionId].users.push({
      id: u.id,
      name: u.name,
      surname: u.surname,
      username: u.username,
      round: (u.rounds as any)?.name ?? '-',
    })
  }

  const result = Object.values(grouped).sort((a, b) =>
    a.sectionName.localeCompare(b.sectionName, 'th')
  )

  return NextResponse.json({ total: pending.length, sections: result })
}
