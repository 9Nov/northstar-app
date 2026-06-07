'use client'
import { useEffect, useState } from 'react'
import * as XLSX from 'xlsx'
import { Users, Download, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'

interface UserRow {
  id: string
  name: string
  surname: string
  username: string
  round: string
  northstarType: string | null
  registered: boolean
}

interface SectionGroup {
  sectionId: string
  sectionName: string
  users: UserRow[]
}

interface Round { id: string; name: string }

export default function PendingPage() {
  const [sections, setSections] = useState<SectionGroup[]>([])
  const [totalAll, setTotalAll] = useState(0)
  const [totalPending, setTotalPending] = useState(0)
  const [loading, setLoading] = useState(true)
  const [rounds, setRounds] = useState<Round[]>([])
  const [selectedRound, setSelectedRound] = useState('')
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [exporting, setExporting] = useState(false)
  const [filter, setFilter] = useState<'all' | 'pending' | 'done'>('all')

  async function load(roundId = '') {
    setLoading(true)
    const url = roundId ? `/api/admin/pending?round_id=${roundId}` : '/api/admin/pending'
    const res = await fetch(url)
    const data = await res.json()
    setSections(data.sections ?? [])
    setTotalAll(data.totalAll ?? 0)
    setTotalPending(data.totalPending ?? 0)
    setLoading(false)
  }

  async function loadRounds() {
    const res = await fetch('/api/admin/rounds')
    const data = await res.json()
    setRounds(Array.isArray(data) ? data : [])
  }

  useEffect(() => { loadRounds(); load() }, [])

  function handleRoundChange(roundId: string) {
    setSelectedRound(roundId)
    load(roundId)
  }

  function toggleSection(sectionId: string) {
    setCollapsed(prev => ({ ...prev, [sectionId]: !prev[sectionId] }))
  }

  function getFilteredUsers(users: UserRow[]) {
    if (filter === 'pending') return users.filter(u => !u.registered)
    if (filter === 'done') return users.filter(u => u.registered)
    return users
  }

  function handleExport() {
    setExporting(true)
    const rows: any[] = []
    for (const sec of sections) {
      for (const u of sec.users) {
        rows.push({
          Section: sec.sectionName,
          ชื่อ: u.name,
          นามสกุล: u.surname,
          Username: u.username,
          รอบ: u.round,
          'Northstar Type': u.northstarType ?? '-',
          สถานะ: u.registered ? 'เลือกแล้ว' : 'ยังไม่เลือก',
        })
      }
    }
    if (rows.length === 0) { alert('ไม่มีข้อมูล'); setExporting(false); return }
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Status')
    XLSX.writeFile(wb, `registration-status-${new Date().toISOString().slice(0, 10)}.xlsx`)
    setExporting(false)
  }

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-50 rounded-xl">
            <Users size={22} className="text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">สถานะการลงทะเบียน</h1>
            <p className="text-sm text-gray-500">รายชื่อทุกคน แยกตาม Section พร้อมสถานะการเลือก</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => load(selectedRound)}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" title="รีเฟรช">
            <RefreshCw size={16} />
          </button>
          <button onClick={handleExport} disabled={exporting || totalAll === 0}
            className="flex items-center gap-2 bg-brand-navy text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-brand-navy-dark disabled:opacity-40 shadow-sm transition-colors">
            <Download size={15} />
            {exporting ? 'กำลัง Export...' : 'Export Excel'}
          </button>
        </div>
      </div>

      {/* Summary cards */}
      {!loading && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-gray-800">{totalAll}</div>
            <div className="text-xs text-gray-500 mt-0.5">ทั้งหมด</div>
          </div>
          <div className="bg-green-50 rounded-xl border border-green-200 p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-green-700">{totalAll - totalPending}</div>
            <div className="text-xs text-green-600 mt-0.5">เลือกแล้ว</div>
          </div>
          <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-amber-600">{totalPending}</div>
            <div className="text-xs text-amber-600 mt-0.5">ยังไม่เลือก</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-600">รอบ:</label>
          <select value={selectedRound} onChange={e => handleRoundChange(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal">
            <option value="">— ทุกรอบ —</option>
            {rounds.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
        <div className="flex rounded-xl border border-gray-200 overflow-hidden text-sm">
          {([['all', 'ทั้งหมด'], ['done', 'เลือกแล้ว'], ['pending', 'ยังไม่เลือก']] as const).map(([val, label]) => (
            <button key={val} onClick={() => setFilter(val)}
              className={`px-3 py-2 transition-colors ${filter === val ? 'bg-brand-navy text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-teal" />
        </div>
      ) : (
        <div className="space-y-3">
          {sections.map(sec => {
            const filtered = getFilteredUsers(sec.users)
            if (filtered.length === 0) return null
            const doneCount = sec.users.filter(u => u.registered).length
            return (
              <div key={sec.sectionId} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Section header */}
                <button onClick={() => toggleSection(sec.sectionId)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-brand-teal shrink-0" />
                    <span className="font-semibold text-gray-800">{sec.sectionName}</span>
                    <span className="text-xs bg-gray-100 text-gray-600 font-medium px-2 py-0.5 rounded-full">
                      {sec.users.length} คน
                    </span>
                    <span className="text-xs bg-green-100 text-green-700 font-medium px-2 py-0.5 rounded-full">
                      ✓ {doneCount}
                    </span>
                    {sec.users.length - doneCount > 0 && (
                      <span className="text-xs bg-amber-100 text-amber-700 font-medium px-2 py-0.5 rounded-full">
                        ⏳ {sec.users.length - doneCount}
                      </span>
                    )}
                  </div>
                  {collapsed[sec.sectionId] ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronUp size={16} className="text-gray-400" />}
                </button>

                {/* User list */}
                {!collapsed[sec.sectionId] && (
                  <div className="border-t border-gray-100">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-gray-500 text-xs">
                          <th className="text-left px-4 py-2 font-medium">#</th>
                          <th className="text-left px-4 py-2 font-medium">ชื่อ-นามสกุล</th>
                          <th className="text-left px-4 py-2 font-medium">Username</th>
                          <th className="text-left px-4 py-2 font-medium">รอบ</th>
                          <th className="text-left px-4 py-2 font-medium">Northstar Type</th>
                          <th className="text-left px-4 py-2 font-medium">สถานะ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {filtered.map((u, i) => (
                          <tr key={u.id} className={`transition-colors ${u.registered ? 'hover:bg-green-50/30' : 'hover:bg-amber-50/30'}`}>
                            <td className="px-4 py-2.5 text-gray-400">{i + 1}</td>
                            <td className="px-4 py-2.5 font-medium text-gray-800">{u.name} {u.surname}</td>
                            <td className="px-4 py-2.5 text-gray-500 font-mono text-xs">{u.username}</td>
                            <td className="px-4 py-2.5 text-gray-500 text-xs">{u.round}</td>
                            <td className="px-4 py-2.5 text-gray-700 text-xs">{u.northstarType ?? '—'}</td>
                            <td className="px-4 py-2.5">
                              {u.registered ? (
                                <span className="text-xs bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full">เลือกแล้ว</span>
                              ) : (
                                <span className="text-xs bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full">ยังไม่เลือก</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
