'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Calendar } from 'lucide-react'
import { toast } from 'sonner'
import { AdminLayout } from '@/components/admin/admin-layout'
import { RichTextEditor } from '@/components/admin/rich-text-editor'
import { Database } from '@/types/database'
import { BlogPost } from '@/types'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Upload, X, Loader2, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

type UserProfile = Pick<Database['public']['Tables']['users']['Row'], 'is_admin'>

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function WriteBlogContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get('edit') || ''
  const isEditMode = !!editId

  const [loading, setLoading] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [loadingPost, setLoadingPost] = useState(isEditMode)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    featured_image: '',
    published: false,
    scheduled_at: '',
    meta_keywords: '',
    tags: [] as string[],
  })
  const [tagInput, setTagInput] = useState('')

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      const { data: userProfile } = await supabase
        .from('users')
        .select('is_admin')
        .eq('id', user.id)
        .single()

      const typedUserProfile = userProfile as UserProfile | null

      if (!typedUserProfile?.is_admin) {
        router.push('/dashboard')
        return
      }

      setCheckingAuth(false)
    }

    checkAuth()
  }, [router])

  // Load blog post data if editing
  useEffect(() => {
    const loadPost = async () => {
      if (!isEditMode || checkingAuth) return

      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('blog_posts')
          .select('*')
          .eq('id', editId)
          .single()

        if (error) throw error
        if (!data) {
          toast.error('Blog post not found')
          router.push('/admin/blog')
          return
        }

        const post = data as BlogPost

        setFormData({
          title: post.title || '',
          slug: post.slug || '',
          excerpt: post.excerpt || '',
          content: post.content || '',
          featured_image: post.featured_image || '',
          published: post.published || false,
          scheduled_at: post.scheduled_at ? new Date(post.scheduled_at).toISOString().slice(0, 16) : '',
          meta_keywords: post.meta_keywords || '',
          tags: post.tags || [],
        })

        // In edit mode, slug is already set, so mark it as manually edited to preserve it
        setSlugManuallyEdited(true)
        setLoadingPost(false)
      } catch (error: any) {
        toast.error(error.message || 'Failed to load blog post')
        router.push('/admin/blog')
      }
    }

    loadPost()
  }, [isEditMode, editId, checkingAuth, router])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!validTypes.includes(file.type)) {
      toast.error('Invalid file type. Only JPEG, PNG, and WebP are allowed.')
      return
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      toast.error('File size exceeds 5MB limit')
      return
    }

    setUploadingImage(true)

    try {
      const formDataObj = new FormData()
      formDataObj.append('file', file)

      const response = await fetch('/api/blog/upload-image', {
        method: 'POST',
        body: formDataObj,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to upload image')
      }

      const data = await response.json()
      setFormData({ ...formData, featured_image: data.url })
      toast.success('Image uploaded successfully')
    } catch (error: any) {
      console.error('Error uploading image:', error)
      toast.error(error.message || 'Failed to upload image')
    } finally {
      setUploadingImage(false)
    }
  }

  const handleTitleChange = (value: string) => {
    setFormData({
      ...formData,
      title: value,
      // Only auto-generate slug if it hasn't been manually edited
      slug: slugManuallyEdited ? formData.slug : generateSlug(value),
    })
  }

  const handleSlugChange = (value: string) => {
    setSlugManuallyEdited(true)
    setFormData({
      ...formData,
      slug: value,
    })
  }

  const regenerateSlug = () => {
    const newSlug = generateSlug(formData.title)
    setFormData({
      ...formData,
      slug: newSlug,
    })
    setSlugManuallyEdited(false)
    toast.success('Slug regenerated from title')
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      toast.error('You must be logged in')
      setLoading(false)
      return
    }

    // Ensure slug is set (fallback to title if empty)
    const finalSlug = formData.slug.trim() || generateSlug(formData.title.trim())
    
    const submitData: any = {
      title: formData.title.trim(),
      slug: finalSlug,
      excerpt: formData.excerpt.trim() || null,
      content: formData.content, // Don't trim HTML content
      featured_image: formData.featured_image || null,
      published: formData.published,
      author_id: user.id,
      meta_keywords: formData.meta_keywords.trim() || null,
      tags: formData.tags.length > 0 ? formData.tags : null,
    }

    // Handle scheduling
    if (formData.scheduled_at) {
      const scheduledDate = new Date(formData.scheduled_at)
      const now = new Date()
      
      if (scheduledDate > now) {
        // Scheduled for future - don't publish yet
        submitData.scheduled_at = scheduledDate.toISOString()
        submitData.published = false
        submitData.published_at = null
      } else {
        // Scheduled time has passed - publish immediately
        submitData.scheduled_at = null
        submitData.published = true
        if (!isEditMode) {
          submitData.published_at = new Date().toISOString()
        }
      }
    } else {
      submitData.scheduled_at = null
      if (formData.published && !isEditMode) {
        submitData.published_at = new Date().toISOString()
      }
    }

    try {
      if (isEditMode) {
        const { error } = await supabase
          .from('blog_posts')
          // @ts-expect-error - Supabase type inference issue
          .update(submitData)
          .eq('id', editId)

        if (error) throw error
        toast.success('Blog post updated successfully')
      } else {
        const { error } = await supabase
          .from('blog_posts')
          // @ts-expect-error - Supabase type inference issue
          .insert([submitData])

        if (error) throw error
        toast.success('Blog post created successfully')
      }

      router.push('/admin/blog')
      router.refresh()
    } catch (error: any) {
      console.error('Error saving blog post:', error)
      toast.error(error.message || 'Failed to save blog post')
      setLoading(false)
    }
  }

  if (checkingAuth || loadingPost) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-red-600" />
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/blog">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
              {isEditMode ? 'Edit Blog Post' : 'Write Blog Post'}
            </h1>
            <p className="text-sm lg:text-base text-gray-600 mt-1">
              {isEditMode ? 'Update your blog post' : 'Create a new blog post'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="border-2 border-gray-200">
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Title, slug, and excerpt</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Enter blog post title"
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="slug">Slug *</Label>
                  {slugManuallyEdited && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={regenerateSlug}
                      className="h-7 text-xs"
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Regenerate from title
                    </Button>
                  )}
                </div>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder="blog-post-slug"
                  required
                />
                <p className="text-xs text-gray-500">
                  Auto-generated from title. You can edit it manually if needed.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="excerpt">Excerpt</Label>
                <Textarea
                  id="excerpt"
                  value={formData.excerpt}
                  onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                  placeholder="A short description of the blog post"
                  rows={3}
                />
                <p className="text-xs text-gray-500">
                  Optional. A brief summary that appears in blog listings.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-gray-200">
            <CardHeader>
              <CardTitle>Cover Image</CardTitle>
              <CardDescription>Upload a featured image for your blog post</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.featured_image ? (
                <div className="relative">
                  <div className="relative w-full h-64 rounded-lg overflow-hidden border-2 border-gray-200">
                    <Image
                      src={formData.featured_image}
                      alt="Featured image"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => setFormData({ ...formData, featured_image: '' })}
                    className="mt-2"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Remove Image
                  </Button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <Label htmlFor="image-upload" className="cursor-pointer">
                    <span className="text-sm font-medium text-red-600 hover:text-red-700">
                      Click to upload cover image
                    </span>
                    <input
                      id="image-upload"
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={uploadingImage}
                    />
                  </Label>
                  <p className="text-xs text-gray-500 mt-2">
                    PNG, JPG, WebP up to 5MB
                  </p>
                </div>
              )}
              {uploadingImage && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading image...
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-2 border-gray-200">
            <CardHeader>
              <CardTitle>Content</CardTitle>
              <CardDescription>Write your blog post content with rich formatting</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="content">Body *</Label>
                <RichTextEditor
                  value={formData.content}
                  onChange={(value) => setFormData({ ...formData, content: value })}
                  placeholder="Write your blog post content here..."
                />
                <p className="text-xs text-gray-500">
                  Use the toolbar above to format your text, add headings, lists, links, images, and more.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-gray-200">
            <CardHeader>
              <CardTitle>Publishing & SEO</CardTitle>
              <CardDescription>Control when your blog post is published and add SEO metadata</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="published">Publish immediately</Label>
                  <p className="text-sm text-gray-500">
                    Make this post visible to the public right away
                  </p>
                </div>
                <Switch
                  id="published"
                  checked={formData.published && !formData.scheduled_at}
                  onCheckedChange={(checked) => {
                    setFormData({ 
                      ...formData, 
                      published: checked,
                      scheduled_at: checked ? '' : formData.scheduled_at
                    })
                  }}
                  disabled={!!formData.scheduled_at}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="scheduled_at">Schedule Publication</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="scheduled_at"
                    type="datetime-local"
                    value={formData.scheduled_at}
                    onChange={(e) => {
                      const scheduled = e.target.value
                      setFormData({ 
                        ...formData, 
                        scheduled_at: scheduled,
                        published: scheduled ? false : formData.published
                      })
                    }}
                    className="flex-1"
                  />
                  {formData.scheduled_at && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setFormData({ ...formData, scheduled_at: '', published: false })}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  Schedule this post to be published automatically at a specific date and time
                </p>
                {formData.scheduled_at && (
                  <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>
                        Will be published on {new Date(formData.scheduled_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="meta_keywords">Meta Keywords</Label>
                <Input
                  id="meta_keywords"
                  value={formData.meta_keywords}
                  onChange={(e) => setFormData({ ...formData, meta_keywords: e.target.value })}
                  placeholder="keyword1, keyword2, keyword3"
                />
                <p className="text-xs text-gray-500">
                  Comma-separated keywords for SEO (e.g., football, predictions, betting tips)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags">Tags</Label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      id="tags"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && tagInput.trim()) {
                          e.preventDefault()
                          const newTag = tagInput.trim()
                          if (!formData.tags.includes(newTag)) {
                            setFormData({ ...formData, tags: [...formData.tags, newTag] })
                          }
                          setTagInput('')
                        }
                      }}
                      placeholder="Type a tag and press Enter"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
                          setFormData({ ...formData, tags: [...formData.tags, tagInput.trim()] })
                          setTagInput('')
                        }
                      }}
                    >
                      Add
                    </Button>
                  </div>
                  {formData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.tags.map((tag, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="flex items-center gap-1"
                        >
                          #{tag}
                          <button
                            type="button"
                            onClick={() => {
                              setFormData({
                                ...formData,
                                tags: formData.tags.filter((_, i) => i !== index)
                              })
                            }}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  Add tags to categorize your blog post. Press Enter or click Add to add a tag.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center gap-4">
            <Button
              type="submit"
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {isEditMode ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  {isEditMode ? 'Update Post' : 'Create Post'}
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/admin/blog')}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </AdminLayout>
  )
}

export default function WriteBlogPage() {
  return (
    <Suspense fallback={
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-red-600" />
        </div>
      </AdminLayout>
    }>
      <WriteBlogContent />
    </Suspense>
  )
}

