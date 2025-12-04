import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import type { Metadata } from 'next'
import { Mail, Phone, Send } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Contact Us | PredictSafe',
  description:
    'Contact PredictSafe support team for questions about subscriptions, VIP packages, payments, or technical issues.',
}

export default async function ContactPage() {
  const supabase = await createClient()
  
  // Fetch site config
  const { data: configData } = await supabase
    .from('site_config')
    .select('key, value')
    .in('key', ['contact_email', 'telegram_link', 'whatsapp_number', 'whatsapp_numbers'])

  const config: {
    contact_email?: string
    telegram_link?: string
    whatsapp_number?: string
  } = {}

  if (configData && Array.isArray(configData)) {
    configData.forEach((item: { key: string; value: any }) => {
      if (item.key === 'whatsapp_number') {
        config.whatsapp_number = typeof item.value === 'string' ? item.value : String(item.value || '')
      } else if (item.key === 'whatsapp_numbers' && !config.whatsapp_number) {
        // Legacy support: if whatsapp_number doesn't exist, try whatsapp_numbers (array)
        try {
          const parsed = typeof item.value === 'string' 
            ? JSON.parse(item.value) 
            : item.value
          if (Array.isArray(parsed) && parsed.length > 0) {
            config.whatsapp_number = parsed[0] // Use first number from legacy array
          }
        } catch {
          if (Array.isArray(item.value) && item.value.length > 0) {
            config.whatsapp_number = item.value[0]
          }
        }
      } else if (item.key === 'contact_email') {
        config.contact_email = item.value as string
      } else if (item.key === 'telegram_link') {
        config.telegram_link = item.value as string
      }
    })
  }

  const contactEmail = config.contact_email || 'predictsafe@gmail.com'
  const telegramLink = config.telegram_link || 'https://t.me/joinsurefixedwin'
  const whatsappNumber = config.whatsapp_number || '+234 704 532 1193'

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1">
        <section className="py-10 lg:py-16">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="mb-8 text-center">
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Contact Us</h1>
              <p className="text-gray-600 text-sm sm:text-base max-w-2xl mx-auto">
                Have questions about your subscription, VIP packages, payments, or predictions? Reach out to the
                PredictSafe team and we’ll respond as soon as possible.
              </p>
            </div>

            <div className="grid gap-8 lg:grid-cols-2">
              {/* Support & Enquiries */}
              <div className="space-y-6">
                <div className="bg-[#1e40af] text-white rounded-2xl shadow-md p-6 sm:p-7">
                  <h2 className="text-xl font-semibold mb-2">Support & Enquiries</h2>
                  <p className="text-sm text-blue-100 mb-4">
                    For faster responses about payments, subscriptions or VIP access, contact us via email,
                    WhatsApp, Telegram or any of our social media platforms.
                  </p>

                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4" />
                      <a
                        href={`mailto:${contactEmail}`}
                        className="hover:underline break-all"
                      >
                        {contactEmail}
                      </a>
                    </div>
                    {whatsappNumber && (
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4" />
                        <a
                          href={`https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-100 hover:underline"
                        >
                          WhatsApp support: {whatsappNumber}
                        </a>
                    </div>
                    )}
                    {telegramLink && (
                    <div className="flex items-center gap-3">
                      <Send className="h-4 w-4" />
                      <Link
                          href={telegramLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        Join our Telegram channel
                      </Link>
                    </div>
                    )}
                  </div>

                  <p className="mt-5 text-[11px] text-blue-100/80 leading-relaxed">
                    Please do not send your card or banking details via email or chat. Our team will never ask for your
                    PIN or OTP. Always confirm you are on the official PredictSafe website before making any payment.
                  </p>
                </div>

                <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-6 sm:p-7">
                  <h3 className="text-base font-semibold text-gray-900 mb-2">Business & Partnerships</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    For advertising, affiliate partnerships, or bulk VIP packages for communities or investment clubs:
                  </p>
                  <a
                    href="mailto:adverts.predictsafe@gmail.com"
                    className="inline-flex items-center text-sm font-medium text-[#1e40af] hover:underline"
                  >
                    adverts.predictsafe@gmail.com
                  </a>
                </div>
              </div>

              {/* Other Channels */}
              <div className="space-y-6">
                <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-6 sm:p-7">
                  <h3 className="text-base font-semibold text-gray-900 mb-2">Other Channels</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    You can also reach us through our official social media profiles linked in the footer, or use the
                    live chat widget on this website for quick questions.
                  </p>
                  <p className="text-xs text-gray-500">
                    We do our best to respond as quickly as possible across all platforms.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}