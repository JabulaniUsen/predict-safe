'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'

interface UsersManagerProps {
  users: any[]
}

export function UsersManager({ users }: UsersManagerProps) {
  const [selectedUser, setSelectedUser] = useState<any>(null)

  const handleActivateCorrectScore = async (userId: string, subscriptionId: string) => {
    try {
      const supabase = createClient()
      const startDate = new Date()
      const expiryDate = new Date()
      expiryDate.setDate(expiryDate.getDate() + 7) // Default to 7 days

      const { error } = await supabase
        .from('user_subscriptions')
        .update({
          activation_fee_paid: true,
          plan_status: 'active',
          start_date: startDate.toISOString(),
          expiry_date: expiryDate.toISOString(),
        })
        .eq('id', subscriptionId)

      if (error) throw error

      toast.success('Correct Score access activated!')
      window.location.reload()
    } catch (error: any) {
      toast.error(error.message || 'Failed to activate')
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Subscriptions</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => {
                const subscriptions = user.user_subscriptions || []
                const pendingActivation = subscriptions.find(
                  (s: any) => s.plan_status === 'pending_activation'
                )

                return (
                  <TableRow key={user.id}>
                    <TableCell>{user.full_name || 'N/A'}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      {(user.countries as any)?.name || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {subscriptions.map((sub: any) => (
                          <Badge
                            key={sub.id}
                            variant={
                              sub.plan_status === 'active'
                                ? 'default'
                                : sub.plan_status === 'pending_activation'
                                ? 'outline'
                                : 'secondary'
                            }
                          >
                            {sub.plan?.name} ({sub.plan_status})
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {pendingActivation && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedUser({ user, subscription: pendingActivation })}
                            >
                              Activate
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Activate Correct Score Access</DialogTitle>
                              <DialogDescription>
                                Activate Correct Score subscription for {user.full_name || user.email}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <p className="text-sm text-muted-foreground">
                                This will activate the Correct Score subscription and start the countdown timer.
                              </p>
                              <Button
                                onClick={() =>
                                  handleActivateCorrectScore(user.id, pendingActivation.id)
                                }
                                className="w-full"
                              >
                                Activate Now
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

