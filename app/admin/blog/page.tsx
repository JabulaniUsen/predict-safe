import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminLayout } from '@/components/admin/admin-layout'
import { BlogManager } from '@/components/admin/blog-manager'
import { Database } from '@/types/database'

type UserProfile = Pick<Database['public']['Tables']['users']['Row'], 'is_admin'>
type BlogPost = Database['public']['Tables']['blog_posts']['Row']

export default async function AdminBlogPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check if user is admin
  const result = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single()
  
  const userProfile = result.data as UserProfile | null

  if (!userProfile?.is_admin) {
    redirect('/dashboard')
  }

  // Get all blog posts
  const { data: posts, error } = await supabase
    .from('blog_posts')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching blog posts:', error)
  }

  return (
    <AdminLayout>
      <BlogManager initialPosts={(posts as BlogPost[]) || []} />
    </AdminLayout>
  )
}

