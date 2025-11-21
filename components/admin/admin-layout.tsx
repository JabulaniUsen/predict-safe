'use client'

import { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface AdminLayoutProps {
  children: ReactNode
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success('Logged out successfully')
    router.push('/')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">PredictSafe Admin</h1>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" asChild>
                <Link href="/">View Site</Link>
              </Button>
              <Button variant="ghost" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <Tabs value={pathname} className="mb-6">
          <TabsList>
            <TabsTrigger value="/admin" asChild>
              <Link href="/admin">Dashboard</Link>
            </TabsTrigger>
            <TabsTrigger value="/admin/predictions" asChild>
              <Link href="/admin/predictions">Predictions</Link>
            </TabsTrigger>
            <TabsTrigger value="/admin/plans" asChild>
              <Link href="/admin/plans">Plans</Link>
            </TabsTrigger>
            <TabsTrigger value="/admin/users" asChild>
              <Link href="/admin/users">Users</Link>
            </TabsTrigger>
            <TabsTrigger value="/admin/config" asChild>
              <Link href="/admin/config">Config</Link>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {children}
      </div>
    </div>
  )
}

