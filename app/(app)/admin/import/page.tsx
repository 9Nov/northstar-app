'use client'
import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { Upload, CheckCircle, XCircle, FileText, File } from 'lucide-react'

export default function AdminImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<any[]>([])
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([])
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ successCount: number; errors: { row: number; reason: string }[] } | null>(null)
  const [importError, setImportError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFile(f: File) {
    setFile(f); setResult(null); setImportError('')
    const reader = new FileReader()
    reader.onload = e => {
      const wb = XLSX.read(e.target?.result, { type: 'array' })
      const sheet = wb.Sheets[wb.SheetNames[0]]
      const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' })
      if (rows.length > 0) { setPreviewHeaders(Object.keys(rows[0])); setPreview(rows.slice(0, 5)) }
    }
    reader.readAsArrayBuffer(f)
  }

  async function handleImport() {
    if (!file) return
    setImporting(true); setImportError(''); setResult(null)
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/admin/import', { method: 'POST', body: fd })
    const data = await res.json()
    setImporting(false)
    if (!res.ok) { setImportError(data.error ?? 'เกิดข้อผิดพลาด'); return }
    setResult(data)
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Import User จาก Excel</h1>

      {/* Upload zone */}
      <div
        className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all
          ${file ? 'border-brand-teal bg-brand-teal-light' : 'border-gray-200 bg-white hover:border-brand-teal hover:bg-brand-teal-light/30'}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
      >
        {file ? (
          <div className="flex flex-col items-center gap-2">
            <File size={36} className="text-brand-teal" />
            <p className="font-semibold text-brand-teal">{file.name}</p>
            <p className="text-xs text-brand-teal/70">คลิกเพื่อเปลี่ยนไฟล์</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload size={36} className="text-gray-300" />
            <p className="font-medium text-gray-600">ลากไฟล์มาวาง หรือคลิกเพื่อเลือกไฟล์</p>
            <p className="text-xs text-gray-400">รองรับไฟล์ .xlsx, .xls</p>
          </div>
        )}
        <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
      </div>

      {/* Column guide */}
      <div className="mt-4 p-4 bg-brand-navy/5 border border-brand-navy/10 rounded-xl text-sm text-brand-navy flex items-start gap-3">
        <FileText size={16} className="shrink-0 mt-0.5 text-brand-teal" />
        <div>
          <p className="font-semibold mb-1">Column ที่ต้องมีในไฟล์:</p>
          <p className="font-mono text-xs bg-white px-3 py-1.5 rounded-lg border border-brand-navy/10 inline-block">
            username, password, section, name, surname, round
          </p>
        </div>
      </div>

      {/* Preview */}
      {preview.length > 0 && (
        <div className="mt-6">
          <p className="text-sm font-medium text-gray-700 mb-2">Preview (5 แถวแรก)</p>
          <div className="overflow-x-auto bg-white rounded-xl border border-gray-200 shadow-sm">
            <table className="text-xs w-full">
              <thead className="bg-brand-navy text-white">
                <tr>{previewHeaders.map(h => <th key={h} className="px-3 py-2.5 text-left font-medium">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {preview.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    {previewHeaders.map(h => <td key={h} className="px-3 py-2 text-gray-700">{String(row[h])}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {importError && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-start gap-2">
          <XCircle size={16} className="shrink-0 mt-0.5" />{importError}
        </div>
      )}

      {file && !result && (
        <button onClick={handleImport} disabled={importing}
          className="mt-4 w-full bg-brand-navy text-white py-3 rounded-xl font-semibold hover:bg-brand-navy-dark disabled:opacity-50 transition-colors shadow-sm">
          {importing ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              กำลัง Import...
            </span>
          ) : 'เริ่ม Import'}
        </button>
      )}

      {/* Result */}
      {result && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl" role="status" aria-live="polite">
            <CheckCircle size={20} className="text-green-600 shrink-0" />
            <span className="text-green-800 font-semibold">สร้างสำเร็จ {result.successCount} คน</span>
          </div>
          {result.errors.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="px-4 py-3 bg-red-50 border-b border-red-100 flex items-center gap-2">
                <XCircle size={14} className="text-red-500" />
                <p className="text-sm font-semibold text-red-700">Error {result.errors.length} แถว</p>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium text-gray-600 w-20">แถวที่</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-600">สาเหตุ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {result.errors.map((e, i) => (
                    <tr key={i}>
                      <td className="px-4 py-2 text-gray-500">{e.row}</td>
                      <td className="px-4 py-2 text-red-600">{e.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <button onClick={() => { setFile(null); setPreview([]); setResult(null); if (inputRef.current) inputRef.current.value = '' }}
            className="text-sm text-brand-teal hover:underline font-medium">
            + Import ไฟล์ใหม่
          </button>
        </div>
      )}
    </div>
  )
}
