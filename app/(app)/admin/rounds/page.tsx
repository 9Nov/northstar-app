'use client'
import { useEffect, useState } from 'react'
import { Plus, ToggleLeft, ToggleRight, ChevronDown, ChevronUp } from 'lucide-react'

export default function AdminRoundsPage() {
  const [rounds, setRounds] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [newRoundName, setNewRoundName] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [toggling, setToggling] = useState<string | null>(null)
  const [confirmClose, setConfirmClose] = useState<string | null>(null)

  async function loadRounds() {
    const res = await fetch('/api/admin/rounds')
    const data = await res.json()
    setRounds(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { loadRounds() }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreateError('')
    setCreating(true)
    const res = await fetch('/api/admin/rounds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newRoundName }),
    })
    const data = await res.json()
    setCreating(false)
    if (!res.ok) { setCreateError(data.error); return }
    setShowModal(false)
    setNewRoundName('')
    loadRounds()
  }

  async function handleToggle(round: any) {
    if (round.is_open) { setConfirmClose(round.id); return }
    doToggle(round.id)
  }

  async function doToggle(id: string) {
    setConfirmClose(null)
    setToggling(id)
    await fetch(`/api/admin/rounds/${id}/toggle`, { method: 'POST' })
    setToggling(null)
    loadRounds()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-teal" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">จัดการรอบการอบรม</h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-brand-navy text-white px-4 py-2 rounded-xl hover:bg-brand-navy-dark transition-colors text-sm font-medium shadow-sm"
        >
          <Plus size={16} /> สร้างรอบใหม่
        </button>
      </div>

      {rounds.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg mb-4">ยังไม่มีรอบการอบรม</p>
          <button onClick={() => setShowModal(true)} className="text-brand-teal hover:underline text-sm font-medium">
            + สร้างรอบแรก
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {rounds.map(round => (
            <RoundRow key={round.id} round={round} toggling={toggling === round.id} onToggle={() => handleToggle(round)} />
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-labelledby="create-round-title">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <h2 id="create-round-title" className="text-lg font-semibold text-brand-navy mb-4">สร้างรอบใหม่</h2>
            <form onSubmit={handleCreate}>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">ชื่อรอบ</label>
              <input
                autoFocus
                value={newRoundName}
                onChange={e => setNewRoundName(e.target.value)}
                placeholder="เช่น Round 2025-Q1"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 mb-2 focus:outline-none focus:ring-2 focus:ring-brand-teal text-sm"
              />
              {createError && <p className="text-red-600 text-sm mb-2">{createError}</p>}
              <div className="flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => { setShowModal(false); setCreateError('') }} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100">ยกเลิก</button>
                <button type="submit" disabled={creating || !newRoundName.trim()} className="px-5 py-2 bg-brand-navy text-white text-sm rounded-xl hover:bg-brand-navy-dark disabled:opacity-50 font-medium">
                  {creating ? 'กำลังสร้าง...' : 'สร้าง'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm close */}
      {confirmClose && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="dialog" aria-modal="true">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">ยืนยันการปิด Registration?</h2>
            <p className="text-sm text-gray-500 mb-6">User ที่ผูกกับรอบนี้จะลงทะเบียนหรือแก้ไขไม่ได้ทันที</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmClose(null)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100">ยกเลิก</button>
              <button onClick={() => doToggle(confirmClose)} className="px-4 py-2 bg-red-600 text-white text-sm rounded-xl hover:bg-red-700 font-medium">ยืนยัน ปิด</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function RoundRow({ round, toggling, onToggle }: { round: any; toggling: boolean; onToggle: () => void }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className={`bg-white rounded-2xl border-2 transition-colors ${round.is_open ? 'border-brand-teal/40' : 'border-gray-100'}`}>
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full ${round.is_open ? 'bg-brand-teal' : 'bg-gray-300'}`} />
          <span className="font-semibold text-gray-800">{round.name}</span>
          <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${round.is_open ? 'bg-brand-teal-light text-brand-teal' : 'bg-gray-100 text-gray-400'}`}>
            {round.is_open ? 'เปิด' : 'ปิด'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onToggle}
            disabled={toggling}
            role="switch"
            aria-checked={round.is_open}
            className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl transition-all font-medium
              ${round.is_open
                ? 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                : 'bg-brand-teal-light text-brand-teal hover:bg-brand-teal/20 border border-brand-teal/30'
              } disabled:opacity-50`}
          >
            {round.is_open ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
            {round.is_open ? 'ปิด' : 'เปิด'} Registration
          </button>
          <button onClick={() => setExpanded(!expanded)} className="p-1.5 text-gray-400 hover:text-brand-navy hover:bg-gray-100 rounded-lg transition-colors">
            {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>
      </div>
      {expanded && (
        <div className="border-t border-gray-100 px-5 py-4">
          <QuotaEditorInline roundId={round.id} />
        </div>
      )}
    </div>
  )
}

function QuotaEditorInline({ roundId }: { roundId: string }) {
  const [sections, setSections] = useState<any[]>([])
  const [northstarTypes, setNorthstarTypes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [localQuotas, setLocalQuotas] = useState<Record<string, string>>({})

  useEffect(() => {
    async function load() {
      const [qRes, sRes, tRes] = await Promise.all([
        fetch(`/api/admin/rounds/${roundId}/quotas`),
        fetch('/api/admin/sections'),
        fetch('/api/northstar-types'),
      ])
      const [qData, sData, tData] = await Promise.all([qRes.json(), sRes.json(), tRes.json()])
      setSections(Array.isArray(sData) ? sData : [])
      setNorthstarTypes(Array.isArray(tData) ? tData : [])
      const map: Record<string, string> = {}
      for (const q of (Array.isArray(qData) ? qData : [])) {
        map[`${q.section_id}_${q.northstar_type_id}`] = String(q.quota)
      }
      setLocalQuotas(map)
      setLoading(false)
    }
    load()
  }, [roundId])

  function handleQuotaChange(sectionId: string, typeId: string, val: string) {
    setLocalQuotas(prev => ({ ...prev, [`${sectionId}_${typeId}`]: val }))
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true); setSaved(false); setSaveError('')
    const rows = []
    for (const s of sections) {
      for (const t of northstarTypes) {
        const val = parseInt(localQuotas[`${s.id}_${t.id}`] ?? '0') || 0
        if (val > 0) rows.push({ section_id: s.id, northstar_type_id: t.id, quota: val })
      }
    }
    if (rows.length === 0) { setSaveError('กรุณากรอก Quota อย่างน้อย 1 ช่อง'); setSaving(false); return }
    const res = await fetch(`/api/admin/rounds/${roundId}/quotas`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quotas: rows }),
    })
    setSaving(false)
    if (res.ok) setSaved(true)
    else setSaveError('บันทึกไม่สำเร็จ')
  }

  if (loading) return <div className="text-sm text-gray-400 py-2">กำลังโหลด...</div>

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-gray-600">กำหนด Quota ต่อ Section × Northstar Type</p>
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="text-xs border-collapse w-full">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 text-left px-3 py-2.5 bg-brand-navy text-white font-semibold min-w-48 border-r border-brand-navy-dark">Section</th>
              {northstarTypes.map(t => (
                <th key={t.id} className="px-2 py-2.5 bg-brand-navy text-white font-semibold min-w-20 text-center whitespace-nowrap border-r border-brand-navy-dark last:border-r-0">{t.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sections.map((s, i) => (
              <tr key={s.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}>
                <td className="sticky left-0 z-10 px-3 py-2 border-b border-r border-gray-200 font-medium text-gray-700 bg-inherit whitespace-nowrap text-xs">{s.name}</td>
                {northstarTypes.map(t => (
                  <td key={t.id} className="border-b border-r border-gray-200 px-1.5 py-1.5 last:border-r-0 text-center">
                    <input
                      type="number" min={0}
                      value={localQuotas[`${s.id}_${t.id}`] ?? ''}
                      onChange={e => handleQuotaChange(s.id, t.id, e.target.value)}
                      placeholder="0"
                      className="w-14 text-center border border-gray-200 rounded-lg px-1 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand-teal focus:border-brand-teal"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-end gap-3 pt-1">
        {saveError && <span className="text-red-500 text-xs">{saveError}</span>}
        {saved && <span className="text-brand-teal text-xs font-medium">✓ บันทึกแล้ว</span>}
        <button onClick={handleSave} disabled={saving}
          className="bg-brand-teal text-white px-5 py-2 rounded-xl text-sm font-medium hover:bg-brand-teal-dark disabled:opacity-50 transition-colors shadow-sm">
          {saving ? 'กำลังบันทึก...' : 'บันทึก Quota'}
        </button>
      </div>
    </div>
  )
}
