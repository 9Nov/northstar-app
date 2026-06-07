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
  const roundId = searchParams.get('round_id') // optional filter

  let query = supabaseAdmin
    .from('registrations')
    .select(`
      users!inner(name, surname, sections(name), rounds(name)),
      round_section_quotas!inner(northstar_types(name))
    `)

  if (roundId) {
    query = query.eq('round_section_quotas.round_id', roundId)
  }

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = (data ?? []).map((r: any) => ({
    ชื่อ: r.users?.name ?? '',
    นามสกุล: r.users?.surname ?? '',
    Section: r.users?.sections?.name ?? '',
    รอบ: r.users?.rounds?.name ?? '',
    'Northstar Type': r.round_section_quotas?.northstar_types?.name ?? '',
  }))

  return NextResponse.json(rows)
}
