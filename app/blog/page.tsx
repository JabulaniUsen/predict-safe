import { createClient } from '@/lib/supabase/server'
import { PageLayout } from '@/components/layout/page-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BlogPost } from '@/types'
import Image from 'next/image'
import Link from 'next/link'
import { format } from 'date-fns'
import { getPlainTextExcerpt, stripHtmlTags } from '@/lib/utils/html'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Football Betting Tips & Predictions Blog | PredictSafe',
  description: 'Read expert football betting tips, predictions analysis, and betting strategies. Stay updated with the latest insights from PredictSafe\'s team of betting experts.',
  keywords: [
    'football betting blog',
    'betting tips blog',
    'soccer predictions blog',
    'football analysis',
    'betting strategies',
    'football betting advice',
    'sports betting insights',
    'football tips and tricks',
    'betting guides',
    'football prediction analysis'
  ],
  openGraph: {
    title: 'Football Betting Tips & Predictions Blog | PredictSafe',
    description: 'Read expert football betting tips, predictions analysis, and betting strategies.',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default async function BlogPage() {
  const supabase = await createClient()

  // Get all published blog posts
  const { data: posts, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('published', true)
    .not('published_at', 'is', null)
    .lte('published_at', new Date().toISOString())
    .order('published_at', { ascending: false })

  if (error) {
    console.error('Error fetching blog posts:', error)
  }

  const blogPosts = (posts as BlogPost[]) || []

  return (
    <PageLayout>
      <div className="container mx-auto px-4 py-8 lg:py-16">
        <div className="mb-8 lg:mb-12 text-center">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-2 lg:mb-4 text-[#1e40af]">
            Our Blog
          </h1>
          <p className="text-base lg:text-lg text-gray-600 max-w-2xl mx-auto">
            Stay updated with our latest insights, tips, and predictions
          </p>
        </div>

        {blogPosts.length === 0 ? (
          <div className="text-center py-12 lg:py-20">
            <p className="text-lg lg:text-xl text-gray-500 mb-4">
              No blog posts available yet.
            </p>
            <p className="text-sm lg:text-base text-gray-400">
              Check back soon for new content!
            </p>
          </div>
        ) : (
          <div className="grid gap-6 lg:gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {blogPosts.map((post) => (
              <Card
                key={post.id}
                className="overflow-hidden border-2 border-gray-200 hover:border-[#22c55e] hover:shadow-xl transition-all duration-300 transform hover:scale-105 flex flex-col"
              >
                {post.featured_image && (
                  <div className="relative h-48 w-full">
                    <Image
                      src={post.featured_image}
                      alt={post.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <CardHeader className="bg-white p-4 lg:p-6 flex-1">
                  <CardTitle className="line-clamp-2 text-lg lg:text-xl font-bold text-[#1e40af] mb-2">
                    {post.title}
                  </CardTitle>
                  <CardDescription className="line-clamp-3 text-sm lg:text-base text-gray-600 mb-4">
                    {post.excerpt ? stripHtmlTags(post.excerpt) : getPlainTextExcerpt(post.content, 150)}
                  </CardDescription>
                  {post.published_at && (
                    <p className="text-xs text-gray-400 mb-2">
                      {format(new Date(post.published_at), 'MMMM dd, yyyy')}
                    </p>
                  )}
                </CardHeader>
                <CardContent className="bg-gray-50 p-4 lg:p-6">
                  <Button
                    asChild
                    className="bg-gradient-to-r from-[#1e40af] to-[#1e3a8a] hover:from-[#1e3a8a] hover:to-[#1e40af] text-white font-bold text-sm lg:text-base w-full"
                  >
                    <Link href={`/blog/${post.id}`}>Read More</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  )
}

