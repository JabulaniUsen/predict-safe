'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Plan, Country } from '@/types'

interface PlansManagerProps {
  plans: any[]
  countries: Country[]
  subscriptions: any[]
}

export function PlansManager({ plans, countries, subscriptions }: PlansManagerProps) {
  const [loading, setLoading] = useState(false)

  const getSubscriberCount = (planId: string) => {
    return subscriptions.filter((s) => s.plan_id === planId && s.plan_status === 'active').length
  }

  const handleTogglePlan = async (planId: string, isActive: boolean) => {
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('plans')
        .update({ is_active: !isActive })
        .eq('id', planId)

      if (error) throw error

      toast.success('Plan status updated!')
      window.location.reload()
    } catch (error: any) {
      toast.error(error.message || 'Failed to update plan')
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Subscription Plans</CardTitle>
            <CardDescription>Manage your subscription plans and pricing</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plan Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Subscribers</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell className="font-medium">{plan.name}</TableCell>
                  <TableCell>{plan.slug}</TableCell>
                  <TableCell>
                    <Switch
                      checked={plan.is_active}
                      onCheckedChange={() => handleTogglePlan(plan.id, plan.is_active)}
                    />
                  </TableCell>
                  <TableCell>{getSubscriberCount(plan.id)}</TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" asChild>
                      <a href={`/admin/plans/${plan.id}`}>Edit</a>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

