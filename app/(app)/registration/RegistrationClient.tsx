'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface QuotaItem {
  id: string
  northstar_type_id: string
  northstar_type_name: string
  northstar_type_order: number
  quota: number
  used: number
}

interface Props {
  userId: string
  userName: string
  sectionName: string
  roundId: string
  roundName: string
  quotaData: QuotaItem[]
  existingRegistrationId: string | null
  existingQuotaId: string | null
  existingNorthstarName: string | null
}

export default function RegistrationClient({
  userId, userName, sectionName, roundId, roundName,
  quotaData, existingRegistrationId, existingQuotaId, existingNorthstarName
}: Props) {
  const router = useRouter()
  const isEdit = !!existingRegistrationId
  const [selectedQuotaId, setSelectedQuotaId] = useState<string>(existingQuotaId || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const sorted = [...quotaData].sort((a, b) => a.northstar_type_order - b.northstar_type_order)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedQuotaId) { setError('กรุณาเลือก Northstar Type'); return }
    if (selectedQuotaId === existingQuotaId) { setError('คุณเลือก Northstar Type เดิม ไม่มีการเปลี่ยนแปลง'); return }

    setError('')
    setLoading(true)

    const res = await fetch('/api/registration', {
      method: isEdit ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        quotaId: selectedQuotaId,
        existingRegistrationId,
        oldQuotaId: existingQuotaId,
      }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error || 'เกิดข้อผิดพลาด กรุณาลองใหม่')
      return
    }

    setSuccess(true)
    setTimeout(() => router.refresh(), 1500)
  }

  if (success) {
    return (
      <div className="p-8 max-w-2xl">
        <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
          <svg className="w-12 h-12 text-green-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-xl font-bold text-green-700 mb-1">
            {isEdit ? 'แก้ไขสำเร็จ!' : 'ลงทะเบียนสำเร็จ!'}
          </h2>
          <p className="text-green-600">ข้อมูลถูกบันทึกเรียบร้อยแล้ว</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-800 mb-1">
        {isEdit ? 'แก้ไขการลงทะเบียน Northstar' : 'ลงทะเบียน Northstar'}
      </h1>
      <p className="text-gray-500 mb-6">รอบ: <span className="font-medium text-teal-700">{roundName}</span></p>

      {isEdit && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg mb-5 text-sm">
          คุณได้ลงทะเบียน <strong>{existingNorthstarName}</strong> ไว้แล้ว สามารถเปลี่ยนได้จากด้านล่าง
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
        {/* Locked fields */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">ชื่อ-นามสกุล</label>
            <div className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-sm">
              {userName}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Section</label>
            <div className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-sm">
              {sectionName}
            </div>
          </div>
        </div>

        {/* Northstar Type selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            เลือก Northstar Type <span className="text-red-500">*</span>
          </label>
          <div className="space-y-2">
            {sorted.map(item => {
              const remaining = item.quota - item.used
              const isFull = remaining <= 0
              const isCurrentSelection = selectedQuotaId === item.id
              const wasMyChoice = existingQuotaId === item.id

              return (
                <label
                  key={item.id}
                  className={`flex items-center justify-between p-3.5 rounded-lg border cursor-pointer transition-all ${
                    isFull && !wasMyChoice
                      ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                      : isCurrentSelection
                      ? 'border-teal-500 bg-teal-50'
                      : 'border-gray-200 hover:border-teal-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="northstar_type"
                      value={item.id}
                      checked={isCurrentSelection}
                      onChange={() => setSelectedQuotaId(item.id)}
                      disabled={isFull && !wasMyChoice}
                      className="w-4 h-4 text-teal-600"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      {item.northstar_type_order}. {item.northstar_type_name}
                      {wasMyChoice && <span className="ml-2 text-xs text-blue-600 font-normal">(ปัจจุบัน)</span>}
                    </span>
                  </div>
                  <div className="text-xs text-right">
                    {isFull && !wasMyChoice ? (
                      <span className="text-red-500 font-medium">เต็มแล้ว</span>
                    ) : (
                      <span className={remaining <= 2 ? 'text-orange-500' : 'text-gray-500'}>
                        เหลือ {remaining} / {item.quota}
                      </span>
                    )}
                  </div>
                </label>
              )
            })}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-teal-700 hover:bg-teal-800 disabled:bg-teal-400 text-white font-semibold py-2.5 rounded-lg transition-colors"
        >
          {loading ? 'กำลังบันทึก...' : isEdit ? 'บันทึกการแก้ไข' : 'ลงทะเบียน'}
        </button>
      </form>
    </div>
  )
}
