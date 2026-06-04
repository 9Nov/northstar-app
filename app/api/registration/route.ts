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

const ERROR_MESSAGES: Record<string, string> = {
  'round not open': 'รอบนี้ยังไม่เปิดรับลงทะเบียน หรือปิดแล้ว',
  'quota not found': 'ไม่พบ Quota สำหรับ Section และ Northstar Type ที่เลือก',
  'quota full': 'Quota ของ Section นี้เต็มแล้ว สำหรับ Northstar Type ที่เลือก',
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

  // Call atomic DB function — uses FOR UPDATE lock on quota row to prevent
  // race conditions where concurrent requests both pass the quota check
  const { data, error } = await supabaseAdmin.rpc('register_northstar', {
    p_user_id: userId,
    p_section_id: sectionId,
    p_round_id: roundId,
    p_northstar_type_id: northstar_type_id,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const result = data as { success?: boolean; action?: string; error?: string; status?: number }

  if (result.error) {
    const message = ERROR_MESSAGES[result.error] ?? result.error
    return NextResponse.json({ error: message }, { status: result.status ?? 400 })
  }

  const httpStatus = result.status === 201 ? 201 : 200
  return NextResponse.json({ success: true, action: result.action }, { status: httpStatus })
}