import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase'

async function assertAdmin() {
  const session = await getServerSession(authOptions)
  if (!session) return null
  const user = session.user as any
  return user.role === 'admin' ? session : null
}

export async function POST(req: NextRequest) {
  if (!await assertAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { name } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'กรุณากรอกชื่อรอบ' }, { status: 400 })

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('rounds')
    .insert({ name: name.trim(), is_open: false })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'ชื่อรอบนี้มีอยู่แล้ว' }, { status: 400 })
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 })
  }

  return NextResponse.json(data)
}
