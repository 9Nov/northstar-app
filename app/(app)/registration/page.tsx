'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { CheckCircle, Lock, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function RegistrationPage() {
  const { data: session } = useSession()
  const user = session?.user as any

  const [round, setRound] = useState<any>(null)
  const [registration, setRegistration] = useState<any>(null)
  const [northstarTypes, setNorthstarTypes] = useState<any[]>([])
  const [quotaStatus, setQuotaStatus] = useState<Map<string, any>>(new Map())
  const [selectedTypeId, setSelectedTypeId] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function loadData() {
    const [regRes, typesRes, quotaRes] = await Promise.all([
      fetch('/api/registration'),
      fetch('/api/northstar-types'),
      fetch('/api/registration/quota-status'),
    ])
    const [regData, typesData, quotaData] = await Promise.all([regRes.json(), typesRes.json(), quotaRes.json()])
    setRound(regData.round)
    setRegistration(regData.registration)
    setNorthstarTypes(Array.isArray(typesData) ? typesData : [])
    const qMap = new Map<string, any>()
    for (const q of (Array.isArray(quotaData) ? quotaData : [])) qMap.set(q.northstar_type_id, q)
    setQuotaStatus(qMap)
    if (regData.registration) setSelectedTypeId(regData.registration.round_section_quotas?.northstar_types?.id ?? '')
    setLoading(false)
  }

  async function refreshQuotaStatus() {
    const res = await fetch('/api/registration/quota-status')
    const quotaData = await res.json()
    const qMap = new Map<string, any>()
    for (const q of (Array.isArray(quotaData) ? quotaData : [])) qMap.set(q.northstar_type_id, q)
    setQuotaStatus(qMap)
  }

  useEffect(() => {
    loadData()
    // Only refresh quota counts on realtime change — not full reload
    const channel = supabase.channel('reg-quota-watch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'registrations' }, refreshQuotaStatus)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedTypeId) return
    setError(''); setSuccess(''); setSubmitting(true)
    const res = await fetch('/api/registration', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ northstar_type_id: selectedTypeId }),
    })
    const data = await res.json()
    setSubmitting(false)
    if (!res.ok) { setError(data.error ?? 'เกิดข้อผิดพลาด'); return }
    setSuccess(data.action === 'updated' ? 'แก้ไขการลงทะเบียนสำเร็จ' : 'ลงทะเบียนสำเร็จ')
    await loadData()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-teal" />
      </div>
    )
  }

  if (!user?.round_id) {
    return (
      <div className="max-w-xl mx-auto mt-12 text-center text-gray-500">
        <p>บัญชีของคุณยังไม่ถูกผูกกับรอบการอบรมใดๆ กรุณาติดต่อ Admin</p>
      </div>
    )
  }

  const isOpen = round?.is_open

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-navy">ลงทะเบียน Northstar</h1>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm text-gray-500">รอบ:</span>
          <span className="text-sm font-semibold text-brand-teal">{round?.name}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ml-1
            ${isOpen ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {isOpen ? 'เปิดรับลงทะเบียน' : 'ปิดแล้ว'}
          </span>
        </div>
      </div>

      {!isOpen && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-sm text-amber-800 flex items-start gap-2">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          การลงทะเบียนรอบนี้{registration ? 'ปิดแล้ว ไม่สามารถแก้ไขได้' : 'ยังไม่เปิด หรือปิดแล้ว'}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 grid grid-cols-2 gap-4">
          <div>
            <label className="flex items-center gap-1 text-xs font-medium text-gray-500 mb-1.5">
              <Lock size={11} /> ชื่อ-นามสกุล
            </label>
            <div className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 font-medium">
              {user?.name}
            </div>
          </div>
          <div>
            <label className="flex items-center gap-1 text-xs font-medium text-gray-500 mb-1.5">
              <Lock size={11} /> Section
            </label>
            <div className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 font-medium">
              {(user as any)?.section_name ?? '—'}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            เลือก Northstar Type <span className="text-brand-red">*</span>
          </label>
          <div className="space-y-2">
            {northstarTypes.map(t => {
              const qs = quotaStatus.get(t.id)
              const isFull = qs ? qs.is_full : false
              const isSelected = selectedTypeId === t.id
              const disabled = !isOpen || (isFull && !isSelected)

              return (
                <label key={t.id}
                  className={`flex items-center justify-between gap-3 p-3.5 rounded-xl border-2 transition-all
                    ${disabled ? 'bg-gray-50 border-gray-100 cursor-not-allowed'
                      : isSelected ? 'border-brand-teal bg-brand-teal-light cursor-pointer shadow-sm'
                      : 'border-gray-100 hover:border-brand-teal/40 hover:bg-brand-teal-light/20 cursor-pointer'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0
                      ${isSelected ? 'border-brand-teal' : 'border-gray-300'} ${disabled ? 'opacity-40' : ''}`}>
                      {isSelected && <div className="w-2 h-2 rounded-full bg-brand-teal" />}
                    </div>
                    <input type="radio" name="northstar_type" value={t.id} checked={isSelected}
                      onChange={() => !disabled && setSelectedTypeId(t.id)} disabled={disabled} className="sr-only" />
                    <span className={`text-sm font-medium ${disabled ? 'text-gray-400' : isSelected ? 'text-brand-teal' : 'text-gray-800'}`}>
                      {t.name}
                    </span>
                  </div>
                  {qs && (
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold shrink-0
                      ${isFull ? 'bg-red-100 text-red-600'
                        : qs.remaining <= 2 ? 'bg-amber-100 text-amber-700'
                        : 'bg-green-100 text-green-700'}`}>
                      {isFull ? 'เต็มแล้ว' : `เหลือ ${qs.remaining}`}
                    </span>
                  )}
                </label>
              )
            })}
          </div>

          {error && (
            <div className="mt-4 flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <AlertCircle size={15} className="shrink-0" />{error}
            </div>
          )}
          {success && (
            <div className="mt-4 flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
              <CheckCircle size={15} className="shrink-0" />{success}
            </div>
          )}

          {isOpen && (
            <button type="submit" disabled={submitting || !selectedTypeId}
              className="mt-5 w-full bg-brand-navy text-white py-3 rounded-xl font-semibold hover:bg-brand-navy-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-brand-navy/20">
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  กำลังบันทึก...
                </span>
              ) : registration ? 'แก้ไขการลงทะเบียน' : 'ยืนยันการลงทะเบียน'}
            </button>
          )}
        </form>
      </div>
    </div>
  )
}