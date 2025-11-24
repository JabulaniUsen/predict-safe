import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check if user is admin (optional - can be called by cron without auth)
    const authHeader = request.headers.get('authorization')
    if (authHeader) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: userProfile } = await supabase
          .from('users')
          .select('is_admin')
          .eq('id', user.id)
          .single()
        
        if (!userProfile || !(userProfile as any).is_admin) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
      }
    }

    const now = new Date().toISOString()

    // Find all scheduled posts that should be published now
    const { data: scheduledPosts, error: fetchError } = await supabase
      .from('blog_posts')
      .select('*')
      .not('scheduled_at', 'is', null)
      .eq('published', false)
      .lte('scheduled_at', now)

    if (fetchError) {
      throw fetchError
    }

    if (!scheduledPosts || scheduledPosts.length === 0) {
      return NextResponse.json({ 
        message: 'No scheduled posts to publish',
        published: 0 
      })
    }

    // Publish all scheduled posts
    const { error: updateError } = await supabase
      .from('blog_posts')
      .update({
        published: true,
        published_at: now,
        scheduled_at: null,
      })
      .in('id', scheduledPosts.map(p => p.id))

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({ 
      message: `Published ${scheduledPosts.length} scheduled post(s)`,
      published: scheduledPosts.length 
    })
  } catch (error: any) {
    console.error('Error publishing scheduled posts:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to publish scheduled posts' 
    }, { status: 500 })
  }
}

// Also support GET for easier cron job setup
export async function GET() {
  try {
    const supabase = await createClient()
    const now = new Date().toISOString()

    // Find all scheduled posts that should be published now
    const { data: scheduledPosts, error: fetchError } = await supabase
      .from('blog_posts')
      .select('*')
      .not('scheduled_at', 'is', null)
      .eq('published', false)
      .lte('scheduled_at', now)

    if (fetchError) {
      throw fetchError
    }

    if (!scheduledPosts || scheduledPosts.length === 0) {
      return NextResponse.json({ 
        message: 'No scheduled posts to publish',
        published: 0 
      })
    }

    // Publish all scheduled posts
    const { error: updateError } = await supabase
      .from('blog_posts')
      .update({
        published: true,
        published_at: now,
        scheduled_at: null,
      })
      .in('id', scheduledPosts.map(p => p.id))

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({ 
      message: `Published ${scheduledPosts.length} scheduled post(s)`,
      published: scheduledPosts.length 
    })
  } catch (error: any) {
    console.error('Error publishing scheduled posts:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to publish scheduled posts' 
    }, { status: 500 })
  }
}

