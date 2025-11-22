'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export function HeroSection() {
  const router = useRouter()
  const [headline, setHeadline] = useState('Welcome to PredictSafe')
  const [subtext, setSubtext] = useState('Your trusted source for accurate football predictions')
  const [telegramLink, setTelegramLink] = useState('https://t.me/predictsafe')
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const fetchConfig = async () => {
      const supabase = createClient()
      
      // Fetch site config
      const { data: config } = await supabase
        .from('site_config')
        .select('key, value')
        .in('key', ['hero_headline', 'hero_subtext', 'telegram_link'])

      if (config && Array.isArray(config)) {
        config.forEach((item: { key: string; value: any }) => {
          if (item.key === 'hero_headline') setHeadline(item.value as string)
          if (item.key === 'hero_subtext') setSubtext(item.value as string)
          if (item.key === 'telegram_link') setTelegramLink(item.value as string)
        })
      }

      // Check user
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }

    fetchConfig()
  }, [])

  const handleSubscribe = () => {
    if (!user) {
      router.push('/login')
    } else {
      router.push('/subscriptions')
    }
  }

  return (
    <section className="relative min-h-[600px] flex items-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/hero-bg.jpg"
          alt="Football stadium background"
          fill
          className="object-cover"
          priority
          quality={90}
        />
        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-black/60" />
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-2xl">
          <h1 className="mb-4 text-4xl font-bold text-white tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            {headline}
          </h1>
          <p className="mb-8 text-lg text-white/90 sm:text-xl md:text-2xl leading-relaxed max-w-xl">
            {subtext}
          </p>
          <div className="flex flex-col gap-4 sm:flex-row">
            <Button
              size="lg"
              onClick={handleSubscribe}
              className="text-lg bg-gradient-to-r from-[#f97316] to-[#ea580c] hover:from-[#ea580c] hover:to-[#f97316] text-white px-8 py-6 rounded-lg font-bold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            >
              Subscribe to VIP
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="text-lg bg-white text-[#1e40af] border-2 border-white hover:bg-[#1e3a8a] hover:text-white hover:border-[#1e3a8a] px-8 py-6 rounded-lg font-bold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            >
              <a href={telegramLink} target="_blank" rel="noopener noreferrer">
                Telegram Tips
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}

