'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Bell, Check, CheckCheck, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  read: boolean
  created_at: string
}

interface NotificationsListProps {
  notifications: Notification[]
  unreadCount: number
}

export function NotificationsList({ notifications: initialNotifications, unreadCount: initialUnreadCount }: NotificationsListProps) {
  const [notifications, setNotifications] = useState(initialNotifications)
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount)
  const [markingAsRead, setMarkingAsRead] = useState<string | null>(null)

  const supabase = createClient()

  const markAsRead = async (id: string) => {
    setMarkingAsRead(id)
    try {
      const { error } = await supabase
        .from('notifications')
        // @ts-expect-error - Supabase type inference issue
        .update({ read: true })
        .eq('id', id)

      if (error) throw error

      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
      toast.success('Notification marked as read')
    } catch (error: any) {
      toast.error(error.message || 'Failed to mark as read')
    } finally {
      setMarkingAsRead(null)
    }
  }

  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter(n => !n.read).map(n => n.id)
      if (unreadIds.length === 0) return

      const { error } = await supabase
        .from('notifications')
        // @ts-expect-error - Supabase type inference issue
        .update({ read: true })
        .in('id', unreadIds)

      if (error) throw error

      setNotifications(prev =>
        prev.map(n => ({ ...n, read: true }))
      )
      setUnreadCount(0)
      toast.success('All notifications marked as read')
    } catch (error: any) {
      toast.error(error.message || 'Failed to mark all as read')
    }
  }

  const deleteNotification = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id)

      if (error) throw error

      const deleted = notifications.find(n => n.id === id)
      setNotifications(prev => prev.filter(n => n.id !== id))
      if (deleted && !deleted.read) {
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
      toast.success('Notification deleted')
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete notification')
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'prediction_dropped':
        return '🎯'
      case 'subscription_confirmed':
        return '✅'
      case 'subscription_expired':
        return '⏰'
      case 'subscription_removed':
        return '⚠️'
      case 'payment_rejected':
        return '❌'
      case 'payment_approved':
        return '✅'
      case 'admin_new_payment':
        return '💰'
      case 'admin_new_subscription':
        return '🎉'
      default:
        return '🔔'
    }
  }

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'prediction_dropped':
        return 'bg-blue-100 text-blue-800'
      case 'subscription_confirmed':
        return 'bg-green-100 text-green-800'
      case 'subscription_expired':
        return 'bg-yellow-100 text-yellow-800'
      case 'subscription_removed':
        return 'bg-red-100 text-red-800'
      case 'payment_rejected':
        return 'bg-red-100 text-red-800'
      case 'payment_approved':
        return 'bg-green-100 text-green-800'
      case 'admin_new_payment':
        return 'bg-purple-100 text-purple-800'
      case 'admin_new_subscription':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (notifications.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
            <p className="text-gray-500 mt-1">Stay updated with your account activity</p>
          </div>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bell className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500 text-lg">No notifications yet</p>
            <p className="text-gray-400 text-sm mt-2">You'll see notifications here when there's activity on your account</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-500 mt-1">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button onClick={markAllAsRead} variant="outline" size="sm">
            <CheckCheck className="h-4 w-4 mr-2" />
            Mark all as read
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {notifications.map((notification) => (
          <Card key={notification.id} className={!notification.read ? 'border-l-4 border-l-blue-500' : ''}>
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div className="text-2xl">{getNotificationIcon(notification.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={`font-semibold ${!notification.read ? 'text-gray-900' : 'text-gray-700'}`}>
                          {notification.title}
                        </h3>
                        {!notification.read && (
                          <Badge variant="default" className="h-2 w-2 p-0 rounded-full bg-blue-500" />
                        )}
                      </div>
                      <p className="text-gray-600 text-sm mb-2">{notification.message}</p>
                      <p className="text-xs text-gray-400">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {!notification.read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markAsRead(notification.id)}
                          disabled={markingAsRead === notification.id}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteNotification(notification.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

