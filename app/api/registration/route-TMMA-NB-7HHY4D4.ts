import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { userId, quotaId } = await req.json()
  const user = session.user as any
  if (user.id !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const supabase = createServiceClient()

  // Check quota availability
  const { data: quota } = await supabase
    .from('round_section_quotas')
    .select('quota')
    .eq('id', quotaId)
    .single()

  if (!quota) return NextResponse.json({ error: 'ไม่พบ Quota' }, { status: 400 })

  const { count } = await supabase
    .from('registrations')
    .select('id', { count: 'exact', head: true })
    .eq('round_section_quota_id', quotaId)

  if ((count || 0) >= quota.quota) {
    return NextResponse.json({ error: 'Quota เต็มแล้ว กรุณาเลือก Northstar Type อื่น' }, { status: 400 })
  }

  const { error } = await supabase
    .from('registrations')
    .insert({ user_id: userId, round_section_quota_id: quotaId })

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'คุณลงทะเบียนไปแล้ว' }, { status: 400 })
    }
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด กรุณาลองใหม่' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { userId, quotaId, existingRegistrationId } = await req.json()
  const user = session.user as any
  if (user.id !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const supabase = createServiceClient()

  // Check quota availability for new type
  const { data: quota } = await supabase
    .from('round_section_quotas')
    .select('quota')
    .eq('id', quotaId)
    .single()

  if (!quota) return NextResponse.json({ error: 'ไม่พบ Quota' }, { status: 400 })

  const { count } = await supabase
    .from('registrations')
    .select('id', { count: 'exact', head: true })
    .eq('round_section_quota_id', quotaId)

  if ((count || 0) >= quota.quota) {
    return NextResponse.json({ error: 'Quota เต็มแล้ว กรุณาเลือก Northstar Type อื่น' }, { status: 400 })
  }

  const { error } = await supabase
    .from('registrations')
    .update({ round_section_quota_id: quotaId })
    .eq('id', existingRegistrationId)
    .eq('user_id', userId)

  if (error) {
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด กรุณาลองใหม่' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
