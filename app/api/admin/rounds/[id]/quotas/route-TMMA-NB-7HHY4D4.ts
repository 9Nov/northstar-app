import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  if (user?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { entries } = await req.json()
  if (!entries || entries.length === 0) return NextResponse.json({ error: 'ต้องกำหนด Quota อย่างน้อย 1 รายการ' }, { status: 400 })

  const supabase = createServiceClient()
  const { id: roundId } = await params

  // Upsert quotas
  const rows = entries.map((e: any) => ({
    round_id: roundId,
    section_id: e.section_id,
    northstar_type_id: e.northstar_type_id,
    quota: e.quota,
  }))

  const { error } = await supabase
    .from('round_section_quotas')
    .upsert(rows, { onConflict: 'round_id,section_id,northstar_type_id' })

  if (error) return NextResponse.json({ error: 'เกิดข้อผิดพลาด: ' + error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
