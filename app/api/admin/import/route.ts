import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import bcrypt from 'bcryptjs'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Client sends JSON { rows: PreviewRow[] }
  const body = await req.json()
  const inputRows: any[] = body.rows ?? []

  if (!Array.isArray(inputRows) || inputRows.length === 0) {
    return NextResponse.json({ error: 'ไม่มีข้อมูลที่จะ Import' }, { status: 400 })
  }

  // Load existing usernames, rounds, sections
  const [{ data: existingUsers }, { data: rounds }, { data: sections }] = await Promise.all([
    supabaseAdmin.from('users').select('username'),
    supabaseAdmin.from('rounds').select('id, name'),
    supabaseAdmin.from('sections').select('id, name'),
  ])

  const usernameSet = new Set((existingUsers ?? []).map((u: any) => u.username))
  const roundMap = new Map((rounds ?? []).map((r: any) => [r.name.toLowerCase(), r.id]))
  const sectionMap = new Map((sections ?? []).map((s: any) => [s.name.toLowerCase(), s.id]))

  let successCount = 0
  const errors: { row: number; username: string; reason: string }[] = []

  for (const r of inputRows) {
    const rowNum: number = r.row ?? 0
    const username = String(r.username ?? '').trim()
    const password = String(r.password ?? '').trim()
    const sectionName = String(r.section ?? '').trim()
    const name = String(r.name ?? '').trim()
    const surname = String(r.surname ?? '').trim()
    const roundName = String(r.round ?? '').trim()

    if (!username || !password || !sectionName || !name || !surname || !roundName) {
      errors.push({ row: rowNum, username, reason: 'ข้อมูลไม่ครบถ้วน' })
      continue
    }
    if (usernameSet.has(username)) {
      errors.push({ row: rowNum, username, reason: `username "${username}" ซ้ำในระบบ` })
      continue
    }
    const roundId = roundMap.get(roundName.toLowerCase())
    if (!roundId) {
      errors.push({ row: rowNum, username, reason: `ไม่พบรอบ "${roundName}" ในระบบ` })
      continue
    }
    const sectionId = sectionMap.get(sectionName.toLowerCase())
    if (!sectionId) {
      errors.push({ row: rowNum, username, reason: `ไม่พบ Section "${sectionName}" ในระบบ` })
      continue
    }

    const password_hash = await bcrypt.hash(password, 10)
    const { error } = await supabaseAdmin.from('users').insert({
      username,
      password_hash,
      name,
      surname,
      role: 'user',
      section_id: sectionId,
      round_id: roundId,
    })

    if (error) {
      errors.push({ row: rowNum, username, reason: error.message })
    } else {
      usernameSet.add(username)
      successCount++
    }
  }

  return NextResponse.json({ success: successCount, errors })
}
