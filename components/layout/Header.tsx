'use client'
import { signOut, useSession } from 'next-auth/react'
import { LogOut, User } from 'lucide-react'
import Image from 'next/image'

export function Header() {
  const { data: session } = useSession()
  const user = session?.user as any

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-white p-1 shadow-sm">
          <Image src="/care_logo.png" alt="CARE Logo" width={38} height={38} className="object-contain rounded-full" />
        </div>
        <div>
          <p className="font-bold text-brand-navy text-base leading-tight">Northstar Management</p>
          <p className="text-xs text-gray-400 leading-tight">CARE Program</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full px-3 py-1.5">
          <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: '#313283' }}>
            <User size={13} className="text-white" />
          </div>
          <span className="text-sm font-medium text-gray-700">{user?.name}</span>
          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${user?.role === 'admin' ? 'bg-brand-navy text-white' : 'bg-brand-teal-light text-brand-teal'}`}>
            {user?.role === 'admin' ? 'Admin' : 'User'}
          </span>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-red transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50"
          aria-label="ออกจากระบบ"
        >
          <LogOut size={15} />
          <span>ออกจากระบบ</span>
        </button>
      </div>
    </header>
  )
}
