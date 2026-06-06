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

  const errors: { row: number; username: string; reason: string }[] = []
  const validRows: { row: number; username: string; password: string; name: string; surname: string; section_id: string; round_id: string }[] = []

  // 1) Validate all rows first (fast — no hashing yet)
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

    usernameSet.add(username) // prevent duplicates within the same file
    validRows.push({ row: rowNum, username, password, name, surname, section_id: sectionId, round_id: roundId })
  }

  if (validRows.length === 0) {
    return NextResponse.json({ success: 0, errors })
  }

  // 2) Hash all passwords in parallel with cost=4 (fast for bulk import — internal tool)
  const hashed = await Promise.all(
    validRows.map(r => bcrypt.hash(r.password, 4))
  )

  // 3) Batch insert all valid rows at once
  const insertRows = validRows.map((r, i) => ({
    username: r.username,
    password_hash: hashed[i],
    name: r.name,
    surname: r.surname,
    role: 'user',
    section_id: r.section_id,
    round_id: r.round_id,
  }))

  const { error: insertError } = await supabaseAdmin
    .from('users')
    .insert(insertRows)

  if (insertError) {
    return NextResponse.json({ success: 0, errors: [{ row: 0, username: '', reason: insertError.message }] }, { status: 500 })
  }

  return NextResponse.json({ success: validRows.length, errors })
}
