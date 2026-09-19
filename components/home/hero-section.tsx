'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { TrendingUp, Users, Target, Zap } from 'lucide-react'

/**
 * Hero backgrounds, as pre-sized responsive variants.
 *
 * The originals were 5040x2856 and 6000x4000 - 7.4MB and 4.1MB - and all four
 * were downloaded on every page load, because they all sit in the DOM for the
 * crossfade. That was roughly 12MB of the homepage's weight on its own.
 *
 * `images.unoptimized` is on (Cloudflare Images isn't enabled on this plan, so
 * Next's optimizer 402s), which means the browser gets exactly the file named
 * here - no automatic resizing or format negotiation. So we do it ourselves
 * with a plain <picture>: WebP with a JPEG fallback, at a phone width and a
 * desktop width. Regenerate with `npm run optimize-images`.
 */
const heroImages = [
  { base: '/hero-pics/hero', alt: 'Football stadium at night' },
  { base: '/hero-pics/hero-bg1', alt: 'Packed football stadium' },
  { base: '/hero-pics/hero-bg2', alt: 'Football pitch from above' },
  { base: '/hero-pics/hero-bg3', alt: 'Floodlit football ground' },
]

const stats = [
  { icon: Target, value: '90%+', label: 'Accuracy' },
  { icon: Users, value: '10K+', label: 'Members' },
  { icon: TrendingUp, value: 'Daily', label: 'Free Tips' },
  { icon: Zap, value: '24/7', label: 'Support' },
]

interface HeroSectionProps {
  headline?: string
  subtext?: string
  telegramLink?: string
  whatsappNumber?: string
}

export function HeroSection({
  headline: initialHeadline = 'Welcome to PredictSafe',
  subtext: initialSubtext = 'Your trusted source for accurate football predictions',
  telegramLink: initialTelegramLink = 'https://t.me/predictsafe',
  whatsappNumber: initialWhatsappNumber = '',
}: HeroSectionProps) {
  const router = useRouter()
  const [headline] = useState(initialHeadline)
  const [subtext] = useState(initialSubtext)
  const [telegramLink] = useState(initialTelegramLink)
  const [whatsappNumber] = useState(initialWhatsappNumber)
  const [user, setUser] = useState<User | null>(null)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const chatLink = whatsappNumber
    ? `https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}`
    : telegramLink

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
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
    <section className="relative min-h-[360px] sm:min-h-[480px] flex flex-col items-center overflow-hidden">
      {/* Background Images with Fade Transition */}
      <div className="absolute inset-0 z-0">
        {heroImages.map((image, index) => {
          // Only the first slide is eager. The rest load lazily, so a visitor
          // who leaves before the carousel advances never pays for them.
          const isFirst = index === 0
          return (
            <div
              key={image.base}
              className={`absolute inset-0 transition-opacity duration-1000 ${
                index === currentImageIndex ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <picture>
                <source
                  type="image/webp"
                  srcSet={`${image.base}-960.webp 960w, ${image.base}-1920.webp 1920w`}
                  sizes="100vw"
                />
                <img
                  src={`${image.base}-1920.jpg`}
                  srcSet={`${image.base}-960.jpg 960w, ${image.base}-1920.jpg 1920w`}
                  sizes="100vw"
                  alt={isFirst ? image.alt : ''}
                  className="absolute inset-0 h-full w-full object-cover"
                  loading={isFirst ? 'eager' : 'lazy'}
                  fetchPriority={isFirst ? 'high' : 'low'}
                  decoding="async"
                />
              </picture>
            </div>
          )
        })}
        {/* Layered overlay: dark top + stronger bottom for stats bar */}
        <div className="absolute inset-0 bg-linear-to-b from-black/70 via-black/55 to-black/80" />
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 relative z-10 pt-10 pb-6 lg:pt-16 lg:pb-10 flex-1 flex flex-col justify-center">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="mb-4 text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white tracking-tight leading-tight">
            {headline}
          </h1>
          <p className="mb-8 text-base sm:text-lg md:text-xl text-white/85 leading-relaxed max-w-2xl mx-auto">
            {subtext}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col gap-3 sm:flex-row justify-center mb-8">
            <Button
              size="lg"
              onClick={handleSubscribe}
              className="text-sm sm:text-base bg-linear-to-r from-[#f97316] to-[#ea580c] hover:from-[#ea580c] hover:to-[#f97316] text-white px-8 py-5 rounded-xl font-bold shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            >
              Subscribe to VIP
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="text-sm sm:text-base bg-white/10 backdrop-blur-sm text-white border-2 border-white/40 hover:bg-white hover:text-[#1e40af] px-8 py-5 rounded-xl font-bold transition-all duration-300 transform hover:scale-105"
            >
              <a href={telegramLink} target="_blank" rel="noopener noreferrer">
                Join Telegram
              </a>
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="text-sm sm:text-base bg-white/10 backdrop-blur-sm text-white border-2 border-white/40 hover:bg-white hover:text-[#1e40af] px-8 py-5 rounded-xl font-bold transition-all duration-300 transform hover:scale-105"
            >
              <a href={chatLink} target="_blank" rel="noopener noreferrer">
                Chat with us
              </a>
            </Button>
          </div>

          {/* Dot navigation */}
          <div className="flex justify-center gap-2">
            {heroImages.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentImageIndex(index)}
                className={`rounded-full transition-all duration-300 ${
                  index === currentImageIndex
                    ? 'w-6 h-2 bg-white'
                    : 'w-2 h-2 bg-white/40 hover:bg-white/70'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="relative z-10 w-full bg-black/50 backdrop-blur-sm border-t border-white/10">
        <div className="container mx-auto px-4 py-3">
          <div className="grid grid-cols-4 divide-x divide-white/10">
            {stats.map(({ icon: Icon, value, label }) => (
              <div key={label} className="flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 px-2">
                <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-[#f97316]" />
                <div className="text-center sm:text-left">
                  <div className="text-white font-bold text-sm sm:text-base leading-none">{value}</div>
                  <div className="text-white/60 text-[10px] sm:text-xs leading-none mt-0.5">{label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
