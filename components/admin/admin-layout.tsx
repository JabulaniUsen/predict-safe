'use client'

import { ReactNode, useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { 
  LayoutDashboard, 
  FileText, 
  Package, 
  Users,
  Settings,
  LogOut,
  Home,
  Shield,
  CreditCard,
  Receipt,
  Menu,
  X,
  BookOpen,
  Trophy
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface AdminLayoutProps {
  children: ReactNode
}

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  badgeCount?: number
}

const navItems: NavItem[] = [
  {
    href: '/admin',
    label: 'Dashboard',
    icon: <LayoutDashboard className="h-5 w-5 lg:h-6 lg:w-6" />
  },
  {
    href: '/admin/predictions',
    label: 'Predictions',
    icon: <FileText className="h-5 w-5 lg:h-6 lg:w-6" />
  },
  {
    href: '/admin/plans',
    label: 'Plans',
    icon: <Package className="h-5 w-5 lg:h-6 lg:w-6" />
  },
  {
    href: '/admin/payment-methods',
    label: 'Payment Methods',
    icon: <CreditCard className="h-5 w-5 lg:h-6 lg:w-6" />
  },
  {
    href: '/admin/transactions',
    label: 'Transactions',
    icon: <Receipt className="h-5 w-5 lg:h-6 lg:w-6" />
  },
  {
    href: '/admin/users',
    label: 'Users',
    icon: <Users className="h-5 w-5 lg:h-6 lg:w-6" />
  },
  {
    href: '/admin/blog',
    label: 'Blog',
    icon: <BookOpen className="h-5 w-5 lg:h-6 lg:w-6" />
  },
  {
    href: '/admin/vip-wins',
    label: 'VIP Wins',
    icon: <Trophy className="h-5 w-5 lg:h-6 lg:w-6" />
  },
  {
    href: '/admin/config',
    label: 'Config',
    icon: <Settings className="h-5 w-5 lg:h-6 lg:w-6" />
  }
]

export function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [pendingTransactionsCount, setPendingTransactionsCount] = useState(0)
  const [pendingActivationsCount, setPendingActivationsCount] = useState(0)

  useEffect(() => {
    const loadUser = async () => {
      const supabase = createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      setUser(authUser)

      if (authUser) {
        const { data: profile } = await supabase
          .from('users')
          .select('full_name, email, is_admin')
          .eq('id', authUser.id)
          .single()
        setUserProfile(profile)

        // Fetch unread notifications count
        const { count } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', authUser.id)
          .eq('read', false)
        setUnreadCount(count || 0)

        // Fetch pending transactions count
        const { count: pendingTxCount } = await supabase
          .from('transactions')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending')
        setPendingTransactionsCount(pendingTxCount || 0)

        // Fetch pending activations count
        const { count: pendingActivationCount } = await supabase
          .from('user_subscriptions')
          .select('*', { count: 'exact', head: true })
          .eq('plan_status', 'pending_activation')
        setPendingActivationsCount(pendingActivationCount || 0)
      }

      setLoading(false)
    }

    loadUser()
    
    // Refresh counts every 30 seconds
    const interval = setInterval(async () => {
      const supabase = createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser) {
        // Refresh notification count
        const { count } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', authUser.id)
          .eq('read', false)
        setUnreadCount(count || 0)

        // Refresh pending transactions count
        const { count: pendingTxCount } = await supabase
          .from('transactions')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending')
        setPendingTransactionsCount(pendingTxCount || 0)

        // Refresh pending activations count
        const { count: pendingActivationCount } = await supabase
          .from('user_subscriptions')
          .select('*', { count: 'exact', head: true })
          .eq('plan_status', 'pending_activation')
        setPendingActivationsCount(pendingActivationCount || 0)
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success('Logged out successfully')
    router.push('/')
    router.refresh()
  }

  const userName = userProfile?.full_name || user?.email?.split('@')[0] || 'Admin'
  const userInitial = userName.charAt(0).toUpperCase()

  const handleNavClick = () => {
    setMobileMenuOpen(false)
  }

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
          <Link href="/admin" className="flex-shrink-0" onClick={handleNavClick}>
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
            // Get badge count for specific items
            let badgeCount = 0
            if (item.href === '/admin/transactions') {
              // Show combined count of pending transactions and pending activations
              badgeCount = pendingTransactionsCount + pendingActivationsCount
            }
            
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleNavClick}
                  className={`flex items-center justify-between gap-3 lg:gap-4 px-3 lg:px-4 py-2.5 lg:py-3.5 rounded-lg text-sm lg:text-base font-medium transition-colors ${
                  isActive
                      ? 'bg-red-600 text-white shadow-sm'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center gap-3 lg:gap-4">
                  {item.icon}
                  <span>{item.label}</span>
                </div>
                {badgeCount > 0 && (
                  <span className={`flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-semibold ${
                    isActive
                      ? 'bg-white text-red-600'
                      : 'bg-red-600 text-white'
                  }`}>
                    {badgeCount > 99 ? '99+' : badgeCount}
                  </span>
                )}
              </Link>
            )
          })}
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
              View Site
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
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-md hover:bg-gray-100"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
          <div className="flex items-center gap-3">
            {!loading && user && (
              <div className="flex items-center gap-2 pl-3">
                { userProfile?.avatar_url ? 
                <Image src={userProfile?.avatar_url} alt="User Avatar" width={40} height={40} className="w-8 h-8 lg:w-10 lg:h-10 rounded-full object-cover" /> : 
                <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-r from-red-600 to-red-700 rounded-full flex items-center justify-center text-white font-semibold text-sm"> 
                  {userInitial}
                </div> }
                <div className="hidden lg:block text-left">
                  <p className="text-sm font-semibold text-gray-900">{userName}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
              </div>
            )}
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

