import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminLayout } from '@/components/admin/admin-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Database } from '@/types/database'

type UserProfile = Pick<Database['public']['Tables']['users']['Row'], 'is_admin'>

export default async function AdminDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check if user is admin
  const result = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single()
  
  const userProfile = result.data as UserProfile | null

  if (!userProfile?.is_admin) {
    redirect('/dashboard')
  }

  // Get KPIs
  const { count: activeSubscribers } = await supabase
    .from('user_subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('plan_status', 'active')

  const { count: pendingActivations } = await supabase
    .from('user_subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('plan_status', 'pending_activation')

  const { count: newSignups } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

  // Get revenue (today)
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const transactionResult = await supabase
    .from('transactions')
    .select('amount')
    .eq('status', 'completed')
    .gte('created_at', todayStart.toISOString())

  const todayTransactions = transactionResult.data as Array<{ amount: number }> | null
  const dailyRevenue = todayTransactions?.reduce((sum, tx) => sum + parseFloat(tx.amount.toString()), 0) || 0

  // Get recent transactions
  const { data: recentTransactions } = await supabase
    .from('transactions')
    .select(`
      *,
      users(email, full_name),
      plans(name)
    `)
    .order('created_at', { ascending: false })
    .limit(10)

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-sm lg:text-base text-gray-600 mt-1">Overview and management of your platform</p>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-2 border-gray-200 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
              <CardTitle className="text-sm font-medium text-gray-600">Active Subscribers</CardTitle>
              <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                <svg className="h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold text-gray-900">{activeSubscribers || 0}</div>
              <p className="text-xs text-green-600 mt-1">Currently active</p>
            </CardContent>
          </Card>

          <Card className="border-2 border-gray-200 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
              <CardTitle className="text-sm font-medium text-gray-600">Daily Revenue</CardTitle>
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                <svg className="h-4 w-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold text-gray-900">NGN {dailyRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <p className="text-xs text-gray-500 mt-1">Today's revenue</p>
            </CardContent>
          </Card>

          <Card className="border-2 border-gray-200 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
              <CardTitle className="text-sm font-medium text-gray-600">Pending Activations</CardTitle>
              <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center">
                <svg className="h-4 w-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold text-gray-900">{pendingActivations || 0}</div>
              <p className="text-xs text-yellow-600 mt-1">Awaiting review</p>
            </CardContent>
          </Card>

          <Card className="border-2 border-gray-200 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
              <CardTitle className="text-sm font-medium text-gray-600">New Signups (24h)</CardTitle>
              <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                <svg className="h-4 w-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold text-gray-900">{newSignups || 0}</div>
              <p className="text-xs text-gray-500 mt-1">Last 24 hours</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="border-2 border-gray-200 shadow-sm">
          <CardHeader className="p-5 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
                <CardDescription className="text-sm mt-1">Common admin tasks</CardDescription>
              </div>
              <Button asChild className="bg-red-600 hover:bg-red-700 text-white">
                <Link href="/admin/plans">Manage Packages</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-5">
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              <Button asChild variant="outline" className="h-auto py-3">
                <Link href="/admin/predictions">
                  <div className="text-left">
                    <div className="font-semibold">Add Prediction</div>
                    <div className="text-xs text-gray-500">Create new predictions</div>
                  </div>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-auto py-3">
                <Link href="/admin/plans">
                  <div className="text-left">
                    <div className="font-semibold">Manage Plans</div>
                    <div className="text-xs text-gray-500">Edit subscription plans</div>
                  </div>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-auto py-3">
                <Link href="/admin/users">
                  <div className="text-left">
                    <div className="font-semibold">Manage Users</div>
                    <div className="text-xs text-gray-500">View all users</div>
                  </div>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-auto py-3">
                <Link href="/admin/config">
                  <div className="text-left">
                    <div className="font-semibold">Site Config</div>
                    <div className="text-xs text-gray-500">Configure settings</div>
                  </div>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card className="border-2 border-gray-200 shadow-sm">
          <CardHeader className="p-5 border-b border-gray-200">
            <CardTitle className="text-lg font-semibold">Recent Transactions</CardTitle>
            <CardDescription className="text-sm mt-1">Latest payment transactions</CardDescription>
          </CardHeader>
          <CardContent className="p-4 lg:p-6">
            {recentTransactions && recentTransactions.length > 0 ? (
              <div className="space-y-3 lg:space-y-4">
                {recentTransactions.map((tx: any) => (
                  <div key={tx.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b pb-3 lg:pb-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm lg:text-base truncate">
                        {tx.users?.full_name || tx.users?.email || 'Unknown User'}
                      </p>
                      <p className="text-xs lg:text-sm text-muted-foreground">
                        {tx.plans?.name || 'N/A'} - {tx.payment_type}
                      </p>
                    </div>
                    <div className="text-left sm:text-right flex-shrink-0">
                      <p className="font-medium text-sm lg:text-base">
                        {tx.currency} {typeof tx.amount === 'number' 
                          ? tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                          : parseFloat(tx.amount?.toString() || '0').toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                        }
                      </p>
                      <p className="text-xs lg:text-sm text-muted-foreground">{tx.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm lg:text-base text-muted-foreground">No recent transactions</p>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}

