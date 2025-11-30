'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { MessageCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'

export function FloatingChatButton() {
  const router = useRouter()
  const pathname = usePathname()
  const [unreadCount, setUnreadCount] = useState(0)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      setUser(authUser)

      if (authUser) {
        // Fetch unread messages count
        const fetchUnreadCount = async () => {
          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', authUser.id)
            .eq('read', false)
            .neq('sender_id', authUser.id) // Only count messages from admin
          
          setUnreadCount(count || 0)
        }

        fetchUnreadCount()

        // Set up real-time subscription for unread count
        const channel = supabase
          .channel(`unread-messages-${authUser.id}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'messages',
              filter: `user_id=eq.${authUser.id}`,
            },
            () => {
              fetchUnreadCount()
            }
          )
          .subscribe()

        // Refresh count every 30 seconds as backup
        const interval = setInterval(fetchUnreadCount, 30000)

        return () => {
          supabase.removeChannel(channel)
          clearInterval(interval)
        }
      }
    }

    checkUser()
  }, [])

  // Don't show on chat page, login, signup, or admin pages
  const hideOnPaths = ['/dashboard/chat', '/login', '/signup', '/admin']
  const shouldHide = hideOnPaths.some(path => pathname?.startsWith(path))

  if (!user || shouldHide) {
    return null
  }

  const handleClick = () => {
    router.push('/dashboard/chat')
  }

  return (
    <Button
      onClick={handleClick}
      className="fixed bottom-4 left-4 sm:bottom-6 sm:left-6 z-50 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-r from-[#1e40af] to-[#1e3a8a] hover:from-[#1e3a8a] hover:to-[#1e40af] border-2 border-white hover:scale-110 active:scale-95"
      aria-label="Open chat"
    >
      <div className="relative">
        <MessageCircle className="h-6 w-6 text-white" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-white animate-pulse min-w-[20px]">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </div>
    </Button>
  )
}

