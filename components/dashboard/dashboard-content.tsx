'use client'

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
  ScrollText
} from 'lucide-react'
import { formatDate } from '@/lib/utils/date'
import { Badge } from '@/components/ui/badge'
import { Clock, CheckCircle2, AlertCircle } from 'lucide-react'

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

  return (
    <div className="space-y-6">
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
            <CardContent className="py-8">
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
                        className="border rounded-lg p-4 space-y-3"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-lg">{plan?.name || 'Unknown Plan'}</h3>
                            {plan?.description && (
                              <p className="text-sm text-gray-600 mt-1">{plan.description}</p>
                            )}
                          </div>
                          <div>
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
                          <div className="rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800 border border-yellow-200">
                            <p className="font-medium mb-1">Payment Pending Review</p>
                            <p>Your payment proof has been submitted and is awaiting admin confirmation. Your subscription will be activated once payment is verified.</p>
                          </div>
                        )}
                        
                        {isPendingActivation && (
                          <div className="rounded-lg bg-orange-50 p-3 text-sm text-orange-800 border border-orange-200">
                            <p className="font-medium mb-1">Activation Fee Required</p>
                            <p>Your subscription is active but requires an activation fee to unlock predictions.</p>
                          </div>
                        )}
                        
                        {isActive && subscription.expiry_date && (
                          <div className="text-sm text-gray-600">
                            <span className="font-medium">Expires:</span>{' '}
                            {formatDate(new Date(subscription.expiry_date))}
                          </div>
                        )}
                        
                        <div className="flex gap-2 pt-2">
                          {isActive && (
                            <Button
                              size="sm"
                              className="bg-gradient-to-r from-[#1e40af] to-[#1e3a8a] hover:from-[#1e3a8a] hover:to-[#1e40af] text-white"
                              onClick={() => router.push('/dashboard/predictions')}
                            >
                              View Predictions
                            </Button>
                          )}
                          {isPendingActivation && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => router.push(`/subscribe?plan=${plan?.slug}&step=activation`)}
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
                <div className="text-center">
                  <div className="flex justify-center mb-4">
                    <Crown className="h-16 w-16 text-yellow-200" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4">No Subscription</h3>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    You don't have any subscriptions. Subscribe now to unlock premium features and access exclusive content.
                  </p>
                  <Button
                    className="bg-gradient-to-r from-[#1e40af] to-[#1e3a8a] hover:from-[#1e3a8a] hover:to-[#1e40af] text-white font-bold"
                    onClick={() => router.push('/subscriptions')}
                  >
                    <Crown className="h-4 w-4 mr-2" />
                    View Available Packages
                  </Button>
                </div>
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

