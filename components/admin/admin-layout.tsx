'use client'

import { ReactNode, useEffect, useState } from 'react'
import Link from 'next/link'
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
  Receipt
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
}

const navItems: NavItem[] = [
  {
    href: '/admin',
    label: 'Dashboard',
    icon: <LayoutDashboard className="h-5 w-5" />
  },
  {
    href: '/admin/predictions',
    label: 'Predictions',
    icon: <FileText className="h-5 w-5" />
  },
  {
    href: '/admin/plans',
    label: 'Plans',
    icon: <Package className="h-5 w-5" />
  },
  {
    href: '/admin/payment-methods',
    label: 'Payment Methods',
    icon: <CreditCard className="h-5 w-5" />
  },
  {
    href: '/admin/transactions',
    label: 'Transactions',
    icon: <Receipt className="h-5 w-5" />
  },
  {
    href: '/admin/users',
    label: 'Users',
    icon: <Users className="h-5 w-5" />
  },
  {
    href: '/admin/config',
    label: 'Config',
    icon: <Settings className="h-5 w-5" />
  }
]

export function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

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
      }

      setLoading(false)
    }

    loadUser()
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

  return (
    <div className="flex h-screen w-full overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo/Header */}
        <div className="h-16 border-b border-gray-200 flex items-center justify-center px-4">
          <Link href="/admin" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-r from-red-600 to-red-700 rounded-lg flex items-center justify-center text-white font-bold">
              <Shield className="h-5 w-5" />
            </div>
            <span className="font-bold text-lg text-gray-900">PredictSafe Admin</span>
          </Link>
        </div>

        {/* User Profile Section */}
        {!loading && user && (
          <div className="px-4 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-red-600 to-red-700 rounded-full flex items-center justify-center text-white font-semibold">
                {userInitial}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-gray-900 truncate">{userName}</p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-red-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Footer Actions */}
        <div className="border-t border-gray-200 p-3 space-y-1">
          <Button
            variant="ghost"
            className="w-full justify-start text-gray-700 hover:bg-gray-100"
            asChild
          >
            <Link href="/">
              <Home className="h-4 w-4 mr-2" />
              View Site
            </Link>
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              {navItems.find(item => item.href === pathname)?.label || 'Admin Dashboard'}
            </h1>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="h-full p-6">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}

