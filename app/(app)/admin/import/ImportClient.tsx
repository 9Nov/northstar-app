'use client'
import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'

interface PreviewRow {
  row: number
  username: string
  name: string
  surname: string
  section: string
  round: string
  password: string
}

interface ImportResult {
  success: number
  errors: Array<{ row: number; username: string; reason: string }>
}

const REQUIRED_COLUMNS = ['username', 'password', 'section', 'name', 'surname', 'round']
const BATCH_SIZE = 30

export default function ImportClient() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<PreviewRow[] | null>(null)
  const [fileError, setFileError] = useState('')
  const [result, setResult] = useState<ImportResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [fileName, setFileName] = useState('')
  const [progress, setProgress] = useState({ done: 0, total: 0 })

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileError(''); setResult(null); setPreview(null)
    setFileName(file.name)

    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const json: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' })

        if (json.length === 0) { setFileError('ไฟล์ไม่มีข้อมูล'); return }

        const headers = Object.keys(json[0]).map(h => h.toLowerCase().trim())
        const missing = REQUIRED_COLUMNS.filter(c => !headers.includes(c))
        if (missing.length > 0) {
          setFileError(`Column ไม่ครบ: ขาด "${missing.join('", "')}"`)
          return
        }

        const rows: PreviewRow[] = json.map((r, i) => ({
          row: i + 2,
          username: String(r['username'] || r['Username'] || '').trim(),
          password: String(r['password'] || r['Password'] || '').trim(),
          section: String(r['section'] || r['Section'] || '').trim(),
          name: String(r['name'] || r['Name'] || '').trim(),
          surname: String(r['surname'] || r['Surname'] || '').trim(),
          round: String(r['round'] || r['Round'] || '').trim(),
        }))

        setPreview(rows)
      } catch {
        setFileError('ไม่สามารถอ่านไฟล์ได้ กรุณาใช้ไฟล์ Excel (.xlsx .xls)')
      }
    }
    reader.readAsArrayBuffer(file)
  }

  async function handleImport() {
    if (!preview) return
    setLoading(true); setResult(null)

    const allErrors: ImportResult['errors'] = []
    let totalSuccess = 0

    // Split into batches of BATCH_SIZE
    const batches: PreviewRow[][] = []
    for (let i = 0; i < preview.length; i += BATCH_SIZE) {
      batches.push(preview.slice(i, i + BATCH_SIZE))
    }

    setProgress({ done: 0, total: preview.length })

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
        // batch timed out — mark all rows in batch as error
        batch.forEach(r => allErrors.push({ row: r.row, username: r.username, reason: 'Timeout — ลองใหม่' }))
      }
      setProgress(prev => ({ ...prev, done: prev.done + batch.length }))
    }

    setLoading(false)
    setResult({ success: totalSuccess, errors: allErrors })
    setPreview(null)
    if (fileRef.current) fileRef.current.value = ''
    setFileName('')
    setProgress({ done: 0, total: 0 })
  }

  function handleReset() {
    setPreview(null); setResult(null); setFileError(''); setFileName('')
    if (fileRef.current) fileRef.current.value = ''
  }

  const progressPct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Import User จาก Excel</h1>
      <p className="text-gray-500 mb-6">อัปโหลดไฟล์ Excel ที่มีคอลัมน์: username, password, section, name, surname, round</p>

      {/* Upload zone */}
      {!preview && !result && !loading && (
        <div
          className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center hover:border-teal-400 transition-colors cursor-pointer"
          onClick={() => fileRef.current?.click()}
        >
          <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          <p className="text-gray-500 mb-1">{fileName || 'คลิกเพื่อเลือกไฟล์ Excel'}</p>
          <p className="text-gray-400 text-xs">รองรับ .xlsx, .xls</p>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFileChange} className="hidden" />
        </div>
      )}

      {fileError && (
        <div className="mt-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">{fileError}</div>
      )}

      {/* Preview table */}
      {preview && !loading && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-700">{fileName} — {preview.length} แถว</h2>
            <button onClick={handleReset} className="text-sm text-gray-500 hover:text-gray-700">เลือกไฟล์ใหม่</button>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-4">
            <div className="overflow-x-auto max-h-72">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50">
                  <tr className="text-gray-600 text-left">
                    <th className="px-3 py-2.5">#</th>
                    <th className="px-3 py-2.5">username</th>
                    <th className="px-3 py-2.5">name</th>
                    <th className="px-3 py-2.5">surname</th>
                    <th className="px-3 py-2.5">section</th>
                    <th className="px-3 py-2.5">round</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0, 50).map(row => (
                    <tr key={row.row} className="border-t border-gray-50 hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-400">{row.row}</td>
                      <td className="px-3 py-2 font-medium text-gray-800">{row.username}</td>
                      <td className="px-3 py-2 text-gray-700">{row.name}</td>
                      <td className="px-3 py-2 text-gray-700">{row.surname}</td>
                      <td className="px-3 py-2 text-gray-600">{row.section}</td>
                      <td className="px-3 py-2 text-gray-600">{row.round}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {preview.length > 50 && <p className="text-xs text-gray-400 mb-3">แสดงเพียง 50 แถวแรก จากทั้งหมด {preview.length} แถว</p>}
          <button
            onClick={handleImport}
            disabled={loading}
            className="bg-teal-700 hover:bg-teal-800 disabled:bg-teal-400 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors"
          >
            Import {preview.length} แถว
          </button>
        </div>
      )}

      {/* Progress */}
      {loading && (
        <div className="mt-6 bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">กำลัง Import...</span>
            <span className="text-sm text-gray-500">{progress.done} / {progress.total} คน</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
            <div
              className="h-3 rounded-full bg-teal-500 transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-2">แบ่งเป็น batch ละ {BATCH_SIZE} คน — กรุณารอสักครู่</p>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="mt-4 space-y-4" role="status" aria-live="polite">
          <div className={`rounded-xl p-5 flex items-center gap-4 ${result.success > 0 ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
            <div className={`text-3xl font-bold ${result.success > 0 ? 'text-green-700' : 'text-gray-500'}`}>{result.success}</div>
            <div>
              <div className={`font-semibold ${result.success > 0 ? 'text-green-700' : 'text-gray-600'}`}>สร้าง User สำเร็จ</div>
              {result.errors.length > 0 && <div className="text-sm text-red-500">{result.errors.length} แถวมีปัญหา</div>}
            </div>
          </div>

          {result.errors.length > 0 && (
            <div className="bg-white rounded-xl border border-red-100 overflow-hidden">
              <div className="px-4 py-3 bg-red-50 border-b border-red-100">
                <h3 className="font-semibold text-red-700">แถวที่มีปัญหา</h3>
              </div>
              <div className="max-h-72 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-gray-50">
                    <tr className="text-gray-600 text-left">
                      <th className="px-4 py-2.5">แถว</th>
                      <th className="px-4 py-2.5">Username</th>
                      <th className="px-4 py-2.5">สาเหตุ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.errors.map((e, i) => (
                      <tr key={i} className="border-t border-gray-50">
                        <td className="px-4 py-2.5 text-gray-500">{e.row}</td>
                        <td className="px-4 py-2.5 font-medium text-gray-700">{e.username || '-'}</td>
                        <td className="px-4 py-2.5 text-red-600">{e.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <button onClick={handleReset} className="text-teal-600 hover:text-teal-800 font-medium text-sm">
            Import ไฟล์ใหม่
          </button>
        </div>
      )}

      {/* Template hint */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
        <strong>รูปแบบไฟล์ Excel:</strong> ต้องมีคอลัมน์ต่อไปนี้ในแถวแรก (header row):
        <code className="block mt-2 bg-white/60 px-3 py-2 rounded font-mono text-xs">
          username | password | section | name | surname | round
        </code>
        <p className="mt-2">ค่า <code>round</code> ต้องตรงกับชื่อรอบที่สร้างไว้ใน Admin Panel</p>
      </div>
    </div>
  )
}
