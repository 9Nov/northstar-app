'use client'
import { useEffect, useState, useRef } from 'react'
import { Plus, Pencil, Trash2, X, Check, Building2, Upload } from 'lucide-react'
import * as XLSX from 'xlsx'

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

  // Import states
  const fileRef = useRef<HTMLInputElement>(null)
  const [importPreview, setImportPreview] = useState<string[] | null>(null)
  const [importFileName, setImportFileName] = useState('')
  const [importError, setImportError] = useState('')
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ added: number; skipped: string[] } | null>(null)

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

  // --- Excel Import ---
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImportError(''); setImportResult(null); setImportPreview(null)
    setImportFileName(file.name)

    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const json: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' })

        if (json.length === 0) { setImportError('ไฟล์ไม่มีข้อมูล'); return }

        // รับ column ชื่อ section หรือ Section หรือ name
        const firstRow = json[0]
        const colKey = Object.keys(firstRow).find(k =>
          ['section', 'name', 'section name'].includes(k.toLowerCase().trim())
        )
        if (!colKey) {
          setImportError('ไม่พบ column "section" หรือ "name" ในไฟล์')
          return
        }

        const names = json
          .map(r => String(r[colKey] ?? '').trim())
          .filter(n => n.length > 0)

        if (names.length === 0) { setImportError('ไม่มีข้อมูลใน column section'); return }
        setImportPreview(names)
      } catch {
        setImportError('ไม่สามารถอ่านไฟล์ได้ กรุณาใช้ไฟล์ Excel (.xlsx .xls)')
      }
    }
    reader.readAsArrayBuffer(file)
  }

  async function handleImport() {
    if (!importPreview) return
    setImporting(true); setImportResult(null)

    const existingNames = new Set(sections.map(s => s.name.toLowerCase()))
    const toAdd = importPreview.filter(n => !existingNames.has(n.toLowerCase()))
    const skipped = importPreview.filter(n => existingNames.has(n.toLowerCase()))

    let added = 0
    for (const name of toAdd) {
      const res = await fetch('/api/admin/sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (res.ok) added++
    }

    setImporting(false)
    setImportPreview(null)
    setImportFileName('')
    if (fileRef.current) fileRef.current.value = ''
    setImportResult({ added, skipped })
    load()
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-brand-teal-light rounded-xl">
            <Building2 size={22} className="text-brand-teal" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">จัดการ Section</h1>
            <p className="text-sm text-gray-500">เพิ่ม แก้ไข หรือลบ Section ในระบบ</p>
          </div>
        </div>
        <button
          onClick={() => { fileRef.current?.click(); setImportError(''); setImportResult(null) }}
          className="flex items-center gap-2 border border-gray-200 text-gray-600 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm"
        >
          <Upload size={15} />
          Import จาก Excel
        </button>
        <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFileChange} className="hidden" />
      </div>

      {/* Add form */}
      <form onSubmit={handleAdd} className="flex gap-2 mb-4">
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

      {/* Import error */}
      {importError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 mb-4 flex justify-between items-center">
          {importError}
          <button onClick={() => setImportError('')}><X size={14} /></button>
        </div>
      )}

      {/* Import preview */}
      {importPreview && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
          <p className="text-sm font-semibold text-blue-800 mb-2">
            พบ {importPreview.length} Section จากไฟล์ "{importFileName}"
          </p>
          <div className="max-h-36 overflow-y-auto bg-white rounded-lg border border-blue-100 divide-y divide-blue-50 mb-3">
            {importPreview.map((n, i) => (
              <div key={i} className="px-3 py-1.5 text-sm text-gray-700">{n}</div>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={handleImport} disabled={importing}
              className="bg-brand-navy text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-navy-dark disabled:opacity-50">
              {importing ? 'กำลัง Import...' : `Import ${importPreview.length} Section`}
            </button>
            <button onClick={() => { setImportPreview(null); setImportFileName(''); if (fileRef.current) fileRef.current.value = '' }}
              className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 rounded-lg hover:bg-white">
              ยกเลิก
            </button>
          </div>
        </div>
      )}

      {/* Import result */}
      {importResult && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
          <p className="text-sm font-semibold text-green-700 mb-1">✓ Import สำเร็จ {importResult.added} Section</p>
          {importResult.skipped.length > 0 && (
            <p className="text-xs text-gray-500">ข้ามไป {importResult.skipped.length} รายการที่มีอยู่แล้ว</p>
          )}
          <button onClick={() => setImportResult(null)} className="text-xs text-green-600 hover:underline mt-1">ปิด</button>
        </div>
      )}

      {/* Import hint */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs text-gray-500 mb-6">
        รูปแบบ Excel: ต้องมี column ชื่อ <code className="bg-white px-1 rounded">section</code> หรือ <code className="bg-white px-1 rounded">name</code> — แต่ละแถวคือชื่อ Section 1 รายการ
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-teal" />
        </div>
      ) : sections.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Building2 size={48} className="mx-auto mb-3 text-gray-300" />
          <p className="text-base font-medium">ยังไม่มี Section</p>
          <p className="text-sm">เพิ่มทีละรายการด้านบน หรือ Import จาก Excel</p>
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
