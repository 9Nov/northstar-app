import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin
    .from('round_section_quotas')
    .select('*, sections(name), northstar_types(name, display_order)')
    .eq('round_id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const quotas = body.entries ?? body.quotas
  if (!Array.isArray(quotas) || quotas.length === 0) {
    return NextResponse.json({ error: 'ต้องมีอย่างน้อย 1 Section พร้อม Quota' }, { status: 400 })
  }

  for (const q of quotas) {
    if (!q.section_id || !q.northstar_type_id || !q.quota || q.quota <= 0) {
      return NextResponse.json({ error: 'Quota ต้องเป็นตัวเลขบวก' }, { status: 400 })
    }
  }

  // Delete existing quotas for this round then re-insert
  const { error: delErr } = await supabaseAdmin
    .from('round_section_quotas')
    .delete()
    .eq('round_id', params.id)

  if (delErr) {
    console.error('[quotas] delete error:', JSON.stringify(delErr))
    return NextResponse.json({ error: delErr.message }, { status: 500 })
  }

  const rows = quotas.map((q: any) => ({
    round_id: params.id,
    section_id: q.section_id,
    northstar_type_id: q.northstar_type_id,
    quota: q.quota,
  }))

  console.log('[quotas] inserting rows:', rows.length)

  const { data, error } = await supabaseAdmin
    .from('round_section_quotas')
    .insert(rows)
    .select()

  if (error) {
    console.error('[quotas] insert error:', JSON.stringify(error))
    return NextResponse.json({ error: error.message, details: error }, { status: 500 })
  }
  return NextResponse.json(data)
}
