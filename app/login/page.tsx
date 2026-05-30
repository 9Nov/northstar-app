'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const res = await signIn('credentials', { username, password, redirect: false })
    setLoading(false)
    if (res?.error) { setError('Username หรือ Password ไม่ถูกต้อง'); return }
    router.push('/')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Left panel */}
      <div className="hidden lg:flex w-1/2 bg-brand-navy flex-col items-center justify-center p-12 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-brand-teal/20 rounded-full" />
        <div className="absolute -bottom-16 -right-16 w-56 h-56 bg-brand-gold/20 rounded-full" />
        <div className="absolute top-1/2 right-0 w-32 h-32 bg-brand-red/10 rounded-full -translate-y-1/2 translate-x-1/2" />

        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="rounded-full bg-white p-4 mb-8 shadow-2xl inline-block">
            <Image src="/care_logo.png" alt="CARE Logo" width={140} height={140} className="object-contain" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-3 text-center">You are the one of Northstar</h1>
          <p className="text-white/70 text-sm leading-relaxed text-center">พร้อมที่จะเป็น Northstar แล้วรึยัง</p>
        </div>

        {/* Color bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gradient-to-r from-brand-teal via-brand-gold to-brand-red" />
      </div>

      {/* Right panel — Login form */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        {/* Mobile logo */}
        <div className="lg:hidden flex flex-col items-center mb-8">
          <Image src="/care_logo.png" alt="CARE Logo" width={80} height={80} className="object-contain mb-2" />
          <p className="font-bold text-brand-navy text-xl">Northstar Management</p>
        </div>

        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-bold text-brand-navy mb-1">ยินดีต้อนรับ</h2>
          <p className="text-gray-500 text-sm mb-8">กรุณาเข้าสู่ระบบเพื่อดำเนินการต่อ</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Username</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                autoComplete="username"
                placeholder="กรอก username"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal focus:border-transparent transition-all placeholder:text-gray-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="กรอก password"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal focus:border-transparent transition-all placeholder:text-gray-400"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-navy text-white py-3 rounded-xl font-semibold hover:bg-brand-navy-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-brand-navy/20 hover:shadow-brand-navy/30"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  กำลังเข้าสู่ระบบ...
                </span>
              ) : 'เข้าสู่ระบบ'}
            </button>
          </form>

          {/* Color accent bar */}
          <div className="mt-10 h-1 rounded-full bg-gradient-to-r from-brand-teal via-brand-gold to-brand-red opacity-40" />
        </div>
      </div>
    </div>
  )
}
