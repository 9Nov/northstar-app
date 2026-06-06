import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase'
import bcrypt from 'bcryptjs'

interface ImportRow {
  row: number
  username: string
  password: string
  section: string
  name: string
  surname: string
  round: string
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  if (user?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { rows }: { rows: ImportRow[] } = await req.json()
  const supabase = createServiceClient()

  // Load existing usernames
  const { data: existingUsers } = await supabase.from('users').select('username')
  const existingSet = new Set((existingUsers || []).map(u => u.username.toLowerCase()))

  // Load rounds
  const { data: rounds } = await supabase.from('rounds').select('id, name')
  const roundMap = new Map((rounds || []).map(r => [r.name.toLowerCase().trim(), r.id]))

  // Load sections
  const { data: sections } = await supabase.from('sections').select('id, name')
  const sectionMap = new Map((sections || []).map(s => [s.name.toLowerCase().trim(), s.id]))

  const errors: Array<{ row: number; username: string; reason: string }> = []
  const toInsert: any[] = []

  for (const row of rows) {
    const { row: rowNum, username, password, section, name, surname, round } = row

    // Validate empty fields
    if (!username || !password || !section || !name || !surname || !round) {
      errors.push({ row: rowNum, username, reason: 'ข้อมูลไม่ครบ มีฟิลด์ว่างเปล่า' })
      continue
    }

    // Unique username
    if (existingSet.has(username.toLowerCase())) {
      errors.push({ row: rowNum, username, reason: `Username "${username}" มีอยู่ในระบบแล้ว` })
      continue
    }

    // Validate round
    const roundId = roundMap.get(round.toLowerCase().trim())
    if (!roundId) {
      errors.push({ row: rowNum, username, reason: `ไม่พบรอบ "${round}" ในระบบ` })
      continue
    }

    // Validate section (auto-create if missing)
    let sectionId = sectionMap.get(section.toLowerCase().trim())
    if (!sectionId) {
      // Auto-create section
      const { data: newSection, error: secErr } = await supabase
        .from('sections')
        .insert({ name: section.trim() })
        .select()
        .single()
      if (secErr || !newSection) {
        // Try to fetch (race condition)
        const { data: existing } = await supabase.from('sections').select('id').eq('name', section.trim()).single()
        if (!existing) { errors.push({ row: rowNum, username, reason: `ไม่สามารถสร้าง Section "${section}"` }); continue }
        sectionId = existing.id
      } else {
        sectionId = newSection.id
      }
      sectionMap.set(section.toLowerCase().trim(), sectionId)
    }

    const password_hash = await bcrypt.hash(password, 10)
    existingSet.add(username.toLowerCase())

    toInsert.push({
      username: username.trim(),
      password_hash,
      name: name.trim(),
      surname: surname.trim(),
      role: 'user',
      section_id: sectionId,
      round_id: roundId,
    })
  }

  let successCount = 0
  if (toInsert.length > 0) {
    const { data, error } = await supabase.from('users').insert(toInsert).select('id')
    if (!error) successCount = data?.length || 0
    else {
      // Partial failures — handle gracefully
      successCount = 0
    }
  }

  return NextResponse.json({ success: successCount, errors })
}
