'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BlogPost } from '@/types'
import Image from 'next/image'
import { getPlainTextExcerpt, stripHtmlTags } from '@/lib/utils/html'
import { format } from 'date-fns'

export function BlogSection() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPosts = async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('published', true)
        .not('published_at', 'is', null)
        .order('published_at', { ascending: false })
        .limit(6)

      if (error) {
        console.error('Error fetching posts:', error)
      } else {
        setPosts(data || [])
      }

      setLoading(false)
    }

    fetchPosts()
  }, [])

  if (loading) {
    return (
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h2 className="text-4xl font-bold mb-2 text-[#1e40af] text-center">Latest Blog Posts</h2>
            <p className="text-gray-600 text-center">Stay updated with our latest insights and tips</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <div className="h-48 bg-gray-200 rounded-t-lg" />
                <CardHeader>
                  <div className="h-4 w-3/4 bg-gray-200 rounded" />
                  <div className="h-3 w-full bg-gray-200 rounded mt-2" />
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (posts.length === 0) {
    return null
  }

  return (
    <section className="py-8 lg:py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="mb-4 lg:mb-8">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-1 lg:mb-2 text-[#1e40af] text-center">Latest Blog Posts</h2>
          <p className="text-sm lg:text-base text-gray-600 text-center">Stay updated with our latest insights and tips</p>
        </div>
        <div className="grid gap-4 lg:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <Card 
              key={post.id} 
              className="overflow-hidden border-2 border-gray-200 hover:border-[#22c55e] hover:shadow-xl transition-all duration-300 transform hover:scale-105"
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
              <CardHeader className="bg-white p-4 lg:p-6">
                <CardTitle className="line-clamp-2 text-base lg:text-xl font-bold text-[#1e40af]">{post.title}</CardTitle>
                <CardDescription className="line-clamp-3 text-xs lg:text-sm text-gray-600">
                  {post.excerpt ? stripHtmlTags(post.excerpt) : getPlainTextExcerpt(post.content, 120)}
                </CardDescription>
                {post.published_at && (
                  <p className="text-xs text-gray-400 mt-2">
                    {format(new Date(post.published_at), 'MMM dd, yyyy')}
                  </p>
                )}
              </CardHeader>
              <CardContent className="bg-gray-50 p-4 lg:p-6">
                <Button 
                  asChild 
                  className="bg-gradient-to-r from-[#1e40af] to-[#1e3a8a] hover:from-[#1e3a8a] hover:to-[#1e40af] text-white font-bold text-xs lg:text-sm w-full"
                >
                  <Link href={`/blog/${post.id}`}>Read More</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

