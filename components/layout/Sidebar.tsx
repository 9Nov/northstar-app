'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { LayoutDashboard, ClipboardList, Users, Upload, Settings } from 'lucide-react'
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

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const role = (session?.user as any)?.role
  const links = role === 'admin' ? adminLinks : userLinks

  return (
    <aside className="w-56 flex flex-col shrink-0" style={{ backgroundColor: '#313283' }}>
      <nav className="flex-1 py-5 space-y-1 px-3">
        {links.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href
          return (
            <Link
              key={href}
              href={href}
              style={isActive ? { backgroundColor: '#009989' } : {}}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                isActive
                  ? 'text-white shadow-md'
                  : 'text-white hover:bg-white/10'
              )}
            >
              <Icon size={18} className="text-white" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom accent bar */}
      <div className="h-1 w-full" style={{ background: 'linear-gradient(to right, #009989, #FAA61B, #FF0000)' }} />
    </aside>
  )
}
