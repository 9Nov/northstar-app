'use client'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

const SECTION_COLORS = [
  '#009989','#313283','#FAA61B','#e53e3e','#6366f1',
  '#ec4899','#14b8a6','#f97316','#84cc16','#06b6d4',
  '#a855f7','#f43f5e','#0ea5e9',
]

export default function DashboardPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function loadData() {
    const res = await fetch('/api/dashboard')
    const json = await res.json()
    setData(json)
    setLoading(false)
  }

  // Debounced version — if multiple registration events fire at once,
  // wait 800ms after the last one before refetching (prevents stampede)
  function scheduleReload() {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(loadData, 800)
  }

  useEffect(() => {
    loadData()
    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'registrations' }, scheduleReload)
      .subscribe()
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      supabase.removeChannel(channel)
    }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#009989' }} />
      </div>
    )
  }

  if (!data?.rounds?.length) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-400">
        <p className="text-base">ยังไม่มีรอบการอบรมที่เปิดอยู่ในขณะนี้</p>
      </div>
    )
  }

  const { rounds, sections, northstarTypes, quotaTable, chartData } = data

  return (
    <div className="space-y-8">
      <h1 className="text-xl md:text-2xl font-bold" style={{ color: '#313283' }}>
        Quota Monitor Dashboard
      </h1>

      {rounds.map((round: any) => (
        <div key={round.id} className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#009989' }} />
            <h2 className="text-base md:text-lg font-bold text-gray-800">{round.name}</h2>
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: '#e6f7f5', color: '#009989' }}>
              เปิดอยู่
            </span>
          </div>

          {/* MOBILE: Card per Section */}
          <div className="md:hidden space-y-3">
            {(quotaTable[round.id] ?? []).map((row: any) => {
              const typeData = new Map(row.types.map((t: any) => [t.northstar_type_id, t]))
              return (
                <div key={row.sectionId} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between" style={{ backgroundColor: '#313283' }}>
                    <span className="text-white font-semibold text-sm">{row.sectionName}</span>
                    <span className="text-white/70 text-xs">รวม {row.totalUsed}/{row.totalQuota}</span>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {northstarTypes.map((t: any) => {
                      const cell = typeData.get(t.id) as { quota: number; used: number; remaining: number } | undefined
                      const quota = cell?.quota ?? 0
                      const used = cell?.used ?? 0
                      const remaining = cell?.remaining ?? 0
                      if (quota === 0) return null
                      const isFull = remaining === 0
                      const isLow = remaining <= 2 && !isFull
                      const pct = Math.round((used / quota) * 100)
                      return (
                        <div key={t.id} className="px-4 py-2.5 flex items-center gap-3">
                          <span className="text-sm text-gray-700 w-32 shrink-0">{t.name}</span>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className={`text-xs font-semibold ${isFull ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-gray-600'}`}>
                                {used}/{quota}
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                                ${isFull ? 'bg-red-100 text-red-600' : isLow ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                                {isFull ? 'เต็ม' : `เหลือ ${remaining}`}
                              </span>
                            </div>
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${isFull ? 'bg-red-500' : isLow ? 'bg-amber-400' : 'bg-green-500'}`}
                                style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          {/* DESKTOP: Full Table */}
          <div className="hidden md:block bg-white rounded-2xl border border-gray-200 overflow-x-auto shadow-sm">
            <div className="flex flex-wrap items-center gap-3 px-4 pt-3 pb-2 text-xs text-gray-500 border-b border-gray-100">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-green-500 inline-block" />ยังว่าง</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-400 inline-block" />เหลือน้อย</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-500 inline-block" />เต็มแล้ว</span>
              <span className="text-gray-400">ตัวเลข = ใช้แล้ว / quota</span>
            </div>
            <table className="text-xs w-full border-collapse">
              <thead>
                <tr style={{ backgroundColor: '#313283' }} className="text-white">
                  <th className="sticky left-0 z-10 text-left px-4 py-3 font-semibold min-w-52 border-r border-white/10" style={{ backgroundColor: '#313283' }}>Section</th>
                  {northstarTypes.map((t: any) => (
                    <th key={t.id} className="text-center px-3 py-3 font-semibold whitespace-nowrap border-r border-white/10 last:border-r-0">{t.name}</th>
                  ))}
                  <th className="text-center px-3 py-3 font-semibold border-l border-white/10" style={{ backgroundColor: '#252268' }}>รวม</th>
                </tr>
              </thead>
              <tbody>
                {(quotaTable[round.id] ?? []).map((row: any, i: number) => {
                  const typeData = new Map(row.types.map((t: any) => [t.northstar_type_id, t]))
                  return (
                    <tr key={row.sectionId} className={`border-b border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                      <td className="sticky left-0 z-10 px-4 py-2.5 font-medium text-gray-700 bg-inherit border-r border-gray-200 whitespace-nowrap">{row.sectionName}</td>
                      {northstarTypes.map((t: any) => {
                        const cell = typeData.get(t.id) as { quota: number; used: number; remaining: number } | undefined
                        const quota = cell?.quota ?? 0
                        const used = cell?.used ?? 0
                        const remaining = cell?.remaining ?? 0
                        if (quota === 0) return <td key={t.id} className="text-center px-3 py-2.5 border-r border-gray-100 text-gray-300">—</td>
                        const isFull = remaining === 0
                        const isLow = remaining <= 2 && !isFull
                        const pct = Math.round((used / quota) * 100)
                        return (
                          <td key={t.id} className="px-2 py-2 border-r border-gray-100">
                            <div className="flex flex-col items-center gap-1">
                              <span className={`font-bold text-sm leading-none ${isFull ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-gray-700'}`}>
                                {used}<span className="font-normal text-gray-400 text-xs">/{quota}</span>
                              </span>
                              <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${isFull ? 'bg-red-500' : isLow ? 'bg-amber-400' : 'bg-green-500'}`} style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          </td>
                        )
                      })}
                      <td className="text-center px-3 py-2.5 border-l border-gray-200 bg-gray-50 font-semibold text-gray-700">
                        {row.totalUsed}<span className="font-normal text-gray-400">/{row.totalQuota}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              {quotaTable[round.id]?.length > 0 && (() => {
                const allRows = quotaTable[round.id]
                const grandQuota = allRows.reduce((s: number, r: any) => s + r.totalQuota, 0)
                const grandUsed = allRows.reduce((s: number, r: any) => s + r.totalUsed, 0)
                const perType = new Map<string, { quota: number; used: number; remaining: number }>()
                for (const row of allRows) {
                  for (const t of row.types) {
                    const cur = perType.get(t.northstar_type_id) ?? { quota: 0, used: 0, remaining: 0 }
                    cur.quota += t.quota; cur.used += t.used; cur.remaining += t.remaining
                    perType.set(t.northstar_type_id, cur)
                  }
                }
                return (
                  <tfoot>
                    <tr className="font-bold text-white border-t-2" style={{ backgroundColor: '#313283' }}>
                      <td className="sticky left-0 z-10 px-4 py-3 font-bold border-r border-white/10" style={{ backgroundColor: '#313283' }}>รวมทั้งหมด</td>
                      {northstarTypes.map((t: any) => {
                        const tot = perType.get(t.id) ?? { quota: 0, used: 0, remaining: 0 }
                        if (tot.quota === 0) return <td key={t.id} className="text-center px-3 py-3 text-white/30 border-r border-white/10">—</td>
                        const isFull = tot.remaining === 0
                        const pct = Math.round((tot.used / tot.quota) * 100)
                        return (
                          <td key={t.id} className="px-2 py-2 border-r border-white/10">
                            <div className="flex flex-col items-center gap-1">
                              <span className={`font-bold text-sm ${isFull ? 'text-red-300' : 'text-white'}`}>
                                {tot.used}<span className="font-normal text-white/50 text-xs">/{tot.quota}</span>
                              </span>
                              <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${isFull ? 'bg-red-400' : ''}`}
                                  style={{ width: `${pct}%`, backgroundColor: isFull ? undefined : '#009989' }} />
                              </div>
                            </div>
                          </td>
                        )
                      })}
                      <td className="text-center px-3 py-3 border-l border-white/10 font-bold" style={{ backgroundColor: '#252268' }}>
                        {grandUsed}<span className="font-normal text-white/50">/{grandQuota}</span>
                      </td>
                    </tr>
                  </tfoot>
                )
              })()}
            </table>
          </div>

          {/* Bar Chart */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 mb-1">Quota vs ใช้งานจริง</h3>
            <p className="text-xs text-gray-400 mb-3">สีเข้ม = ใช้แล้ว | สีอ่อน = เหลือ</p>
            <ResponsiveContainer width="100%" height={typeof window !== 'undefined' && window.innerWidth < 768 ? 220 : 320}>
              <BarChart data={chartData[round.id] ?? []} barCategoryGap="15%" barGap={1}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="type" tick={{ fontSize: 9, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} width={25} />
                <Tooltip
                  contentStyle={{ borderRadius: '10px', border: '1px solid #e5e7eb', fontSize: 11 }}
                  formatter={(value: any, name: any) => {
                    const safeName = String(name ?? '')
                    const isUsed = safeName.endsWith('__used')
                    const sName = safeName.replace(/__used$|__remaining$/, '')
                    return [value, `${sName} (${isUsed ? 'ใช้แล้ว' : 'เหลือ'})`]
                  }}
                />
                {sections.map((s: any, i: number) => {
                  const baseColor = SECTION_COLORS[i % SECTION_COLORS.length]
                  return [
                    <Bar key={`${s.id}-used`} dataKey={`${s.name}__used`} stackId={s.name} fill={baseColor} opacity={1} name={s.name} />,
                    <Bar key={`${s.id}-rem`} dataKey={`${s.name}__remaining`} stackId={s.name} fill={baseColor} opacity={0.2} legendType="none" name={`${s.name}__rem`} />,
                  ]
                })}
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {sections.map((s: any, i: number) => (
                <span key={s.id} className="flex items-center gap-1 text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded-full border border-gray-200">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: SECTION_COLORS[i % SECTION_COLORS.length] }} />
                  {s.name.replace(' Section', '')}
                </span>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}