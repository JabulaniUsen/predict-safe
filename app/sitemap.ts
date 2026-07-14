import { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

// Allow dynamic generation but prefer static
export const revalidate = 3600 // Revalidate every hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://predictsafe.com').replace(/\/+$/, '')
  
  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/subscriptions`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/livescores`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/faq`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/disclaimer`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/download-app`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ]

  try {
    // Check if required environment variables are available
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Supabase environment variables not set, returning static pages only')
      return staticPages
    }

    // Create a simple Supabase client without cookies for static generation
    const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
    
    // Get published blog posts with timeout protection
    const blogPostsPromise = supabase
      .from('blog_posts')
      .select('slug, updated_at, published_at')
      .eq('published', true)
      .not('published_at', 'is', null)

    // Add timeout to prevent build hanging
    const timeoutPromise = new Promise<{ data: null; error: { message: string } }>((resolve) =>
      setTimeout(() => resolve({ data: null, error: { message: 'Timeout' } }), 10000)
    )

    const result = await Promise.race([blogPostsPromise, timeoutPromise]) as { data: any[] | null; error: any }

    if (result.error) {
      console.error('Error fetching blog posts for sitemap:', result.error)
    }

    const blogPosts = result.data

    const blogPages: MetadataRoute.Sitemap = (blogPosts || []).map((post: { slug: string; updated_at: string | null; published_at: string | null }) => ({
      url: `${baseUrl}/blog/${post.slug}`,
      lastModified: new Date(post.updated_at || post.published_at || new Date()),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }))

    // Get published tips landing pages (e.g. /tips/safe-free-picks, /tips/home-win)
    const tipsPagesPromise = supabase
      .from('custom_pages')
      .select('slug, updated_at')
      .eq('is_published', true)

    const tipsTimeoutPromise = new Promise<{ data: null; error: { message: string } }>((resolve) =>
      setTimeout(() => resolve({ data: null, error: { message: 'Timeout' } }), 10000)
    )

    const tipsResult = await Promise.race([tipsPagesPromise, tipsTimeoutPromise]) as { data: any[] | null; error: any }

    if (tipsResult.error) {
      console.error('Error fetching tips pages for sitemap:', tipsResult.error)
    }

    const tipsPages: MetadataRoute.Sitemap = (tipsResult.data || []).map((page: { slug: string; updated_at: string | null }) => ({
      url: `${baseUrl}/tips/${page.slug}`,
      lastModified: new Date(page.updated_at || new Date()),
      changeFrequency: 'daily' as const,
      priority: 0.8,
    }))

    return [...staticPages, ...blogPages, ...tipsPages]
  } catch (error) {
    console.error('Error generating sitemap:', error)
    // Always return static pages even if blog posts fail
    return staticPages
  }
}