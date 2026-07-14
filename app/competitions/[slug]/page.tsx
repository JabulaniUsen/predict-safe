import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { format } from 'date-fns'
import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CompetitionHub } from '@/components/competitions/competition-hub'
import { BlogPost } from '@/types'
import { getPlainTextExcerpt, stripHtmlTags } from '@/lib/utils/html'

export const dynamic = 'force-dynamic'

interface Competition {
  id: string
  slug: string
  name: string
  league_id: string
  featured_image: string | null
  status: 'active' | 'inactive'
  seo_title: string | null
  seo_description: string | null
  heading: string | null
  subheading: string | null
  introduction: string | null
}

interface Props {
  params: Promise<{ slug: string }>
}

function sanitizeHtml(input: string) {
  return input
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '')
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data } = await (supabase as any)
    .from('competitions')
    .select('name, heading, seo_title, seo_description')
    .eq('slug', slug)
    .eq('status', 'active')
    .single()
  const competition = data as Pick<Competition, 'name' | 'heading' | 'seo_title' | 'seo_description'> | null

  if (!competition) return { title: 'Competition Not Found' }

  return {
    title: competition.seo_title || `${competition.heading || competition.name} | PredictSafe`,
    description: competition.seo_description || `Predictions, fixtures, results and standings for ${competition.heading || competition.name} on PredictSafe.`,
  }
}

export default async function CompetitionPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  const { data } = await (supabase as any)
    .from('competitions')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'active')
    .single()
  const competition = data as Competition | null

  if (!competition) notFound()

  const { data: articlesData } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('competition_id', competition.id)
    .eq('published', true)
    .not('published_at', 'is', null)
    .lte('published_at', new Date().toISOString())
    .order('published_at', { ascending: false })
    .limit(6)
  const articles = (articlesData as BlogPost[]) || []

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Navbar />

      {/* Hero */}
      <section className="relative bg-linear-to-br from-[#1e40af] to-[#1e3a8a] py-10 lg:py-16">
        <div className="absolute inset-0 bg-black/30" />
        {competition.featured_image && (
          <Image
            src={competition.featured_image}
            alt={competition.name}
            fill
            className="object-cover opacity-30"
          />
        )}
        <div className="container mx-auto px-4 relative z-10">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-3">
            {competition.heading || competition.name}
          </h1>
          {competition.subheading && (
            <p className="text-lg lg:text-xl text-white/90 max-w-2xl">
              {competition.subheading}
            </p>
          )}
        </div>
      </section>

      {/* Introduction */}
      {competition.introduction && (
        <section className="bg-gray-50 border-b border-gray-200">
          <div className="container mx-auto px-4 py-6 lg:py-8">
            <article
              className="prose prose-gray lg:prose-lg max-w-5xl prose-headings:text-[#2a2356] prose-headings:font-bold prose-a:text-[#1e40af] prose-a:underline prose-strong:text-gray-900"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(competition.introduction) }}
            />
          </div>
        </section>
      )}

      {/* Hub */}
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8 lg:py-12">
          <CompetitionHub leagueId={competition.league_id} competitionName={competition.heading || competition.name} />
        </div>
      </main>

      {/* Related Articles */}
      {articles.length > 0 && (
        <section className="bg-gray-50 border-t border-gray-200">
          <div className="container mx-auto px-4 py-8 lg:py-12">
            <h2 className="text-2xl lg:text-3xl font-bold text-[#1e40af] mb-6">
              {competition.heading || competition.name} Articles
            </h2>
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {articles.map((post) => {
                let imageUrl = post.featured_image || ''
                if (imageUrl) {
                  try {
                    const parsed = JSON.parse(imageUrl)
                    if (parsed.url) imageUrl = parsed.url
                  } catch {
                    // not JSON, use as-is
                  }
                }
                return (
                  <Card
                    key={post.id}
                    className="overflow-hidden border-2 border-gray-200 hover:border-[#22c55e] hover:shadow-xl transition-all duration-300 flex flex-col"
                  >
                    {imageUrl && (
                      <div className="relative h-40 w-full">
                        <Image src={imageUrl} alt={post.title} fill className="object-cover" />
                      </div>
                    )}
                    <CardHeader className="bg-white p-4 flex-1">
                      <CardTitle className="line-clamp-2 text-lg font-bold text-[#1e40af] mb-2">
                        {post.title}
                      </CardTitle>
                      <CardDescription className="line-clamp-3 text-sm text-gray-600">
                        {post.excerpt ? stripHtmlTags(post.excerpt) : getPlainTextExcerpt(post.content, 120)}
                      </CardDescription>
                      {post.published_at && (
                        <p className="text-xs text-gray-400 mt-2">
                          {format(new Date(post.published_at), 'MMMM dd, yyyy')}
                        </p>
                      )}
                    </CardHeader>
                    <CardContent className="bg-gray-50 p-4">
                      <Button asChild className="bg-gradient-to-r from-[#1e40af] to-[#1e3a8a] text-white w-full">
                        <Link href={`/blog/${post.slug}`} prefetch={false}>Read More</Link>
                      </Button>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        </section>
      )}

      <Footer />
    </div>
  )
}
