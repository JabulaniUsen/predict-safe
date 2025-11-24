'use client'

import { ReactNode, useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { 
  LayoutDashboard, 
  FileText, 
  Trophy, 
  Settings,
  LogOut,
  Home,
  Menu,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface DashboardLayoutProps {
  children: ReactNode
  user: any
  userProfile: any
}

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
}

const navItems: NavItem[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: <LayoutDashboard className="h-5 w-5 lg:h-6 lg:w-6" />
  },
  {
    href: '/dashboard/predictions',
    label: 'Predictions',
    icon: <FileText className="h-5 w-5 lg:h-6 lg:w-6" />
  },
  {
    href: '/dashboard/winnings',
    label: 'Winnings',
    icon: <Trophy className="h-5 w-5 lg:h-6 lg:w-6" />
  },
  // {
  //   href: '/dashboard/settings',
  //   label: 'Settings',
  //   icon: <Settings className="h-5 w-5 lg:h-6 lg:w-6" />
  // }
]

export function DashboardLayout({ children, user, userProfile }: DashboardLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success('Logged out successfully')
    router.push('/')
    router.refresh()
  }

  const userName = userProfile?.full_name || user.email?.split('@')[0] || 'User'
  const userInitial = userName.charAt(0).toUpperCase()

  const handleNavClick = () => {
    setMobileMenuOpen(false)
  }

  useEffect(() => {
    const fetchUnreadCount = async () => {
      if (!user) return
      const supabase = createClient()
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false)
      setUnreadCount(count || 0)
    }

    fetchUnreadCount()
    // Refresh count every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000)
    return () => clearInterval(interval)
  }, [user])

  return (
    <div className="flex h-screen w-full overflow-hidden bg-gray-50">
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-white border-r border-gray-200 flex flex-col
        transform transition-transform duration-300 ease-in-out
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo/Header */}
        <div className="h-16 lg:h-20 border-b border-gray-200 flex items-center justify-between px-4">
          <Link href="/dashboard" className="flex-shrink-0" onClick={handleNavClick}>
            <Image
              src="/logo.png"
              alt="PredictSafe Logo"
              width={60}
              height={60}
              className="w-auto h-12 lg:h-16 object-contain"
              priority
            />
          </Link>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-2 rounded-md hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 lg:px-4 py-4 lg:py-6 space-y-1 lg:space-y-2 overflow-y-auto">
          <div className="mb-4 lg:mb-6">
            <p className="px-3 lg:px-4 text-xs lg:text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2 lg:mb-3">Menu</p>
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleNavClick}
                  className={`flex items-center gap-3 lg:gap-4 px-3 lg:px-4 py-2.5 lg:py-3.5 rounded-lg text-sm lg:text-base font-medium transition-colors ${
                  isActive
                      ? 'bg-[#1e40af] text-white shadow-sm'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            )
          })}
            </div>
          <div className="mt-6 lg:mt-8">
            <p className="px-3 lg:px-4 text-xs lg:text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2 lg:mb-3">General</p>
            <Link
              href="/dashboard/settings"
              onClick={handleNavClick}
              className={`flex items-center gap-3 lg:gap-4 px-3 lg:px-4 py-2.5 lg:py-3.5 rounded-lg text-sm lg:text-base font-medium transition-colors ${
                pathname === '/dashboard/settings'
                  ? 'bg-[#1e40af] text-white shadow-sm'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Settings className="h-5 w-5 lg:h-6 lg:w-6" />
              <span>Settings</span>
            </Link>
          </div>
        </nav>

        {/* Footer Actions */}
        <div className="border-t border-gray-200 p-2 lg:p-4 space-y-1 lg:space-y-2">
          <Button
            variant="ghost"
            className="w-full justify-start text-gray-700 hover:bg-gray-100 text-xs lg:text-base h-9 lg:h-11"
            asChild
          >
            <Link href="/" onClick={handleNavClick}>
              <Home className="h-4 w-4 lg:h-5 lg:w-5 mr-2" />
              Back to Home
            </Link>
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start text-red-600 hover:bg-red-50 hover:text-red-700 text-xs lg:text-base h-9 lg:h-11"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 lg:h-5 lg:w-5 mr-2" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden bg-gray-50">
        {/* Top Bar */}
        <header className="h-16 lg:h-20 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3 flex-1">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-md hover:bg-gray-100"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex-1 max-w-md">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search predictions..."
                  className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                />
                <svg
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="p-2 rounded-lg hover:bg-gray-100 relative">
              <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </button>
            <Link href="/dashboard/notifications" className="p-2 rounded-lg hover:bg-gray-100 relative">
              <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 h-5 w-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
            <div className="flex items-center gap-2 pl-3 border-l border-gray-200">
              <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-r from-[#1e40af] to-[#1e3a8a] rounded-full flex items-center justify-center text-white font-semibold text-sm">
                {userInitial}
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-sm font-semibold text-gray-900">{userName}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="h-full p-3 lg:p-6">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}

