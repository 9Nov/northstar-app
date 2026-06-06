'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Round { id: string; name: string; is_open: boolean; created_at: string; user_count: number }
interface Section { id: string; name: string }
interface NorthstarType { id: string; name: string; display_order: number }
interface QuotaData { id: string; round_id: string; section_id: string; northstar_type_id: string; quota: number }

interface Props {
  initialRounds: Round[]
  sections: Section[]
  northstarTypes: NorthstarType[]
  initialQuotas: QuotaData[]
}

export default function AdminRoundsClient({ initialRounds, sections, northstarTypes, initialQuotas }: Props) {
  const router = useRouter()
  const [rounds, setRounds] = useState(initialRounds)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showQuotaModal, setShowQuotaModal] = useState<string | null>(null) // round id
  const [confirmClose, setConfirmClose] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Create round form state
  const [newRoundName, setNewRoundName] = useState('')
  const [createError, setCreateError] = useState('')

  // Quota editor state
  const [quotaMap, setQuotaMap] = useState<Record<string, Record<string, string>>>(() => {
    const map: Record<string, Record<string, string>> = {}
    for (const q of initialQuotas) {
      if (!map[q.round_id]) map[q.round_id] = {}
      map[q.round_id][`${q.section_id}__${q.northstar_type_id}`] = String(q.quota)
    }
    return map
  })
  const [quotaError, setQuotaError] = useState('')

  async function handleToggle(round: Round) {
    if (round.is_open) {
      setConfirmClose(round.id)
      return
    }
    await doToggle(round.id, true)
  }

  async function doToggle(roundId: string, newState: boolean) {
    setLoading(true)
    const res = await fetch(`/api/admin/rounds/${roundId}/toggle`, { method: 'POST' })
    setLoading(false)
    if (res.ok) {
      setRounds(prev => prev.map(r => r.id === roundId ? { ...r, is_open: newState } : r))
      setConfirmClose(null)
    }
  }

  async function handleCreateRound() {
    if (!newRoundName.trim()) { setCreateError('กรุณากรอกชื่อรอบ'); return }
    setCreateError('')
    setLoading(true)
    const res = await fetch('/api/admin/rounds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newRoundName.trim() }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setCreateError(data.error || 'เกิดข้อผิดพลาด'); return }
    setNewRoundName('')
    setShowCreateModal(false)
    router.refresh()
  }

  async function handleSaveQuotas(roundId: string) {
    setQuotaError('')
    const entries = []
    const rMap = quotaMap[roundId] || {}

    for (const section of sections) {
      for (const nt of northstarTypes) {
        const key = `${section.id}__${nt.id}`
        const val = parseInt(rMap[key] || '0')
        if (isNaN(val) || val < 0) { setQuotaError('Quota ต้องเป็นตัวเลขที่ไม่ติดลบ'); return }
        if (val > 0) entries.push({ section_id: section.id, northstar_type_id: nt.id, quota: val })
      }
    }

    if (entries.length === 0) { setQuotaError('ต้องกำหนด Quota อย่างน้อย 1 รายการ'); return }

    setLoading(true)
    const res = await fetch(`/api/admin/rounds/${roundId}/quotas`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entries }),
    })
    setLoading(false)
    if (!res.ok) { const d = await res.json(); setQuotaError(d.error || 'เกิดข้อผิดพลาด'); return }
    setShowQuotaModal(null)
    router.refresh()
  }

  function updateQuota(roundId: string, sectionId: string, ntId: string, value: string) {
    setQuotaMap(prev => ({
      ...prev,
      [roundId]: { ...(prev[roundId] || {}), [`${sectionId}__${ntId}`]: value }
    }))
  }

  const editRound = showQuotaModal ? rounds.find(r => r.id === showQuotaModal) : null

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">จัดการรอบการอบรม</h1>
          <p className="text-gray-500">สร้าง แก้ไข และควบคุมการลงทะเบียนต่อรอบ</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-teal-700 hover:bg-teal-800 text-white font-medium px-4 py-2.5 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          สร้างรอบใหม่
        </button>
      </div>

      {rounds.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-lg font-medium">ยังไม่มีรอบการอบรม</p>
          <button onClick={() => setShowCreateModal(true)} className="mt-3 text-teal-600 hover:text-teal-700 font-medium">สร้างรอบแรก</button>
        </div>
      ) : (
        <div className="space-y-4">
          {rounds.map(round => (
            <div key={round.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${round.is_open ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {round.is_open ? 'เปิด' : 'ปิด'}
                  </span>
                  <div>
                    <h3 className="font-semibold text-gray-800">{round.name}</h3>
                    <p className="text-sm text-gray-500">{round.user_count} ผู้ใช้ · สร้าง {new Date(round.created_at).toLocaleDateString('th-TH')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => { setShowQuotaModal(round.id); setQuotaError('') }}
                    className="text-sm text-teal-600 hover:text-teal-800 font-medium px-3 py-1.5 border border-teal-200 rounded-lg hover:bg-teal-50 transition-colors"
                  >
                    กำหนด Quota
                  </button>
                  <button
                    onClick={() => handleToggle(round)}
                    disabled={loading}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${round.is_open ? 'bg-teal-600' : 'bg-gray-200'}`}
                    role="switch"
                    aria-checked={round.is_open}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition duration-200 ease-in-out ${round.is_open ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Round Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">สร้างรอบการอบรมใหม่</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อรอบ</label>
              <input
                type="text"
                value={newRoundName}
                onChange={e => setNewRoundName(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="เช่น รอบ Q1/2025"
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleCreateRound()}
              />
              {createError && <p className="text-red-500 text-sm mt-1">{createError}</p>}
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setShowCreateModal(false); setNewRoundName(''); setCreateError('') }} className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium">ยกเลิก</button>
              <button onClick={handleCreateRound} disabled={loading} className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-medium rounded-lg disabled:opacity-50">
                {loading ? 'กำลังสร้าง...' : 'สร้างรอบ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Close Modal */}
      {confirmClose && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">ยืนยันการปิด Registration</h2>
            <p className="text-gray-500 text-sm mb-5">User ที่ผูกกับรอบนี้จะไม่สามารถลงทะเบียน/แก้ไขได้ทันที คุณต้องการปิดใช่หรือไม่?</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmClose(null)} className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium">ยกเลิก</button>
              <button onClick={() => doToggle(confirmClose, false)} disabled={loading} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg disabled:opacity-50">
                ยืนยันปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quota Editor Modal */}
      {showQuotaModal && editRound && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl shadow-xl max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800">กำหนด Quota — {editRound.name}</h2>
              <p className="text-sm text-gray-500">กรอก Quota ต่อ Section × Northstar Type (0 = ไม่รวม)</p>
            </div>
            <div className="flex-1 overflow-auto p-6">
              {sections.length === 0 ? (
                <p className="text-gray-500 text-sm">ยังไม่มี Section ในระบบ</p>
              ) : (
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left px-3 py-2.5 font-medium text-gray-600 sticky left-0 bg-gray-50">Section</th>
                      {northstarTypes.map(nt => (
                        <th key={nt.id} className="text-center px-3 py-2.5 font-medium text-gray-600 whitespace-nowrap">{nt.name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sections.map(section => (
                      <tr key={section.id} className="border-t border-gray-100">
                        <td className="px-3 py-2.5 font-medium text-gray-700 whitespace-nowrap">{section.name}</td>
                        {northstarTypes.map(nt => (
                          <td key={nt.id} className="px-2 py-2 text-center">
                            <input
                              type="number"
                              min="0"
                              value={quotaMap[showQuotaModal]?.[`${section.id}__${nt.id}`] ?? '0'}
                              onChange={e => updateQuota(showQuotaModal, section.id, nt.id, e.target.value)}
                              className="w-16 text-center px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {quotaError && <p className="text-red-500 text-sm mt-3">{quotaError}</p>}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end">
              <button onClick={() => setShowQuotaModal(null)} className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium">ยกเลิก</button>
              <button onClick={() => handleSaveQuotas(showQuotaModal)} disabled={loading} className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-medium rounded-lg disabled:opacity-50">
                {loading ? 'กำลังบันทึก...' : 'บันทึก Quota'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
