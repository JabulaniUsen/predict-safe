'use client'

import { ReactNode } from 'react'
import Image from 'next/image'
import { Navbar } from './navbar'
import { Footer } from './footer'

interface PageLayoutProps {
  children: ReactNode
  title?: string
  subtitle?: string
}

export function PageLayout({ children, title, subtitle }: PageLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      
      {/* Hero Section with Background */}
      <section className="relative min-h-[200px] flex items-center overflow-hidden">
        {/* Background Image with Fallback */}
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-[#1e40af] to-[#1e3a8a]">
          <Image
            src="/hero-pics/hero.jpg"
            alt="Background"
            fill
            className="object-cover"
            priority
            quality={90}
            sizes="100vw"
          />
          {/* Dark Overlay */}
          <div className="absolute inset-0 bg-black/60" />
        </div>

        {/* Content */}
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl">
            {title && (
              <h1 className="mb-4 text-4xl font-bold text-white tracking-tight sm:text-5xl md:text-6xl">
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="text-lg text-white/90 sm:text-xl md:text-2xl leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="flex-1 bg-gray-50">
        {children}
      </main>
      
      <Footer />
    </div>
  )
}

