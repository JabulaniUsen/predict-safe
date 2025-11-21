'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Lock, Clock, CheckCircle2, AlertCircle } from 'lucide-react'
import { UserSubscriptionWithPlan, Plan } from '@/types'
import { format } from 'date-fns'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface PlanCardProps {
  plan: Plan
  subscription: UserSubscriptionWithPlan | null
  currency: string
}

export function PlanCard({ plan, subscription, currency }: PlanCardProps) {
  const [timeRemaining, setTimeRemaining] = useState<string>('')

  useEffect(() => {
    if (subscription?.plan_status === 'active' && subscription.expiry_date) {
      const updateTimer = () => {
        const now = new Date()
        const expiry = new Date(subscription.expiry_date!)
        const diff = expiry.getTime() - now.getTime()

        if (diff <= 0) {
          setTimeRemaining('Expired')
          return
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24))
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

        setTimeRemaining(`${days} Days : ${hours} Hours : ${minutes} Minutes`)
      }

      updateTimer()
      const interval = setInterval(updateTimer, 60000) // Update every minute

      return () => clearInterval(interval)
    }
  }, [subscription])

  const getStatusBadge = () => {
    if (!subscription || subscription.plan_status === 'inactive') {
      return (
        <Badge variant="secondary" className="gap-1">
          <Lock className="h-3 w-3" />
          Locked
        </Badge>
      )
    }

    if (subscription.plan_status === 'pending_activation') {
      return (
        <Badge variant="outline" className="gap-1 bg-yellow-50 text-yellow-700 border-yellow-200">
          <AlertCircle className="h-3 w-3" />
          Pending Activation
        </Badge>
      )
    }

    if (subscription.plan_status === 'active') {
      return (
        <Badge variant="default" className="gap-1 bg-green-50 text-green-700 border-green-200">
          <CheckCircle2 className="h-3 w-3" />
          Active
        </Badge>
      )
    }

    return (
      <Badge variant="destructive" className="gap-1">
        Expired
      </Badge>
    )
  }

  const getActionButton = () => {
    if (!subscription || subscription.plan_status === 'inactive') {
      return (
        <Button asChild className="w-full">
          <Link href={`/subscribe?plan=${plan.slug}`}>Subscribe Now</Link>
        </Button>
      )
    }

    if (subscription.plan_status === 'pending_activation') {
      return (
        <Button asChild className="w-full" variant="outline">
          <Link href={`/subscribe?plan=${plan.slug}&step=activation`}>
            Pay Activation Fee
          </Link>
        </Button>
      )
    }

    if (subscription.plan_status === 'active') {
      return (
        <Button asChild className="w-full" variant="default">
          <Link href={`/dashboard/predictions?plan=${plan.slug}`}>View Predictions</Link>
        </Button>
      )
    }

    return (
      <Button asChild className="w-full">
        <Link href={`/subscribe?plan=${plan.slug}`}>Renew Subscription</Link>
      </Button>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>{plan.name}</CardTitle>
            <CardDescription>{plan.description}</CardDescription>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {subscription?.plan_status === 'pending_activation' && (
          <div className="rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800">
            You have subscribed but need to pay the Activation Fee to unlock predictions.
          </div>
        )}

        {subscription?.plan_status === 'active' && subscription.expiry_date && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Expires:</span>
              <span className="font-medium">
                {format(new Date(subscription.expiry_date), 'MMM d, yyyy')}
              </span>
            </div>
            {timeRemaining && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{timeRemaining} Remaining</span>
              </div>
            )}
          </div>
        )}

        {subscription?.plan_status === 'expired' && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
            Your subscription has expired.
          </div>
        )}

        {getActionButton()}
      </CardContent>
    </Card>
  )
}

