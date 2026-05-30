import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import bcrypt from 'bcryptjs'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { name, surname, username, section_id, round_id, password } = await req.json()

  if (!name?.trim() || !surname?.trim() || !username?.trim()) {
    return NextResponse.json({ error: 'กรุณากรอกข้อมูลให้ครบ' }, { status: 400 })
  }

  // Check username duplicate (exclude self)
  const { data: existing } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('username', username.trim())
    .neq('id', params.id)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'Username นี้มีอยู่แล้วในระบบ' }, { status: 400 })
  }

  const updates: any = {
    name: name.trim(),
    surname: surname.trim(),
    username: username.trim(),
    section_id: section_id || null,
    round_id: round_id || null,
  }

  if (password?.trim()) {
    updates.password_hash = await bcrypt.hash(password.trim(), 10)
  }

  const { data, error } = await supabaseAdmin
    .from('users')
    .update(updates)
    .eq('id', params.id)
    .select('id, username, name, surname, role, section_id, round_id, sections(name), rounds(name)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { error } = await supabaseAdmin
    .from('users')
    .delete()
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
