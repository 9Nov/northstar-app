import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  if (user?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const supabase = createServiceClient()
  const { data: round } = await supabase.from('rounds').select('is_open').eq('id', id).single()
  if (!round) return NextResponse.json({ error: 'ไม่พบรอบ' }, { status: 404 })

  const { error } = await supabase.from('rounds').update({ is_open: !round.is_open }).eq('id', id)
  if (error) return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 })

  return NextResponse.json({ is_open: !round.is_open })
}
