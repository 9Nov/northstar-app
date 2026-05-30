import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as any).id
  const roundId = (session.user as any).round_id

  if (!roundId) return NextResponse.json({ registration: null, round: null })

  const [{ data: round }, { data: registration }] = await Promise.all([
    supabaseAdmin.from('rounds').select('id, name, is_open').eq('id', roundId).single(),
    supabaseAdmin
      .from('registrations')
      .select('*, round_section_quotas(*, northstar_types(id, name, display_order))')
      .eq('user_id', userId)
      .maybeSingle(),
  ])

  return NextResponse.json({ registration, round })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'user') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = (session.user as any).id
  const sectionId = (session.user as any).section_id
  const roundId = (session.user as any).round_id
  const { northstar_type_id } = await req.json()

  if (!roundId || !sectionId || !northstar_type_id) {
    return NextResponse.json({ error: 'ข้อมูลไม่ครบถ้วน' }, { status: 400 })
  }

  // Check round is open
  const { data: round } = await supabaseAdmin
    .from('rounds')
    .select('is_open')
    .eq('id', roundId)
    .single()

  if (!round?.is_open) {
    return NextResponse.json({ error: 'รอบนี้ยังไม่เปิดรับลงทะเบียน หรือปิดแล้ว' }, { status: 400 })
  }

  // Find quota row
  const { data: quotaRow } = await supabaseAdmin
    .from('round_section_quotas')
    .select('id, quota')
    .eq('round_id', roundId)
    .eq('section_id', sectionId)
    .eq('northstar_type_id', northstar_type_id)
    .single()

  if (!quotaRow) {
    return NextResponse.json({ error: 'ไม่พบ Quota สำหรับ Section และ Northstar Type ที่เลือก' }, { status: 400 })
  }

  // Count used quota
  const { count: usedCount } = await supabaseAdmin
    .from('registrations')
    .select('*', { count: 'exact', head: true })
    .eq('round_section_quota_id', quotaRow.id)

  if ((usedCount ?? 0) >= quotaRow.quota) {
    return NextResponse.json({ error: 'Quota ของ Section นี้เต็มแล้ว สำหรับ Northstar Type ที่เลือก' }, { status: 400 })
  }

  // Check existing registration
  const { data: existing } = await supabaseAdmin
    .from('registrations')
    .select('id, round_section_quota_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (existing) {
    // UPDATE
    const { error } = await supabaseAdmin
      .from('registrations')
      .update({ round_section_quota_id: quotaRow.id })
      .eq('id', existing.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, action: 'updated' })
  } else {
    // INSERT
    const { error } = await supabaseAdmin
      .from('registrations')
      .insert({ user_id: userId, round_section_quota_id: quotaRow.id })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, action: 'created' }, { status: 201 })
  }
}
