import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageLayout } from '@/components/layout/page-layout'
import { BlogPost } from '@/types'
import Image from 'next/image'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'
import { stripHtmlTags } from '@/lib/utils/html'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()

  const { data: post, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !post) {
    return {
      title: 'Post Not Found',
    }
  }

  const blogPost = post as BlogPost
  const description = blogPost.excerpt 
    ? stripHtmlTags(blogPost.excerpt) 
    : stripHtmlTags(blogPost.content).substring(0, 160)

  return {
    title: `${blogPost.title} | PredictSafe Blog`,
    description: description,
    keywords: blogPost.meta_keywords 
      ? blogPost.meta_keywords.split(',').map(k => k.trim())
      : ['football betting', 'betting tips', 'soccer predictions'],
    openGraph: {
      title: blogPost.title,
      description: description,
      type: 'article',
      publishedTime: blogPost.published_at || undefined,
      images: blogPost.featured_image ? [blogPost.featured_image] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: blogPost.title,
      description: description,
      images: blogPost.featured_image ? [blogPost.featured_image] : [],
    },
    robots: {
      index: true,
      follow: true,
    },
  }
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // Get the blog post by ID (without publishing restrictions for now to debug)
  const { data: post, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !post) {
    console.error(`Blog post not found with id: ${id}`, error)
    notFound()
  }

  // Check if post is published and available
  const isPublished = post.published === true
  const hasPublishedAt = post.published_at !== null
  const isPublishedInPast = post.published_at 
    ? new Date(post.published_at) <= new Date()
    : false

  // Log the post status for debugging
  console.log('Blog post status:', {
    id,
    title: post.title,
    published: isPublished,
    hasPublishedAt,
    isPublishedInPast,
    published_at: post.published_at,
    current_time: new Date().toISOString()
  })

  // Only show if published and published_at is set and in the past
  if (!isPublished || !hasPublishedAt || !isPublishedInPast) {
    console.error(`Blog post exists but is not available:`, {
      id,
      published: isPublished,
      hasPublishedAt,
      isPublishedInPast,
      published_at: post.published_at
    })
    notFound()
  }

  const blogPost = post as BlogPost

  // Get author information
  let authorName = 'Admin'
  if (blogPost.author_id) {
    const { data: authorData } = await supabase
      .from('users')
      .select('full_name, email')
      .eq('id', blogPost.author_id)
      .single()
    
    const author = authorData as { full_name: string | null; email: string } | null
    
    if (author?.full_name) {
      authorName = author.full_name
    } else if (author?.email) {
      authorName = author.email.split('@')[0]
    }
  }

  return (
    <PageLayout>
      <div className="container mx-auto px-4 py-8 lg:py-16 max-w-4xl">
        <Button variant="ghost" size="sm" asChild className="mb-6">
          <Link href="/blog">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Blog
          </Link>
        </Button>

        <article className="prose prose-lg max-w-none">
          <header className="mb-8">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 text-[#1e40af]">
              {blogPost.title}
            </h1>
            
            {blogPost.excerpt && (
              <p className="text-lg lg:text-xl text-gray-600 mb-6 italic">
                {blogPost.excerpt}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-6">
              {blogPost.published_at && (
                <time dateTime={blogPost.published_at}>
                  {format(new Date(blogPost.published_at), 'MMMM dd, yyyy')}
                </time>
              )}
              <span>•</span>
              <span>By {authorName}</span>
            </div>

            {blogPost.featured_image && (
              <div className="relative w-full h-64 sm:h-80 lg:h-96 rounded-lg overflow-hidden mb-8 border-2 border-gray-200">
                <Image
                  src={blogPost.featured_image}
                  alt={blogPost.title}
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            )}
          </header>

          <div 
            className="blog-content text-base lg:text-lg text-gray-700 leading-relaxed prose prose-lg max-w-none
              prose-headings:text-[#1e40af] prose-headings:font-bold
              prose-p:mb-4 prose-p:leading-relaxed
              prose-a:text-red-600 prose-a:no-underline hover:prose-a:underline
              prose-strong:font-bold prose-strong:text-gray-900
              prose-ul:list-disc prose-ul:ml-6 prose-ul:mb-4
              prose-ol:list-decimal prose-ol:ml-6 prose-ol:mb-4
              prose-li:mb-2
              prose-img:rounded-lg prose-img:shadow-lg prose-img:my-6
              prose-blockquote:border-l-4 prose-blockquote:border-gray-300 prose-blockquote:pl-4 prose-blockquote:italic
              prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
              prose-pre:bg-gray-900 prose-pre:text-white prose-pre:p-4 prose-pre:rounded-lg prose-pre:overflow-x-auto"
            dangerouslySetInnerHTML={{ __html: blogPost.content }}
          />
        </article>

        <div className="mt-12 pt-8 border-t border-gray-200">
          <Button asChild className="bg-red-600 hover:bg-red-700 text-white">
            <Link href="/blog">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to All Posts
            </Link>
          </Button>
        </div>
      </div>
    </PageLayout>
  )
}

