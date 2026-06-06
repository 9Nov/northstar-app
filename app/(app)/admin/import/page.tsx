'use client'
import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { Upload, CheckCircle, XCircle, FileText, File } from 'lucide-react'

const REQUIRED_COLUMNS = ['username', 'password', 'section', 'name', 'surname', 'round']
const BATCH_SIZE = 30

interface PreviewRow {
  row: number
  username: string
  password: string
  section: string
  name: string
  surname: string
  round: string
}

export default function AdminImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [rows, setRows] = useState<PreviewRow[]>([])
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([])
  const [previewRaw, setPreviewRaw] = useState<any[]>([])
  const [fileError, setFileError] = useState('')
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [result, setResult] = useState<{ success: number; errors: { row: number; username: string; reason: string }[] } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFile(f: File) {
    setFile(f); setResult(null); setFileError(''); setRows([]); setPreviewRaw([])
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const wb = XLSX.read(e.target?.result, { type: 'array' })
        const sheet = wb.Sheets[wb.SheetNames[0]]
        const json: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' })
        if (json.length === 0) { setFileError('ไฟล์ไม่มีข้อมูล'); return }

        const headers = Object.keys(json[0])
        const headersLower = headers.map(h => h.toLowerCase().trim())
        const missing = REQUIRED_COLUMNS.filter(c => !headersLower.includes(c))
        if (missing.length > 0) {
          setFileError(`Column ไม่ครบ: ขาด "${missing.join('", "')}"`)
          return
        }

        setPreviewHeaders(headers)
        setPreviewRaw(json.slice(0, 5))

        const parsed: PreviewRow[] = json.map((r, i) => ({
          row: i + 2,
          username: String(r['username'] || r['Username'] || '').trim(),
          password: String(r['password'] || r['Password'] || '').trim(),
          section: String(r['section'] || r['Section'] || '').trim(),
          name: String(r['name'] || r['Name'] || '').trim(),
          surname: String(r['surname'] || r['Surname'] || '').trim(),
          round: String(r['round'] || r['Round'] || '').trim(),
        }))
        setRows(parsed)
      } catch {
        setFileError('ไม่สามารถอ่านไฟล์ได้ กรุณาใช้ไฟล์ .xlsx หรือ .xls')
      }
    }
    reader.readAsArrayBuffer(f)
  }

  async function handleImport() {
    if (rows.length === 0) return
    setImporting(true); setResult(null)

    const allErrors: { row: number; username: string; reason: string }[] = []
    let totalSuccess = 0

    // Split into batches
    const batches: PreviewRow[][] = []
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      batches.push(rows.slice(i, i + BATCH_SIZE))
    }

    setProgress({ done: 0, total: rows.length })

    for (const batch of batches) {
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 30000)
        const res = await fetch('/api/admin/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rows: batch }),
          signal: controller.signal,
        })
        clearTimeout(timeout)
        const data = await res.json()
        totalSuccess += data.success ?? 0
        if (Array.isArray(data.errors)) allErrors.push(...data.errors)
      } catch {
        batch.forEach(r => allErrors.push({ row: r.row, username: r.username, reason: 'Timeout — ลองใหม่' }))
      }
      setProgress(prev => ({ ...prev, done: Math.min(prev.done + batch.length, prev.total) }))
    }

    setImporting(false)
    setResult({ success: totalSuccess, errors: allErrors })
    setProgress({ done: 0, total: 0 })
  }

  function handleReset() {
    setFile(null); setRows([]); setPreviewRaw([]); setResult(null); setFileError('')
    if (inputRef.current) inputRef.current.value = ''
  }

  const progressPct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Import User จาก Excel</h1>

      {/* Upload zone */}
      {!importing && !result && (
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
      )}

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

      {fileError && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-start gap-2">
          <XCircle size={16} className="shrink-0 mt-0.5" />{fileError}
        </div>
      )}

      {/* Preview */}
      {previewRaw.length > 0 && !importing && !result && (
        <div className="mt-6">
          <p className="text-sm font-medium text-gray-700 mb-2">Preview (5 แถวแรก) — พบทั้งหมด {rows.length} แถว</p>
          <div className="overflow-x-auto bg-white rounded-xl border border-gray-200 shadow-sm">
            <table className="text-xs w-full">
              <thead className="bg-brand-navy text-white">
                <tr>{previewHeaders.map(h => <th key={h} className="px-3 py-2.5 text-left font-medium">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {previewRaw.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    {previewHeaders.map(h => <td key={h} className="px-3 py-2 text-gray-700">{String(row[h])}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Import button */}
      {file && rows.length > 0 && !importing && !result && (
        <button onClick={handleImport}
          className="mt-4 w-full bg-brand-navy text-white py-3 rounded-xl font-semibold hover:bg-brand-navy-dark transition-colors shadow-sm">
          เริ่ม Import {rows.length} คน
        </button>
      )}

      {/* Progress bar */}
      {importing && (
        <div className="mt-6 bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">กำลัง Import...</span>
            <span className="text-sm text-gray-500">{progress.done} / {progress.total} คน</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
            <div
              className="h-3 rounded-full bg-brand-teal transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-2">แบ่งเป็น batch ละ {BATCH_SIZE} คน — กรุณารอสักครู่</p>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl" role="status" aria-live="polite">
            <CheckCircle size={20} className="text-green-600 shrink-0" />
            <span className="text-green-800 font-semibold">สร้างสำเร็จ {result.success} คน</span>
          </div>
          {result.errors.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="px-4 py-3 bg-red-50 border-b border-red-100 flex items-center gap-2">
                <XCircle size={14} className="text-red-500" />
                <p className="text-sm font-semibold text-red-700">Error {result.errors.length} แถว</p>
              </div>
              <div className="max-h-72 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-4 py-2 font-medium text-gray-600 w-16">แถว</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-600">Username</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-600">สาเหตุ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {result.errors.map((e, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2 text-gray-500">{e.row}</td>
                        <td className="px-4 py-2 font-medium text-gray-700">{e.username || '-'}</td>
                        <td className="px-4 py-2 text-red-600">{e.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <button onClick={handleReset} className="text-sm text-brand-teal hover:underline font-medium">
            + Import ไฟล์ใหม่
          </button>
        </div>
      )}
    </div>
  )
}
