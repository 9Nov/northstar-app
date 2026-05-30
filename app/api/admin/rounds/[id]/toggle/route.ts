import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: current, error: fetchErr } = await supabaseAdmin
    .from('rounds')
    .select('is_open')
    .eq('id', params.id)
    .single()

  if (fetchErr || !current) return NextResponse.json({ error: 'Round not found' }, { status: 404 })

  const { data, error } = await supabaseAdmin
    .from('rounds')
    .update({ is_open: !current.is_open })
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
