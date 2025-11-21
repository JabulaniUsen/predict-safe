'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Crown, 
  TrendingUp, 
  Calendar, 
  Plus, 
  Lock, 
  ArrowRight, 
  HeadphonesIcon, 
  MessageCircle,
  FileText,
  ScrollText,
  MapPin,
  Mail,
  User,
  Globe,
  LogOut
} from 'lucide-react'
import { formatDate } from '@/lib/utils/date'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface DashboardContentProps {
  user: any
  userProfile: any
  activeSubscriptions: number
  daysSince: number
  memberSince: Date
  subscriptions?: any[]
}

export function DashboardContent({
  user,
  userProfile,
  activeSubscriptions,
  daysSince,
  memberSince,
  subscriptions = [],
}: DashboardContentProps) {
  const router = useRouter()
  const country = userProfile?.countries as any
  const userName = userProfile?.full_name || user.email?.split('@')[0] || 'User'
  const userInitial = userName.charAt(0).toUpperCase()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success('Logged out successfully')
    router.push('/')
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="bg-gradient-to-r from-[#1e40af] to-[#1e3a8a] rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            {/* Avatar */}
            <div className="w-20 h-20 bg-white/20 rounded-lg flex items-center justify-center text-3xl font-bold">
              {userInitial}
            </div>
            
            {/* User Info */}
            <div>
              <h2 className="text-2xl font-bold mb-2">{userName}</h2>
              <div className="flex items-center gap-4 text-blue-100">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <span className="text-sm">{user.email}</span>
                </div>
                {country && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span className="text-sm">{country.name}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              onClick={() => router.push('/dashboard/settings')}
            >
              <User className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
            <Button
              variant="outline"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              onClick={() => router.push('/dashboard/settings')}
            >
              <Globe className="h-4 w-4 mr-2" />
              Country
            </Button>
            <Button
              variant="outline"
              className="bg-red-500/20 border-red-500/30 text-white hover:bg-red-500/30"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* My Subscription Card */}
          <Card className="border-2 border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-yellow-500" />
                My Subscription
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center py-8">
              {activeSubscriptions > 0 ? (
                <>
                  <div className="flex justify-center mb-4">
                    <Crown className="h-16 w-16 text-yellow-500" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2 text-[#22c55e]">
                    {activeSubscriptions} Active {activeSubscriptions === 1 ? 'Subscription' : 'Subscriptions'}
                  </h3>
                  <p className="text-gray-600 mb-6">
                    You have access to premium predictions and features.
                  </p>
                  <Button
                    className="bg-gradient-to-r from-[#1e40af] to-[#1e3a8a] hover:from-[#1e3a8a] hover:to-[#1e40af] text-white font-bold"
                    onClick={() => router.push('/dashboard/predictions')}
                  >
                    View Predictions
                  </Button>
                </>
              ) : (
                <>
                  <div className="flex justify-center mb-4">
                    <Crown className="h-16 w-16 text-yellow-200" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4">No Active Subscription</h3>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    You don't have an active subscription. Subscribe now to unlock premium features and access exclusive content.
                  </p>
                  <Button
                    className="bg-gradient-to-r from-[#1e40af] to-[#1e3a8a] hover:from-[#1e3a8a] hover:to-[#1e40af] text-white font-bold"
                    onClick={() => router.push('/subscribe')}
                  >
                    <Crown className="h-4 w-4 mr-2" />
                    View Available Packages
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Account Activity Card */}
          <Card className="border-2 border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-[#1e40af]" />
                Account Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                {/* Days with us */}
                <div className="text-center">
                  <div className="text-4xl font-bold text-[#1e40af] mb-2">{daysSince}</div>
                  <div className="text-sm text-gray-600 mb-3">Days with us</div>
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                    <Calendar className="h-4 w-4" />
                    <span>Member since {formatDate(memberSince)}</span>
                  </div>
                </div>

                {/* Active Subscriptions */}
                <div className="text-center">
                  <div className="text-4xl font-bold text-[#1e40af] mb-2">{activeSubscriptions}</div>
                  <div className="text-sm text-gray-600 mb-3">Active Subscriptions</div>
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                    <Plus className="h-4 w-4" />
                    <button
                      onClick={() => router.push('/subscribe')}
                      className="hover:text-[#1e40af] hover:underline"
                    >
                      Add more
                    </button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Account Security Card */}
          <Card className="border-2 border-gray-200">
            <CardHeader>
              <CardTitle>Account Security</CardTitle>
            </CardHeader>
            <CardContent>
              <button
                onClick={() => router.push('/dashboard/settings')}
                className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Lock className="h-5 w-5 text-[#1e40af]" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold">Change Password</div>
                    <div className="text-sm text-gray-500">Update your account password</div>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-[#1e40af] transition-colors" />
              </button>
            </CardContent>
          </Card>

          {/* Need Help Card */}
          <Card className="border-2 border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HeadphonesIcon className="h-5 w-5 text-red-500" />
                Need Help?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Our support team is available 24/7 to assist you with any questions or issues.
              </p>
              <Button
                className="w-full bg-red-500 hover:bg-red-600 text-white"
                onClick={() => {
                  // Open support contact
                  window.location.href = 'mailto:support@predictsafe.com'
                }}
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Contact Support
              </Button>
            </CardContent>
          </Card>

          {/* Quick Links Card */}
          <Card className="border-2 border-gray-200">
            <CardHeader>
              <CardTitle>Quick Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link
                href="/privacy"
                className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-gray-400" />
                  <span className="font-medium">Privacy Policy</span>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-[#1e40af] transition-colors" />
              </Link>
              <Link
                href="/terms"
                className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <ScrollText className="h-5 w-5 text-gray-400" />
                  <span className="font-medium">Terms of Service</span>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-[#1e40af] transition-colors" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

