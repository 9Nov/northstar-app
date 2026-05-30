'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { LayoutDashboard, ClipboardList, Users, Upload, Settings, X } from 'lucide-react'
import { clsx } from 'clsx'

const userLinks = [
  { href: '/registration', label: 'ลงทะเบียน Northstar', icon: ClipboardList },
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
]
const adminLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/rounds', label: 'จัดการรอบ', icon: Settings },
  { href: '/admin/users', label: 'จัดการ User', icon: Users },
  { href: '/admin/import', label: 'Import Excel', icon: Upload },
]

interface SidebarProps {
  open?: boolean
  onClose?: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const role = (session?.user as any)?.role
  const links = role === 'admin' ? adminLinks : userLinks

  const navContent = (
    <>
      <nav className="flex-1 py-5 space-y-1 px-3">
        {links.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href
          return (
            <Link key={href} href={href} onClick={onClose}
              style={isActive ? { backgroundColor: '#009989' } : {}}
              className={clsx(
                'flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all',
                isActive ? 'text-white shadow-md' : 'text-white hover:bg-white/10'
              )}>
              <Icon size={19} className="text-white shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>
      <div className="h-1 w-full" style={{ background: 'linear-gradient(to right, #009989, #FAA61B, #FF0000)' }} />
    </>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 flex-col shrink-0" style={{ backgroundColor: '#313283' }}>
        {navContent}
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50" onClick={onClose} />
          {/* Drawer */}
          <aside className="relative w-64 flex flex-col h-full" style={{ backgroundColor: '#313283' }}>
            <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
              <span className="text-white font-bold text-base">เมนู</span>
              <button onClick={onClose} className="text-white/70 hover:text-white p-1">
                <X size={20} />
              </button>
            </div>
            {navContent}
          </aside>
        </div>
      )}
    </>
  )
}
