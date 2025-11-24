'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Crown, 
  Calendar, 
  Lock, 
  ArrowRight, 
  HeadphonesIcon, 
  MessageCircle,
  CheckCircle2,
  Clock,
  AlertCircle
} from 'lucide-react'
import { formatDate } from '@/lib/utils/date'
import { Badge } from '@/components/ui/badge'
import { ActivationFeeModal } from '@/components/dashboard/activation-fee-modal'

// Countdown component for subscription expiry
function SubscriptionCountdown({ expiryDate }: { expiryDate: string }) {
  const [timeRemaining, setTimeRemaining] = useState<{
    days: number
    hours: number
    minutes: number
    seconds: number
  } | null>(null)

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    const updateTimer = () => {
      const now = new Date()
      const expiry = new Date(expiryDate)
      const diff = expiry.getTime() - now.getTime()

      if (diff <= 0) {
        setTimeRemaining(null)
        // Clear interval when expired
        if (interval) {
          clearInterval(interval)
          interval = null
        }
        return
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      // Check if all values are 0 and stop the countdown
      if (days === 0 && hours === 0 && minutes === 0 && seconds === 0) {
        setTimeRemaining(null)
        // Clear interval when all values reach 0
        if (interval) {
          clearInterval(interval)
          interval = null
        }
        return
      }

      setTimeRemaining({ days, hours, minutes, seconds })
    }

    // Initial update
    updateTimer()
    
    // Set up interval only if not expired
    const now = new Date()
    const expiry = new Date(expiryDate)
    if (expiry.getTime() > now.getTime()) {
      interval = setInterval(updateTimer, 1000) // Update every second
    }

    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [expiryDate])

  if (!timeRemaining) {
    return (
      <div className="text-xs lg:text-sm text-gray-600">
        <span className="font-medium">Expires:</span>{' '}
        {formatDate(new Date(expiryDate))}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="text-xs lg:text-sm text-gray-600">
        <span className="font-medium">Expires:</span>{' '}
        {formatDate(new Date(expiryDate))}
      </div>
      <div className="flex items-center gap-2 p-2 lg:p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
        <Clock className="h-4 w-4 text-blue-600 flex-shrink-0" />
        <div className="flex items-center gap-2 lg:gap-3 flex-wrap">
          <div className="flex items-center gap-1">
            <span className="text-lg lg:text-xl font-bold text-blue-700">{timeRemaining.days}</span>
            <span className="text-xs text-gray-600">d</span>
          </div>
          <span className="text-gray-400">:</span>
          <div className="flex items-center gap-1">
            <span className="text-lg lg:text-xl font-bold text-blue-700">{String(timeRemaining.hours).padStart(2, '0')}</span>
            <span className="text-xs text-gray-600">h</span>
          </div>
          <span className="text-gray-400">:</span>
          <div className="flex items-center gap-1">
            <span className="text-lg lg:text-xl font-bold text-blue-700">{String(timeRemaining.minutes).padStart(2, '0')}</span>
            <span className="text-xs text-gray-600">m</span>
          </div>
          <span className="text-gray-400">:</span>
          <div className="flex items-center gap-1">
            <span className="text-lg lg:text-xl font-bold text-blue-700">{String(timeRemaining.seconds).padStart(2, '0')}</span>
            <span className="text-xs text-gray-600">s</span>
          </div>
        </div>
      </div>
    </div>
  )
}

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
  const [activationModalOpen, setActivationModalOpen] = useState(false)
  const [selectedSubscription, setSelectedSubscription] = useState<any>(null)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm lg:text-base text-gray-600 mt-1">Plan, prioritize, and access your predictions with ease.</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-2 border-gray-200 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 lg:pb-2 p-4">
            <CardTitle className="text-sm font-medium text-gray-600">Total Subscriptions</CardTitle>
            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
              <Crown className="h-4 w-4 text-[#1e40af]" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-gray-900">{subscriptions.length}</div>
            <p className="text-xs text-gray-500 lg:mt-1">All time subscriptions</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-gray-200 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 lg:pb-2 p-4">
            <CardTitle className="text-sm font-medium text-gray-600">Active Plans</CardTitle>
            <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-gray-900">{activeSubscriptions}</div>
            <p className="text-xs text-green-600 lg:mt-1">Currently active</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-gray-200 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 lg:pb-2 p-4">
            <CardTitle className="text-sm font-medium text-gray-600">Days with Us</CardTitle>
            <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
              <Calendar className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-gray-900">{daysSince}</div>
            <p className="text-xs text-gray-500 lg:mt-1">Member since {formatDate(memberSince)}</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-gray-200 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 lg:pb-2 p-4">
            <CardTitle className="text-sm font-medium text-gray-600">Pending Status</CardTitle>
            <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center">
              <Clock className="h-4 w-4 text-yellow-600" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-gray-900">
              {subscriptions.filter(s => s.plan_status === 'pending' || s.plan_status === 'pending_activation').length}
            </div>
            <p className="text-xs text-gray-500 lg:mt-1">Awaiting activation</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-4 lg:space-y-6">
          {/* My Subscription Card */}
          <Card className="border-2 border-gray-200 shadow-sm">
            <CardHeader className="p-5 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">My Subscriptions</CardTitle>
                {activeSubscriptions > 0 && (
                  <Button
                    size="sm"
                    className="bg-[#1e40af] hover:bg-[#1e3a8a] text-white text-xs"
                    onClick={() => router.push('/dashboard/predictions')}
                  >
                    View Predictions
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="py-4 lg:py-8 px-4 lg:px-6">
              {subscriptions.length > 0 ? (
                <div className="space-y-4">
                  {subscriptions.map((subscription) => {
                    const plan = subscription.plan
                    const isActive = subscription.plan_status === 'active'
                    const isPending = subscription.plan_status === 'pending'
                    const isPendingActivation = subscription.plan_status === 'pending_activation'
                    const isExpired = subscription.plan_status === 'expired'
                    
                    return (
                      <div
                        key={subscription.id}
                        className="border rounded-lg p-3 lg:p-4 space-y-2 lg:space-y-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-base lg:text-lg">{plan?.name || 'Unknown Plan'}</h3>
                            {plan?.description && (
                              <p className="text-xs lg:text-sm text-gray-600 mt-1">{plan.description}</p>
                            )}
                          </div>
                          <div className="flex-shrink-0">
                            {isActive && (
                              <Badge variant="default" className="gap-1 bg-green-50 text-green-700 border-green-200">
                                <CheckCircle2 className="h-3 w-3" />
                                Active
                              </Badge>
                            )}
                            {isPending && (
                              <Badge variant="outline" className="gap-1 bg-yellow-50 text-yellow-700 border-yellow-200">
                                <Clock className="h-3 w-3" />
                                Pending
                              </Badge>
                            )}
                            {isPendingActivation && (
                              <Badge variant="outline" className="gap-1 bg-orange-50 text-orange-700 border-orange-200">
                                <AlertCircle className="h-3 w-3" />
                                Pending Activation
                              </Badge>
                            )}
                            {isExpired && (
                              <Badge variant="destructive" className="gap-1">
                                Expired
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        {isPending && (
                          <div className="rounded-lg bg-yellow-50 p-2 lg:p-3 text-xs lg:text-sm text-yellow-800 border border-yellow-200">
                            <p className="font-medium mb-1">Payment Pending Review</p>
                            <p>Your payment proof has been submitted and is awaiting admin confirmation. Your subscription will be activated once payment is verified.</p>
                          </div>
                        )}
                        
                        {isPendingActivation && plan?.slug === 'correct-score' && (
                          <div className="rounded-lg bg-orange-50 p-2 lg:p-3 text-xs lg:text-sm text-orange-800 border border-orange-200">
                            <p className="font-medium mb-1">Locked, pay activation fee to unlock</p>
                            <p>Your subscription is active but requires an activation fee to unlock predictions.</p>
                          </div>
                        )}
                        
                        {isActive && subscription.expiry_date && (
                          <SubscriptionCountdown expiryDate={subscription.expiry_date} />
                        )}
                        
                        <div className="flex flex-wrap gap-2 pt-2">
                          {isActive && (
                            <Button
                              size="sm"
                              className="bg-gradient-to-r from-[#1e40af] to-[#1e3a8a] hover:from-[#1e3a8a] hover:to-[#1e40af] text-white"
                              onClick={() => router.push('/dashboard/predictions')}
                            >
                              View Predictions
                            </Button>
                          )}
                          {isPendingActivation && plan?.slug === 'correct-score' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedSubscription(subscription)
                                setActivationModalOpen(true)
                              }}
                            >
                              Pay Activation Fee
                            </Button>
                          )}
                          {!isActive && !isPending && !isPendingActivation && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => router.push('/subscriptions')}
                            >
                              Subscribe
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  
                  {activeSubscriptions === 0 && subscriptions.some((s) => s.plan_status === 'pending' || s.plan_status === 'pending_activation') && (
                    <div className="text-center pt-4 border-t">
                      <Button
                        className="bg-gradient-to-r from-[#1e40af] to-[#1e3a8a] hover:from-[#1e3a8a] hover:to-[#1e40af] text-white font-bold"
                        onClick={() => router.push('/subscriptions')}
                      >
                        <Crown className="h-4 w-4 mr-2" />
                        Browse More Plans
                      </Button>
                  </div>
                  )}
                  
                  {activeSubscriptions > 0 && (
                    <div className="text-center pt-4 border-t">
                  <Button
                    className="bg-gradient-to-r from-[#1e40af] to-[#1e3a8a] hover:from-[#1e3a8a] hover:to-[#1e40af] text-white font-bold"
                    onClick={() => router.push('/dashboard/predictions')}
                  >
                        View All Predictions
                  </Button>
                    </div>
                  )}
                </div>
              ) : (
                  <div className="text-center px-2">
                    <div className="flex justify-center mb-3 lg:mb-4">
                      <Crown className="h-12 w-12 lg:h-16 lg:w-16 text-yellow-200" />
                    </div>
                    <h3 className="text-xl lg:text-2xl font-bold mb-2 lg:mb-4">No Subscription</h3>
                    <p className="text-sm lg:text-base text-gray-600 mb-4 lg:mb-6 max-w-md mx-auto">
                      You don't have any subscriptions. Subscribe now to unlock premium features and access exclusive content.
                    </p>
                    <Button
                      className="bg-gradient-to-r from-[#1e40af] to-[#1e3a8a] hover:from-[#1e3a8a] hover:to-[#1e40af] text-white font-bold text-sm lg:text-base"
                      onClick={() => router.push('/subscriptions')}
                    >
                      <Crown className="h-4 w-4 mr-2" />
                      View Available Packages
                    </Button>
                  </div>
              )}
            </CardContent>
          </Card>

        </div>

        {/* Right Column */}
        <div className="space-y-4 lg:space-y-6">
          {/* Account Security Card */}
          <Card className="border-2 border-gray-200 shadow-sm">
            <CardHeader className="p-5 border-b border-gray-200">
              <CardTitle className="text-lg font-semibold">Account Security</CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <button
                onClick={() => router.push('/dashboard/settings')}
                className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Lock className="h-5 w-5 text-[#1e40af]" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-sm">Change Password</div>
                    <div className="text-xs text-gray-500">Update your account password</div>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-[#1e40af] transition-colors flex-shrink-0" />
              </button>
            </CardContent>
          </Card>

          {/* Need Help Card */}
          <Card className="border-2 border-gray-200 shadow-sm">
            <CardHeader className="p-5 border-b border-gray-200">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <HeadphonesIcon className="h-5 w-5 text-red-500" />
                Need Help?
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <p className="text-sm text-gray-600 mb-4">
                Our support team is available 24/7 to assist you with any questions or issues.
              </p>
              <Button
                className="w-full bg-red-500 hover:bg-red-600 text-white"
                onClick={() => {
                  window.location.href = 'mailto:support@predictsafe.com'
                }}
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Contact Support
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Activation Fee Modal */}
      {selectedSubscription && (
        <ActivationFeeModal
          open={activationModalOpen}
          onOpenChange={setActivationModalOpen}
          planId={selectedSubscription.plan_id}
          planName={selectedSubscription.plan?.name || 'Unknown Plan'}
          userCountry={userProfile?.country || 'Nigeria'}
          subscriptionId={selectedSubscription.id}
        />
      )}
    </div>
  )
}

