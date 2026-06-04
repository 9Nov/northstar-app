'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Upload, Pencil, Trash2, X, Eye, EyeOff, Search, ChevronLeft, ChevronRight } from 'lucide-react'

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([])
  const [sections, setSections] = useState<any[]>([])
  const [rounds, setRounds] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [editUser, setEditUser] = useState<any>(null)
  const [deleteUser, setDeleteUser] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [form, setForm] = useState({ name: '', surname: '', username: '', section_id: '', round_id: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [search, setSearch] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function loadUsers(q: string, p: number) {
    setLoading(true)
    const params = new URLSearchParams({ page: String(p) })
    if (q) params.set('search', q)
    const res = await fetch(`/api/admin/users?${params}`)
    const data = await res.json()
    setUsers(Array.isArray(data.users) ? data.users : [])
    setTotal(data.total ?? 0)
    setTotalPages(data.totalPages ?? 1)
    setLoading(false)
  }

  async function loadMeta() {
    const [sRes, rRes] = await Promise.all([
      fetch('/api/admin/sections'),
      fetch('/api/admin/rounds'),
    ])
    const [sData, rData] = await Promise.all([sRes.json(), rRes.json()])
    setSections(Array.isArray(sData) ? sData : [])
    setRounds(Array.isArray(rData) ? rData : [])
  }

  useEffect(() => {
    loadMeta()
    loadUsers('', 1)
  }, [])

  function handleSearchChange(value: string) {
    setSearch(value)
    setPage(1)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => loadUsers(value, 1), 400)
  }

  function handlePageChange(p: number) {
    setPage(p)
    loadUsers(search, p)
  }

  function openEdit(u: any) {
    setEditUser(u)
    setForm({ name: u.name, surname: u.surname, username: u.username, section_id: u.section_id ?? '', round_id: u.round_id ?? '', password: '' })
    setSaveError('')
    setShowPassword(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setSaveError('')
    const res = await fetch(`/api/admin/users/${editUser.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setSaveError(data.error); return }
    setEditUser(null)
    loadUsers(search, page)
  }

  async function handleDelete() {
    setDeleting(true)
    await fetch(`/api/admin/users/${deleteUser.id}`, { method: 'DELETE' })
    setDeleting(false); setDeleteUser(null)
    loadUsers(search, page)
  }

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">จัดการ User</h1>
        <Link href="/admin/import"
          className="flex items-center gap-2 bg-brand-navy text-white px-4 py-2 rounded-xl hover:bg-brand-navy-dark transition-colors text-sm font-medium shadow-sm">
          <Upload size={16} /> Import จาก Excel
        </Link>
      </div>

      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="text" placeholder="ค้นหา username หรือชื่อ..."
          value={search} onChange={e => handleSearchChange(e.target.value)}
          className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-teal" />
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          {total === 0 && !search ? (
            <><p className="text-lg mb-4">ยังไม่มีผู้ใช้ในระบบ</p>
              <Link href="/admin/import" className="text-brand-teal hover:underline text-sm font-medium">Import User จาก Excel</Link></>
          ) : <p>ไม่พบผู้ใช้ที่ค้นหา</p>}
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-brand-navy text-white">
                  <th className="text-left px-4 py-3 font-semibold">Username</th>
                  <th className="text-left px-4 py-3 font-semibold">ชื่อ-นามสกุล</th>
                  <th className="text-left px-4 py-3 font-semibold">Section</th>
                  <th className="text-left px-4 py-3 font-semibold">รอบ</th>
                  <th className="text-left px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 w-20" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-brand-teal-light/40 transition-colors">
                    <td className="px-4 py-3 font-mono text-gray-700 text-xs">{u.username}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{u.name} {u.surname}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{u.sections?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{u.rounds?.name ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold
                        ${u.role === 'admin' ? 'bg-brand-navy text-white' : 'bg-brand-teal-light text-brand-teal'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => openEdit(u)}
                          className="p-1.5 text-gray-400 hover:text-brand-navy hover:bg-brand-teal-light rounded-lg transition-colors" title="แก้ไข">
                          <Pencil size={14} />
                        </button>
                        {u.role !== 'admin' && (
                          <button onClick={() => setDeleteUser(u)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="ลบ">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Footer: count + pagination */}
            <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <span className="text-xs text-gray-400">
                แสดง {users.length} จาก {total} คน
              </span>
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handlePageChange(page - 1)} disabled={page === 1}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-brand-navy hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed">
                    <ChevronLeft size={15} />
                  </button>
                  <span className="text-xs text-gray-600 px-2">หน้า {page} / {totalPages}</span>
                  <button
                    onClick={() => handlePageChange(page + 1)} disabled={page === totalPages}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-brand-navy hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed">
                    <ChevronRight size={15} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Edit Modal */}
      {editUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="bg-brand-navy px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">แก้ไข User</h2>
              <button onClick={() => setEditUser(null)} className="text-white/60 hover:text-white"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">ชื่อ</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">นามสกุล</label>
                  <input value={form.surname} onChange={e => setForm(f => ({ ...f, surname: e.target.value }))} required
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Username</label>
                <input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} required
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-teal" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Section</label>
                <select value={form.section_id} onChange={e => setForm(f => ({ ...f, section_id: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal">
                  <option value="">— ไม่กำหนด —</option>
                  {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">รอบการอบรม</label>
                <select value={form.round_id} onChange={e => setForm(f => ({ ...f, round_id: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal">
                  <option value="">— ไม่กำหนด —</option>
                  {rounds.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  รีเซ็ต Password <span className="text-gray-400 font-normal">(เว้นว่างถ้าไม่เปลี่ยน)</span>
                </label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="ใส่ password ใหม่..."
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-brand-teal" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              {saveError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{saveError}</p>}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setEditUser(null)}
                  className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 rounded-xl hover:bg-gray-100">ยกเลิก</button>
                <button type="submit" disabled={saving}
                  className="px-5 py-2 bg-brand-navy text-white text-sm font-semibold rounded-xl hover:bg-brand-navy-dark disabled:opacity-50 shadow-sm">
                  {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">ยืนยันการลบ User</h2>
            <p className="text-sm text-gray-600 mb-1">ลบ <span className="font-semibold text-gray-800">{deleteUser.name} {deleteUser.surname}</span> ออกจากระบบ?</p>
            <p className="text-xs text-red-500 mb-6">ข้อมูลการลงทะเบียนของ User นี้จะถูกลบด้วย</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteUser(null)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 rounded-xl hover:bg-gray-100">ยกเลิก</button>
              <button onClick={handleDelete} disabled={deleting}
                className="px-5 py-2 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 disabled:opacity-50">
                {deleting ? 'กำลังลบ...' : 'ลบ User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}