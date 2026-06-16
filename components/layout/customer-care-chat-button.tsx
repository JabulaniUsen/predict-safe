'use client'

import { useState, useEffect } from 'react'
import { MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

export function CustomerCareChatButton() {
  const [chatUrl, setChatUrl] = useState<string | null>(null)

  useEffect(() => {
    const fetchConfig = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('site_config')
        .select('value')
        .eq('key', 'chat_support_url')
        .single()

      if (data?.value && typeof data.value === 'string' && data.value.trim()) {
        setChatUrl(data.value.trim())
      }
    }

    fetchConfig()
  }, [])

  if (!chatUrl) return null

  return (
    <Button
      onClick={() => window.open(chatUrl, '_blank', 'noopener,noreferrer')}
      className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-r from-[#1e40af] to-[#1e3a8a] hover:from-[#1e3a8a] hover:to-[#1e40af] border-2 border-white hover:scale-110 active:scale-95"
      aria-label="Customer Care Chat"
    >
      <MessageCircle className="h-6 w-6 text-white" />
    </Button>
  )
}
