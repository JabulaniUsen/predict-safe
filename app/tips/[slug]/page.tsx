import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { TipsPredictionsSection } from '@/components/tips/tips-predictions-section'

export const dynamic = 'force-dynamic'

interface CustomPage {
  id: string
  slug: string
  title: string
  heading: string | null
  subheading: string | null
  description: string | null
  filter_id: string | null
  is_published: boolean
  show_in_footer: boolean
  footer_section: string | null
  footer_label: string | null
  footer_order: number | null
  meta_title: string | null
  meta_description: string | null
}

interface Props {
  params: Promise<{ slug: string }>
}

function sanitizeDescriptionHtml(input: string) {
  return input
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '')
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('custom_pages')
    .select('title, heading, meta_title, meta_description, description')
    .eq('slug', slug)
    .eq('is_published', true)
    .single()
  const page = data as CustomPage | null

  if (!page) return { title: 'Page Not Found' }

  return {
    title: page.meta_title || `${page.heading || page.title} | PredictSafe`,
    description: page.meta_description || page.description || `Free football predictions — ${page.heading || page.title}.`,
  }
}

// Hardcoded fallback so filter tabs keep working even if the custom_pages
// seed rows are missing (fresh DB) or the DB is unreachable. Slugs mirror
// the FILTERS list in TipsPredictionsSection.
const FALLBACK_FILTERS: Record<string, { title: string; filter_id: string }> = {
  'safe-free-picks': { title: 'Safe Free Picks', filter_id: 'free' },
  'all-tips': { title: 'All Tips', filter_id: 'all' },
  'super-single': { title: 'Super Single', filter_id: 'super_single' },
  'double-chance': { title: 'Double Chance', filter_id: 'double_chance' },
  'home-win': { title: 'Home Win', filter_id: 'home_win' },
  'away-win': { title: 'Away Win', filter_id: 'away_win' },
  '1-5-goals': { title: 'Over 1.5 Goals', filter_id: 'over_1_5' },
  '2-5-goals': { title: 'Over 2.5 Goals', filter_id: 'over_2_5' },
  'btts-gg': { title: 'BTTS / GG', filter_id: 'btts' },
}

export default async function TipsPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  const { data } = await supabase
    .from('custom_pages')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .single()
  const page = data as CustomPage | null

  const fallback = FALLBACK_FILTERS[slug]
  if (!page && !fallback) notFound()

  const heading = page?.heading || page?.title || fallback!.title
  const filterId = page?.filter_id || fallback!.filter_id

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Navbar />

      {/* Hero */}
      <section className="relative bg-linear-to-br from-[#1e40af] to-[#1e3a8a] py-10 lg:py-16">
        <div className="absolute inset-0 bg-black/30" />
        <div className="container mx-auto px-4 relative z-10">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-3">
            {heading}
          </h1>
          {page?.subheading && (
            <p className="text-lg lg:text-xl text-white/90 max-w-2xl">
              {page.subheading}
            </p>
          )}
        </div>
      </section>

      {/* Predictions */}
      <main className="flex-1">
        <TipsPredictionsSection initialFilter={filterId} />
      </main>

      {/* Description */}
      {page?.description && (
        <section className="bg-gray-50 border-t border-gray-200">
          <div className="container mx-auto px-4 py-6 lg:py-8">
            <article
              className="prose prose-gray lg:prose-lg max-w-5xl prose-headings:text-[#2a2356] prose-headings:font-bold prose-a:text-[#1e40af] prose-a:underline prose-strong:text-gray-900"
              dangerouslySetInnerHTML={{ __html: sanitizeDescriptionHtml(page?.description || '') }}
            />
          </div>
        </section>
      )}

      <Footer />
    </div>
  )
}
