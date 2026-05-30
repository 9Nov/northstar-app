'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

const SECTION_COLORS = [
  '#009989','#313283','#FAA61B','#FF0000','#6366f1',
  '#ec4899','#14b8a6','#f97316','#84cc16','#06b6d4',
  '#a855f7','#f43f5e','#0ea5e9',
]

export default function DashboardPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  async function loadData() {
    const res = await fetch('/api/dashboard')
    const json = await res.json()
    setData(json)
    setLoading(false)
  }

  useEffect(() => {
    loadData()
    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'registrations' }, loadData)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-teal" />
      </div>
    )
  }

  if (!data?.rounds?.length) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-400">
        <p className="text-lg">ยังไม่มีรอบการอบรมที่เปิดอยู่ในขณะนี้</p>
      </div>
    )
  }

  const { rounds, sections, northstarTypes, quotaTable, chartData } = data

  return (
    <div className="space-y-10">
      <h1 className="text-2xl font-bold text-brand-navy">Quota Monitor Dashboard</h1>

      {rounds.map((round: any) => (
        <div key={round.id} className="space-y-5">
          {/* Round header */}
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-brand-teal" />
            <h2 className="text-lg font-bold text-gray-800">{round.name}</h2>
            <span className="text-xs bg-brand-teal-light text-brand-teal px-2.5 py-0.5 rounded-full font-semibold">
              เปิดอยู่
            </span>
          </div>

          {/* Quota Table */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto shadow-sm">
            {/* Legend */}
            <div className="flex flex-wrap items-center gap-4 px-4 pt-3 pb-2 text-xs text-gray-500 border-b border-gray-100">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded-sm bg-green-500" />
                <span>ยังว่าง</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded-sm bg-amber-400" />
                <span>เหลือน้อย (ไม่เกิน 2)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded-sm bg-red-500" />
                <span>เต็มแล้ว</span>
              </span>
              <span className="text-gray-400 ml-2">ตัวเลข = ใช้แล้ว / quota ทั้งหมด</span>
            </div>

            <table className="text-xs w-full border-collapse">
              <thead>
                <tr className="bg-brand-navy text-white">
                  <th className="sticky left-0 z-10 bg-brand-navy text-left px-4 py-3 font-semibold min-w-52 border-r border-white/10">
                    Section
                  </th>
                  {northstarTypes.map((t: any) => (
                    <th key={t.id} className="text-center px-3 py-3 font-semibold whitespace-nowrap border-r border-white/10 last:border-r-0">
                      {t.name}
                    </th>
                  ))}
                  <th className="text-center px-3 py-3 font-semibold border-l border-white/10 bg-brand-navy-dark">
                    รวม
                  </th>
                </tr>
              </thead>
              <tbody>
                {(quotaTable[round.id] ?? []).map((row: any, i: number) => {
                  const typeData = new Map(row.types.map((t: any) => [t.northstar_type_id, t]))
                  return (
                    <tr key={row.sectionId} className={`border-b border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                      <td className="sticky left-0 z-10 px-4 py-2.5 font-medium text-gray-700 bg-inherit border-r border-gray-200 whitespace-nowrap text-xs">
                        {row.sectionName}
                      </td>
                      {northstarTypes.map((t: any) => {
                        const cell = typeData.get(t.id) as { quota: number; used: number; remaining: number } | undefined
                        const quota = cell?.quota ?? 0
                        const used = cell?.used ?? 0
                        const remaining = cell?.remaining ?? 0
                        if (quota === 0) return (
                          <td key={t.id} className="text-center px-3 py-2.5 border-r border-gray-100 last:border-r-0 text-gray-300">—</td>
                        )
                        const isFull = remaining === 0
                        const isLow = remaining <= 2 && !isFull
                        const pct = Math.round((used / quota) * 100)
                        return (
                          <td key={t.id} className="px-2 py-2 border-r border-gray-100 last:border-r-0">
                            <div className="flex flex-col items-center gap-1">
                              <span className={`font-bold text-sm leading-none ${isFull ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-gray-700'}`}>
                                {used}<span className="font-normal text-gray-400 text-xs">/{quota}</span>
                              </span>
                              <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full transition-all ${isFull ? 'bg-red-500' : isLow ? 'bg-amber-400' : 'bg-green-500'}`}
                                  style={{ width: `${pct}%` }} />
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
              {/* Grand total */}
              {quotaTable[round.id]?.length > 0 && (() => {
                const allRows = quotaTable[round.id]
                const grandQuota = allRows.reduce((s: number, r: any) => s + r.totalQuota, 0)
                const grandUsed  = allRows.reduce((s: number, r: any) => s + r.totalUsed, 0)
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
                    <tr className="bg-brand-navy/90 font-bold text-white border-t-2 border-brand-navy">
                      <td className="sticky left-0 z-10 bg-brand-navy px-4 py-3 font-bold border-r border-white/10">รวมทั้งหมด</td>
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
                                <div className={`h-full rounded-full ${isFull ? 'bg-red-400' : 'bg-brand-teal'}`} style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          </td>
                        )
                      })}
                      <td className="text-center px-3 py-3 border-l border-white/10 bg-brand-navy font-bold">
                        {grandUsed}<span className="font-normal text-white/50">/{grandQuota}</span>
                      </td>
                    </tr>
                  </tfoot>
                )
              })()}
            </table>
          </div>

          {/* Bar Chart */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 mb-1">Quota vs ใช้งานจริง แยกตาม Section</h3>
            <p className="text-xs text-gray-400 mb-4">
              สีเข้ม = ใช้ไปแล้ว &nbsp;|&nbsp; สีอ่อน = quota ที่เหลือ &nbsp;|&nbsp; เต็มแท่ง = quota ทั้งหมด
            </p>
            <ResponsiveContainer width="100%" height={340}>
              <BarChart data={chartData[round.id] ?? []} barCategoryGap="20%" barGap={2}
                aria-label="Stacked bar chart quota vs ใช้งานจริง">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="type" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: 12 }}
                  formatter={(value: any, name: any) => {
                    const safeName = String(name ?? '')
                    const isUsed = safeName.endsWith('__used')
                    const sName = safeName.replace(/__used$|__remaining$/, '')
                    return [value, `${sName} (${isUsed ? 'ใช้แล้ว' : 'เหลือ'})`]
                  }}
                />
                <Legend
                  payload={sections.map((s: any, i: number) => ({
                    value: s.name, type: 'rect' as const,
                    color: SECTION_COLORS[i % SECTION_COLORS.length],
                  }))}
                  wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
                />
                {sections.map((s: any, i: number) => {
                  const baseColor = SECTION_COLORS[i % SECTION_COLORS.length]
                  return [
                    <Bar key={`${s.id}-used`} dataKey={`${s.name}__used`} stackId={s.name}
                      fill={baseColor} opacity={1} name={s.name} />,
                    <Bar key={`${s.id}-remaining`} dataKey={`${s.name}__remaining`} stackId={s.name}
                      fill={baseColor} opacity={0.2} legendType="none" name={`${s.name}__remaining`} />,
                  ]
                })}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ))}
    </div>
  )
}
