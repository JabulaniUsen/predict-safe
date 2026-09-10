'use client'

import { useEffect, useRef, useState } from 'react'
import { Headset, MessageCircle, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface SupportChannel {
  key: string
  label: string
  href: string
  icon: React.ReactNode
  iconWrapClassName: string
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.693.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
      <path d="M12.004 2C6.478 2 2 6.478 2 12.004c0 1.98.535 3.874 1.548 5.538L2 22l4.561-1.517A9.947 9.947 0 0 0 12.004 22C17.53 22 22 17.522 22 12.004 22 6.478 17.53 2 12.004 2zm0 18.03a8.001 8.001 0 0 1-4.084-1.11l-.293-.174-3.03 1.007 1.023-2.94-.19-.302A7.98 7.98 0 0 1 4.004 12c0-4.418 3.594-8 8-8 4.418 0 8 3.582 8 8 0 4.418-3.582 8.03-8 8.03z" />
    </svg>
  )
}

function TelegramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
      <path d="M21.947 4.665a1.5 1.5 0 0 0-1.505-.264L2.941 10.87c-1.108.428-1.098 1.99.015 2.404l4.484 1.67 1.726 5.536c.244.784 1.254.98 1.792.35l2.523-2.958 4.715 3.47c.816.6 1.98.15 2.169-.842l3.19-16.703a1.5 1.5 0 0 0-.608-1.132zM9.03 14.45l-3.71-1.382 12.66-6.99-9.92 8.79a.6.6 0 0 0-.19.31l.06 1.27-.9-2z" />
    </svg>
  )
}

export function SupportWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [channels, setChannels] = useState<SupportChannel[]>([])
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchConfig = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('site_config')
        .select('key, value')
        .in('key', ['whatsapp_number', 'whatsapp_numbers', 'telegram_link', 'chat_support_url']) as {
          data: Array<{ key: string; value: unknown }> | null
        }

      const configMap = new Map((data || []).map((item) => [item.key, item.value]))
      const next: SupportChannel[] = []

      let whatsappNumber = configMap.get('whatsapp_number')
      if (typeof whatsappNumber !== 'string' || !whatsappNumber.trim()) {
        // Legacy support: fall back to the first entry of the old whatsapp_numbers array
        const legacy = configMap.get('whatsapp_numbers')
        try {
          const parsed = typeof legacy === 'string' ? JSON.parse(legacy) : legacy
          if (Array.isArray(parsed) && parsed.length > 0) {
            whatsappNumber = parsed[0]
          }
        } catch {
          if (Array.isArray(legacy) && legacy.length > 0) {
            whatsappNumber = legacy[0]
          }
        }
      }
      if (typeof whatsappNumber === 'string' && whatsappNumber.trim()) {
        next.push({
          key: 'whatsapp',
          label: 'WhatsApp',
          href: `https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}`,
          icon: <WhatsAppIcon />,
          iconWrapClassName: 'text-[#25D366]',
        })
      }

      const telegramLink = configMap.get('telegram_link')
      if (typeof telegramLink === 'string' && telegramLink.trim()) {
        next.push({
          key: 'telegram',
          label: 'Telegram',
          href: telegramLink.trim(),
          icon: <TelegramIcon />,
          iconWrapClassName: 'text-[#229ED9]',
        })
      }

      const chatSupportUrl = configMap.get('chat_support_url')
      const normalize = (url: string) => url.toLowerCase().replace(/[^a-z0-9]/g, '')
      const isDuplicate =
        typeof chatSupportUrl === 'string' &&
        next.some((channel) => normalize(channel.href) === normalize(chatSupportUrl))

      if (typeof chatSupportUrl === 'string' && chatSupportUrl.trim() && !isDuplicate) {
        next.push({
          key: 'chat',
          label: 'Live Chat',
          href: chatSupportUrl.trim(),
          icon: <MessageCircle className="h-5 w-5" />,
          iconWrapClassName: 'text-[#1e40af]',
        })
      }

      setChannels(next)
    }

    fetchConfig()
  }, [])

  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  if (channels.length === 0) return null

  return (
    <div
      ref={containerRef}
      className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3"
    >
      <div
        className={`flex flex-col items-end gap-3 transition-all duration-300 ${
          isOpen
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        {channels.map((channel) => (
          <a
            key={channel.key}
            href={channel.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 rounded-full bg-white pl-4 pr-5 py-3 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95"
          >
            <span className={channel.iconWrapClassName}>{channel.icon}</span>
            <span className="text-sm font-semibold text-gray-900">{channel.label}</span>
          </a>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-r from-[#f97316] to-[#ea580c] hover:scale-110 active:scale-95 flex items-center justify-center"
        aria-label={isOpen ? 'Close support menu' : 'Contact support'}
        aria-expanded={isOpen}
      >
        {isOpen ? (
          <X className="h-6 w-6 text-white" />
        ) : (
          <Headset className="h-6 w-6 text-white" />
        )}
      </button>
    </div>
  )
}
