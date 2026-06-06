'use client'
import { useEffect, useState, useMemo } from 'react'
import { getBrowserClient } from '@/lib/supabase'
import { SECTION_COLORS } from '@/lib/constants'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'

interface Round { id: string; name: string; is_open: boolean }
interface Quota { id: string; round_id: string; section_id: string; northstar_type_id: string; quota: number; sections: { id: string; name: string } | null; northstar_types: { id: string; name: string; display_order: number } | null }
interface Registration { id: string; round_section_quota_id: string }

interface Props {
  initialRounds: Round[]
  initialQuotas: Quota[]
  initialRegistrations: Registration[]
}

export default function DashboardClient({ initialRounds, initialQuotas, initialRegistrations }: Props) {
  const [quotas, setQuotas] = useState<Quota[]>(initialQuotas)
  const [registrations, setRegistrations] = useState<Registration[]>(initialRegistrations)
  const [connected, setConnected] = useState(true)

  useEffect(() => {
    const client = getBrowserClient()
    const quotaIds = quotas.map(q => q.id)
    const channel = client
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'registrations' }, async () => {
        const { data } = await client
          .from('registrations')
          .select('id, round_section_quota_id')
          .in('round_section_quota_id', quotaIds)
        if (data) setRegistrations(data)
      })
      .subscribe((status: string) => {
        setConnected(status === 'SUBSCRIBED')
      })

    return () => { client.removeChannel(channel) }
  }, [quotas])

  // Build used count map: quota_id -> count
  const usedMap = useMemo(() => {
    const map: Record<string, number> = {}
    for (const r of registrations) {
      map[r.round_section_quota_id] = (map[r.round_section_quota_id] || 0) + 1
    }
    return map
  }, [registrations])

  // Build sections list (unique across active rounds)
  const sections = useMemo(() => {
    const map = new Map<string, string>()
    for (const q of quotas) {
      if (q.sections) map.set(q.sections.id, q.sections.name)
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name))
  }, [quotas])

  // Build northstar types list sorted by display_order
  const northstarTypes = useMemo(() => {
    const map = new Map<string, { id: string; name: string; display_order: number }>()
    for (const q of quotas) {
      if (q.northstar_types) map.set(q.northstar_types.id, q.northstar_types)
    }
    return Array.from(map.values()).sort((a, b) => a.display_order - b.display_order)
  }, [quotas])

  // Quota table rows: per section - total quota (sum across all northstar types), used
  const quotaRows = useMemo(() => {
    return sections.map(section => {
      const sectionQuotas = quotas.filter(q => q.section_id === section.id)
      const totalQuota = sectionQuotas.reduce((sum, q) => sum + q.quota, 0)
      const used = sectionQuotas.reduce((sum, q) => sum + (usedMap[q.id] || 0), 0)
      return { section_id: section.id, section_name: section.name, total_quota: totalQuota, limit_50: Math.floor(totalQuota * 0.5), used }
    })
  }, [sections, quotas, usedMap])

  // Bar chart data: per northstar type, stacked by section
  const chartData = useMemo(() => {
    return northstarTypes.map(nt => {
      const row: Record<string, string | number> = { northstar_type: nt.name }
      for (const section of sections) {
        const q = quotas.find(q => q.northstar_type_id === nt.id && q.section_id === section.id)
        row[section.name] = q ? (usedMap[q.id] || 0) : 0
      }
      return row
    })
  }, [northstarTypes, sections, quotas, usedMap])

  const totalUsed = quotaRows.reduce((sum, r) => sum + r.used, 0)
  const totalQuota = quotaRows.reduce((sum, r) => sum + r.total_quota, 0)

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-500">Quota Monitor แบบ Real-time — {initialRounds.map(r => r.name).join(', ')}</p>
        </div>
        <div className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-full ${connected ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-yellow-500'} animate-pulse`} />
          {connected ? 'Real-time เชื่อมต่อแล้ว' : 'กำลังเชื่อมต่อ...'}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="text-sm text-gray-500 mb-1">Total Used</div>
          <div className="text-3xl font-bold text-teal-700">{totalUsed}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="text-sm text-gray-500 mb-1">Total Quota</div>
          <div className="text-3xl font-bold text-gray-700">{totalQuota}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="text-sm text-gray-500 mb-1">Sections</div>
          <div className="text-3xl font-bold text-gray-700">{sections.length}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Quota Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-teal-700 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18M10 4v16M7 4H5a2 2 0 00-2 2v12a2 2 0 002 2h2m10 0h2a2 2 0 002-2V6a2 2 0 00-2-2h-2" /></svg>
            Quota Monitor ตาม Section
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-600">
                  <th className="text-left px-3 py-2.5 rounded-l-lg">Section</th>
                  <th className="text-center px-3 py-2.5">Total Quota</th>
                  <th className="text-center px-3 py-2.5">50% Limit</th>
                  <th className="text-center px-3 py-2.5 rounded-r-lg">Used</th>
                </tr>
              </thead>
              <tbody>
                {quotaRows.map(row => (
                  <tr key={row.section_id} className="border-t border-gray-50">
                    <td className="px-3 py-2.5 font-medium text-gray-700">{row.section_name}</td>
                    <td className="px-3 py-2.5 text-center text-gray-600">{row.total_quota}</td>
                    <td className="px-3 py-2.5 text-center text-gray-600">{row.limit_50}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`font-bold ${row.used >= row.limit_50 ? 'text-red-600' : 'text-green-600'}`}>
                        {row.used}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bar Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-teal-700 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            Northstar Type Distribution
          </h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="northstar_type" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {sections.map((section, i) => (
                <Bar key={section.id} dataKey={section.name} stackId="a" fill={SECTION_COLORS[i % SECTION_COLORS.length]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
