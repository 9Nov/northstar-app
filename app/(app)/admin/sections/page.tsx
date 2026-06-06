'use client'
import { useEffect, useState, useRef } from 'react'
import { Plus, Pencil, Trash2, X, Check, Building2 } from 'lucide-react'

interface Section { id: string; name: string }

export default function AdminSectionsPage() {
  const [sections, setSections] = useState<Section[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Section | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const editRef = useRef<HTMLInputElement>(null)

  async function load() {
    setLoading(true)
    const res = await fetch('/api/admin/sections', { cache: 'no-store' })
    const data = await res.json()
    setSections(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])
  useEffect(() => { if (editId) editRef.current?.focus() }, [editId])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setAdding(true); setAddError('')
    const res = await fetch('/api/admin/sections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() }),
    })
    const data = await res.json()
    setAdding(false)
    if (!res.ok) { setAddError(data.error); return }
    setNewName('')
    setSections(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name, 'th')))
  }

  function startEdit(s: Section) {
    setEditId(s.id); setEditName(s.name)
  }

  async function handleSaveEdit(id: string) {
    if (!editName.trim()) return
    setSaving(true)
    const res = await fetch(`/api/admin/sections/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName.trim() }),
    })
    setSaving(false)
    if (!res.ok) return
    setSections(prev =>
      prev.map(s => s.id === id ? { ...s, name: editName.trim() } : s)
        .sort((a, b) => a.name.localeCompare(b.name, 'th'))
    )
    setEditId(null)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true); setDeleteError('')
    const res = await fetch(`/api/admin/sections/${deleteTarget.id}`, { method: 'DELETE' })
    const data = await res.json()
    setDeleting(false)
    if (!res.ok) { setDeleteError(data.error); return }
    setSections(prev => prev.filter(s => s.id !== deleteTarget.id))
    setDeleteTarget(null)
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-brand-teal-light rounded-xl">
          <Building2 size={22} className="text-brand-teal" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">จัดการ Section</h1>
          <p className="text-sm text-gray-500">เพิ่ม แก้ไข หรือลบ Section ในระบบ</p>
        </div>
      </div>

      {/* Add form */}
      <form onSubmit={handleAdd} className="flex gap-2 mb-6">
        <input
          type="text"
          value={newName}
          onChange={e => { setNewName(e.target.value); setAddError('') }}
          placeholder="ชื่อ Section ใหม่..."
          className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal"
        />
        <button
          type="submit"
          disabled={adding || !newName.trim()}
          className="flex items-center gap-1.5 bg-brand-navy text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-brand-navy-dark disabled:opacity-40 shadow-sm transition-colors"
        >
          <Plus size={16} />
          {adding ? 'กำลังเพิ่ม...' : 'เพิ่ม'}
        </button>
      </form>
      {addError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2 mb-4">{addError}</p>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-teal" />
        </div>
      ) : sections.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Building2 size={48} className="mx-auto mb-3 text-gray-300" />
          <p className="text-base font-medium">ยังไม่มี Section</p>
          <p className="text-sm">เริ่มต้นโดยเพิ่ม Section แรกด้านบน</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
            <span className="text-xs font-medium text-gray-500">{sections.length} Section</span>
          </div>
          <ul className="divide-y divide-gray-100">
            {sections.map(s => (
              <li key={s.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50/60 transition-colors">
                <div className="w-2 h-2 rounded-full bg-brand-teal shrink-0" />

                {editId === s.id ? (
                  <div className="flex-1 flex items-center gap-2">
                    <input
                      ref={editRef}
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleSaveEdit(s.id)
                        if (e.key === 'Escape') setEditId(null)
                      }}
                      className="flex-1 border border-brand-teal rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal"
                    />
                    <button onClick={() => handleSaveEdit(s.id)} disabled={saving}
                      className="p-1.5 text-brand-teal hover:bg-brand-teal-light rounded-lg transition-colors" title="บันทึก">
                      <Check size={15} />
                    </button>
                    <button onClick={() => setEditId(null)}
                      className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors" title="ยกเลิก">
                      <X size={15} />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="flex-1 text-sm font-medium text-gray-800">{s.name}</span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => startEdit(s)}
                        className="p-1.5 text-gray-400 hover:text-brand-navy hover:bg-brand-teal-light rounded-lg transition-colors" title="แก้ไข">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => { setDeleteTarget(s); setDeleteError('') }}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="ลบ">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">ยืนยันการลบ Section</h2>
            <p className="text-sm text-gray-600 mb-1">
              ลบ <span className="font-semibold text-gray-800">"{deleteTarget.name}"</span> ออกจากระบบ?
            </p>
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-5">
              ไม่สามารถลบ Section ที่มี User อยู่ได้
            </p>
            {deleteError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2 mb-4">{deleteError}</p>
            )}
            <div className="flex justify-end gap-3">
              <button onClick={() => { setDeleteTarget(null); setDeleteError('') }}
                className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 rounded-xl hover:bg-gray-100">
                ยกเลิก
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="px-5 py-2 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 disabled:opacity-50">
                {deleting ? 'กำลังลบ...' : 'ลบ Section'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
