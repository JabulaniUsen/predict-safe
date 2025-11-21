'use client'

import { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface DashboardLayoutProps {
  children: ReactNode
  user: any
  userProfile: any
}

export function DashboardLayout({ children, user, userProfile }: DashboardLayoutProps) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        <Tabs value={pathname} className="mb-6">
          <TabsList className="bg-white">
            <TabsTrigger value="/dashboard" asChild>
              <Link href="/dashboard">Dashboard</Link>
            </TabsTrigger>
            <TabsTrigger value="/dashboard/predictions" asChild>
              <Link href="/dashboard/predictions">Predictions</Link>
            </TabsTrigger>
            <TabsTrigger value="/dashboard/winnings" asChild>
              <Link href="/dashboard/winnings">Winnings</Link>
            </TabsTrigger>
            <TabsTrigger value="/dashboard/settings" asChild>
              <Link href="/dashboard/settings">Settings</Link>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {children}
      </div>
    </div>
  )
}

