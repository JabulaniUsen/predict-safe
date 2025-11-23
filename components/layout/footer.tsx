'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Facebook, Twitter, Instagram, Youtube, Linkedin, Send, Mail, Phone } from 'lucide-react'
import { Database } from '@/types/database'

interface SiteConfig {
  site_header?: string
  site_subheader?: string
  telegram_link?: string
  contact_email?: string
  whatsapp_numbers?: string[]
  social_links?: {
    facebook?: string
    twitter?: string
    instagram?: string
    youtube?: string
    linkedin?: string
  }
}

type ConfigItem = Pick<Database['public']['Tables']['site_config']['Row'], 'key' | 'value'>

export function Footer() {
  const [config, setConfig] = useState<SiteConfig>({})

  useEffect(() => {
    const fetchConfig = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('site_config')
        .select('key, value')
        .in('key', ['site_header', 'site_subheader', 'telegram_link', 'contact_email', 'whatsapp_numbers', 'social_links'])

      if (data) {
        const configData: SiteConfig = {}
        const configItems = data as ConfigItem[]
        configItems.forEach((item) => {
          if (!item.value) return
          
          if (item.key === 'social_links') {
            // Parse JSON string if needed
            try {
              configData[item.key as keyof SiteConfig] = typeof item.value === 'string' 
                ? JSON.parse(item.value) 
                : (item.value as any)
            } catch {
              configData[item.key as keyof SiteConfig] = item.value as any
            }
          } else {
            configData[item.key as keyof SiteConfig] = item.value as any
          }
        })
        setConfig(configData)
      }
    }

    fetchConfig()
  }, [])

  return (
    <footer className="bg-gradient-to-b from-gray-900 to-gray-800 text-white border-t border-gray-700">
      <div className="container mx-auto px-4 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12 mb-12">
          {/* Brand Section */}
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <Image
                src="/logo.png"
                alt={`${config.site_header || 'PredictSafe'} Logo`}
                width={70}
                height={70}
                className="w-auto object-contain"
                priority
              />
            </Link>
            <p className="text-sm text-gray-300 leading-relaxed mb-6">
              {config.site_subheader || 'Your trusted source for accurate football predictions and betting tips.'}
            </p>
            
            {/* Social Media Icons */}
            <div className="flex items-center gap-3">
              {config.social_links?.facebook && (
                <a
                  href={config.social_links.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-white/10 hover:bg-blue-600 flex items-center justify-center transition-all duration-300 hover:scale-110"
                  aria-label="Facebook"
                >
                  <Facebook className="h-5 w-5 text-white" />
                </a>
              )}
              {config.social_links?.twitter && (
                <a
                  href={config.social_links.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-white/10 hover:bg-black flex items-center justify-center transition-all duration-300 hover:scale-110"
                  aria-label="Twitter"
                >
                  <Twitter className="h-5 w-5 text-white" />
                </a>
              )}
              {config.social_links?.instagram && (
                <a
                  href={config.social_links.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-white/10 hover:bg-gradient-to-r hover:from-purple-600 hover:via-pink-600 hover:to-orange-500 flex items-center justify-center transition-all duration-300 hover:scale-110"
                  aria-label="Instagram"
                >
                  <Instagram className="h-5 w-5 text-white" />
                </a>
              )}
              {config.social_links?.youtube && (
                <a
                  href={config.social_links.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-white/10 hover:bg-red-600 flex items-center justify-center transition-all duration-300 hover:scale-110"
                  aria-label="YouTube"
                >
                  <Youtube className="h-5 w-5 text-white" />
                </a>
              )}
              {config.social_links?.linkedin && (
                <a
                  href={config.social_links.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-white/10 hover:bg-blue-700 flex items-center justify-center transition-all duration-300 hover:scale-110"
                  aria-label="LinkedIn"
                >
                  <Linkedin className="h-5 w-5 text-white" />
                </a>
              )}
              {config.telegram_link && (
                <a
                  href={config.telegram_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-white/10 hover:bg-blue-500 flex items-center justify-center transition-all duration-300 hover:scale-110"
                  aria-label="Telegram"
                >
                  <Send className="h-5 w-5 text-white" />
                </a>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-bold mb-4 text-white">Quick Links</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/" className="text-gray-300 hover:text-white transition-colors flex items-center gap-2">
                  <span>Home</span>
                </Link>
              </li>
              <li>
                <Link href="/subscriptions" className="text-gray-300 hover:text-white transition-colors flex items-center gap-2">
                  <span>VIP Packages</span>
                </Link>
              </li>
              <li>
                <Link href="/blog" className="text-gray-300 hover:text-white transition-colors flex items-center gap-2">
                  <span>Blog</span>
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-gray-300 hover:text-white transition-colors flex items-center gap-2">
                  <span>FAQ</span>
                </Link>
              </li>
              <li>
                <Link href="/advertise" className="text-gray-300 hover:text-white transition-colors flex items-center gap-2">
                  <span>Advertise With Us</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Predictions */}
          <div>
            <h4 className="text-lg font-bold mb-4 text-white">Predictions</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/" className="text-gray-300 hover:text-white transition-colors">
                  Free Tips
                </Link>
              </li>
              <li>
                <Link href="/subscriptions" className="text-gray-300 hover:text-white transition-colors">
                  VIP Packages
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="text-gray-300 hover:text-white transition-colors">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link href="/livescores" className="text-gray-300 hover:text-white transition-colors">
                  Live Scores
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Contact */}
          <div>
            <h4 className="text-lg font-bold mb-4 text-white">Legal & Support</h4>
            <ul className="space-y-3 text-sm mb-6">
              <li>
                <Link href="/terms" className="text-gray-300 hover:text-white transition-colors">
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-gray-300 hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/disclaimer" className="text-gray-300 hover:text-white transition-colors">
                  Disclaimer
                </Link>
              </li>
              <li>
                <Link href="/refund" className="text-gray-300 hover:text-white transition-colors">
                  Refund Policy
                </Link>
              </li>
              <li>
                <Link href="/cookies" className="text-gray-300 hover:text-white transition-colors">
                  Cookie Policy
                </Link>
              </li>
            </ul>
            
            {/* Contact Info */}
            {config.contact_email && (
              <div className="mt-6 pt-6 border-t border-gray-700">
                <div className="flex items-center gap-2 text-gray-300 text-sm mb-2">
                  <Mail className="h-4 w-4" />
                  <a href={`mailto:${config.contact_email}`} className="hover:text-white transition-colors">
                    {config.contact_email}
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-gray-700">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-400 text-center md:text-left">
              © {new Date().getFullYear()} {config.site_header || 'PredictSafe'}. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-sm text-gray-400">
              <Link href="/about" className="hover:text-white transition-colors">About Us</Link>
              <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
            </div>
          </div>
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-500">
              Crafted by{' '}
              <a 
                href="https://jabulaniusen.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-white transition-colors underline"
              >
                Jabulani Usen
              </a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}

