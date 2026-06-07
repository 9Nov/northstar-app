'use client'
import { useEffect, useState } from 'react'
import * as XLSX from 'xlsx'
import { Users, Download, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'

interface PendingUser {
  id: string
  name: string
  surname: string
  username: string
  round: string
}

interface SectionGroup {
  sectionId: string
  sectionName: string
  users: PendingUser[]
}

interface Round { id: string; name: string }

export default function PendingPage() {
  const [sections, setSections] = useState<SectionGroup[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [rounds, setRounds] = useState<Round[]>([])
  const [selectedRound, setSelectedRound] = useState('')
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [exporting, setExporting] = useState(false)

  async function load(roundId = '') {
    setLoading(true)
    const url = roundId ? `/api/admin/pending?round_id=${roundId}` : '/api/admin/pending'
    const res = await fetch(url)
    const data = await res.json()
    setSections(data.sections ?? [])
    setTotal(data.total ?? 0)
    setLoading(false)
  }

  async function loadRounds() {
    const res = await fetch('/api/admin/rounds')
    const data = await res.json()
    setRounds(Array.isArray(data) ? data : [])
  }

  useEffect(() => {
    loadRounds()
    load()
  }, [])

  function handleRoundChange(roundId: string) {
    setSelectedRound(roundId)
    load(roundId)
  }

  function toggleSection(sectionId: string) {
    setCollapsed(prev => ({ ...prev, [sectionId]: !prev[sectionId] }))
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
          สถานะ: 'ยังไม่เลือก Northstar Type',
        })
      }
    }
    if (rows.length === 0) { alert('ไม่มีข้อมูล'); setExporting(false); return }
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Pending')
    XLSX.writeFile(wb, `pending-users-${new Date().toISOString().slice(0, 10)}.xlsx`)
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
            <h1 className="text-2xl font-bold text-gray-800">ยังไม่เลือก Northstar Type</h1>
            <p className="text-sm text-gray-500">รายชื่อผู้ที่ยังไม่ได้ลงทะเบียน แยกตาม Section</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => load(selectedRound)}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" title="รีเฟรช">
            <RefreshCw size={16} />
          </button>
          <button onClick={handleExport} disabled={exporting || total === 0}
            className="flex items-center gap-2 bg-brand-navy text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-brand-navy-dark disabled:opacity-40 shadow-sm transition-colors">
            <Download size={15} />
            {exporting ? 'กำลัง Export...' : 'Export Excel'}
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3 mb-5">
        <label className="text-sm font-medium text-gray-600">กรองตามรอบ:</label>
        <select
          value={selectedRound}
          onChange={e => handleRoundChange(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal"
        >
          <option value="">— ทุกรอบ —</option>
          {rounds.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        {!loading && (
          <span className="text-sm text-gray-500 ml-2">
            พบ <span className="font-semibold text-amber-600">{total}</span> คน
          </span>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-teal" />
        </div>
      ) : total === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
          <div className="text-5xl mb-3">🎉</div>
          <p className="text-lg font-semibold text-gray-700">ทุกคนเลือก Northstar Type แล้ว!</p>
          <p className="text-sm text-gray-400 mt-1">ไม่มีผู้ที่ค้างการลงทะเบียน</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sections.map(sec => (
            <div key={sec.sectionId} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              {/* Section header */}
              <button
                onClick={() => toggleSection(sec.sectionId)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                  <span className="font-semibold text-gray-800">{sec.sectionName}</span>
                  <span className="text-xs bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full">
                    {sec.users.length} คน
                  </span>
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
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {sec.users.map((u, i) => (
                        <tr key={u.id} className="hover:bg-amber-50/30 transition-colors">
                          <td className="px-4 py-2.5 text-gray-400">{i + 1}</td>
                          <td className="px-4 py-2.5 font-medium text-gray-800">{u.name} {u.surname}</td>
                          <td className="px-4 py-2.5 text-gray-500 font-mono text-xs">{u.username}</td>
                          <td className="px-4 py-2.5 text-gray-500">{u.round}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
