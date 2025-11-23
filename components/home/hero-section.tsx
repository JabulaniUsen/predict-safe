'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

const heroImages = [
  '/hero-pics/hero.jpg',
  '/hero-pics/hero-bg1.jpg',
  '/hero-pics/hero-bg2.jpeg',
  '/hero-pics/hero-bg3.jpeg',
]

export function HeroSection() {
  const router = useRouter()
  const [headline, setHeadline] = useState('Welcome to PredictSafe')
  const [subtext, setSubtext] = useState('Your trusted source for accurate football predictions')
  const [telegramLink, setTelegramLink] = useState('https://t.me/predictsafe')
  const [user, setUser] = useState<any>(null)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

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

  // Auto-slide images every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % heroImages.length)
    }, 4000)

    return () => clearInterval(interval)
  }, [])

  const handleSubscribe = () => {
    if (!user) {
      router.push('/login')
    } else {
      router.push('/subscriptions')
    }
  }

  return (
    <section className="relative min-h-[300px] sm:min-h-[400px] lg:min-h-[500px] flex items-center overflow-hidden">
      {/* Background Images with Fade Transition */}
      <div className="absolute inset-0 z-0">
        {heroImages.map((image, index) => (
          <div
            key={image}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              index === currentImageIndex ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <Image
              src={image}
              alt="Football stadium background"
              fill
              className="object-cover"
              priority={index === 0}
              quality={90}
            />
          </div>
        ))}
        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-black/60" />
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 relative z-10 py-8 lg:py-16">
        <div className="max-w-2xl">
          <h1 className="mb-3 lg:mb-4 text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white tracking-tight">
            {headline}
          </h1>
          <p className="mb-6 lg:mb-8 text-base sm:text-lg md:text-xl lg:text-2xl text-white/90 leading-relaxed max-w-xl">
            {subtext}
          </p>
          <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row">
            <Button
              size="lg"
              onClick={handleSubscribe}
              className="text-sm sm:text-base lg:text-lg bg-gradient-to-r from-[#f97316] to-[#ea580c] hover:from-[#ea580c] hover:to-[#f97316] text-white px-6 py-4 sm:px-8 sm:py-6 rounded-lg font-bold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            >
              Subscribe to VIP
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="text-sm sm:text-base lg:text-lg bg-white text-[#1e40af] border-2 border-white hover:bg-[#1e3a8a] hover:text-white hover:border-[#1e3a8a] px-6 py-4 sm:px-8 sm:py-6 rounded-lg font-bold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
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

