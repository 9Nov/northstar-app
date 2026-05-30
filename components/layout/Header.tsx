'use client'
import { signOut, useSession } from 'next-auth/react'
import { LogOut, User, Menu } from 'lucide-react'
import Image from 'next/image'

interface HeaderProps {
  onMenuClick?: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const { data: session } = useSession()
  const user = session?.user as any

  return (
    <header className="h-14 md:h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6 shrink-0 shadow-sm">
      <div className="flex items-center gap-3">
        {/* Hamburger — mobile only */}
        <button onClick={onMenuClick}
          className="md:hidden p-1.5 text-gray-500 hover:text-gray-800 rounded-lg hover:bg-gray-100 mr-1">
          <Menu size={22} />
        </button>
        <div className="rounded-full bg-white p-0.5 shadow-sm border border-gray-100">
          <Image src="/care_logo.png" alt="CARE Logo" width={34} height={34} className="object-contain rounded-full" />
        </div>
        <div className="hidden sm:block">
          <p className="font-bold text-sm leading-tight" style={{ color: '#313283' }}>Northstar Management</p>
          <p className="text-xs text-gray-400 leading-tight">CARE Program</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full px-2.5 py-1.5">
          <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#313283' }}>
            <User size={11} className="text-white" />
          </div>
          <span className="text-xs md:text-sm font-medium text-gray-700 max-w-24 md:max-w-none truncate">
            {user?.name}
          </span>
          <span className={`hidden sm:inline text-xs px-1.5 py-0.5 rounded-full font-medium
            ${user?.role === 'admin' ? 'text-white' : 'text-[#009989]'}`}
            style={user?.role === 'admin' ? { backgroundColor: '#313283' } : { backgroundColor: '#e6f7f5' }}>
            {user?.role === 'admin' ? 'Admin' : 'User'}
          </span>
        </div>
        <button onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-1 text-xs md:text-sm text-gray-500 hover:text-red-600 transition-colors px-2 py-1.5 rounded-lg hover:bg-red-50">
          <LogOut size={14} />
          <span className="hidden sm:inline">ออกจากระบบ</span>
        </button>
      </div>
    </header>
  )
}
