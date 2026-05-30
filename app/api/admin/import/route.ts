import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import * as XLSX from 'xlsx'
import bcrypt from 'bcryptjs'

const REQUIRED_COLUMNS = ['username', 'password', 'section', 'name', 'surname', 'round']

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'ไม่พบไฟล์' }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  let workbook: XLSX.WorkBook
  try {
    workbook = XLSX.read(buffer, { type: 'buffer' })
  } catch {
    return NextResponse.json({ error: 'ไม่สามารถอ่านไฟล์ Excel ได้' }, { status: 400 })
  }

  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' })

  if (rows.length === 0) {
    return NextResponse.json({ error: 'ไฟล์ Excel ว่างเปล่า' }, { status: 400 })
  }

  const headers = Object.keys(rows[0]).map(k => k.toLowerCase().trim())
  const missing = REQUIRED_COLUMNS.filter(c => !headers.includes(c))
  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Column ไม่ครบ — ขาด: ${missing.join(', ')}` },
      { status: 400 }
    )
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
  const errors: { row: number; reason: string }[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowNum = i + 2
    const username = String(row['username'] ?? '').trim()
    const password = String(row['password'] ?? '').trim()
    const sectionName = String(row['section'] ?? '').trim()
    const name = String(row['name'] ?? '').trim()
    const surname = String(row['surname'] ?? '').trim()
    const roundName = String(row['round'] ?? '').trim()

    if (!username || !password || !sectionName || !name || !surname || !roundName) {
      errors.push({ row: rowNum, reason: 'ข้อมูลไม่ครบถ้วน' })
      continue
    }
    if (usernameSet.has(username)) {
      errors.push({ row: rowNum, reason: `username "${username}" ซ้ำในระบบ` })
      continue
    }
    const roundId = roundMap.get(roundName.toLowerCase())
    if (!roundId) {
      errors.push({ row: rowNum, reason: `ไม่พบรอบ "${roundName}" ในระบบ` })
      continue
    }
    const sectionId = sectionMap.get(sectionName.toLowerCase())
    if (!sectionId) {
      errors.push({ row: rowNum, reason: `ไม่พบ Section "${sectionName}" ในระบบ` })
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
      errors.push({ row: rowNum, reason: error.message })
    } else {
      usernameSet.add(username)
      successCount++
    }
  }

  return NextResponse.json({ successCount, errors })
}
