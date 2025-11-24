'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { BlogPost } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Edit, Trash2, Eye, Plus, Calendar } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface BlogManagerProps {
  initialPosts: BlogPost[]
}

export function BlogManager({ initialPosts }: BlogManagerProps) {
  const router = useRouter()
  const [posts, setPosts] = useState<BlogPost[]>(initialPosts)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [postToDelete, setPostToDelete] = useState<string | null>(null)

  const handleDelete = async (postId: string) => {
    setPostToDelete(postId)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!postToDelete) return

    setDeletingId(postToDelete)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('blog_posts')
        .delete()
        .eq('id', postToDelete)

      if (error) throw error

      setPosts(posts.filter(post => post.id !== postToDelete))
      toast.success('Blog post deleted successfully')
    } catch (error: any) {
      console.error('Error deleting post:', error)
      toast.error(error.message || 'Failed to delete blog post')
    } finally {
      setDeletingId(null)
      setDeleteDialogOpen(false)
      setPostToDelete(null)
    }
  }

  const togglePublish = async (post: BlogPost) => {
    const supabase = createClient()
    const newPublished = !post.published
    const updateData: any = { published: newPublished }
    
    if (newPublished && !post.published_at) {
      updateData.published_at = new Date().toISOString()
    }

    try {
      const { error } = await supabase
        .from('blog_posts')
        // @ts-expect-error - Supabase type inference issue
        .update(updateData)
        .eq('id', post.id)

      if (error) throw error

      setPosts(posts.map(p => 
        p.id === post.id 
          ? { ...p, published: newPublished, published_at: updateData.published_at || p.published_at }
          : p
      ))
      toast.success(newPublished ? 'Blog post published' : 'Blog post unpublished')
    } catch (error: any) {
      console.error('Error updating post:', error)
      toast.error(error.message || 'Failed to update blog post')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Blog Posts</h2>
          <p className="text-sm text-gray-600 mt-1">Manage your blog posts</p>
        </div>
        <Button asChild className="bg-red-600 hover:bg-red-700 text-white">
          <Link href="/admin/blog/write">
            <Plus className="h-4 w-4 mr-2" />
            Write Blog
          </Link>
        </Button>
      </div>

      <Card className="border-2 border-gray-200 shadow-sm">
        <CardHeader className="p-5 border-b border-gray-200">
          <CardTitle className="text-lg font-semibold">All Blog Posts</CardTitle>
          <CardDescription className="text-sm mt-1">
            {posts.length} {posts.length === 1 ? 'post' : 'posts'}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 lg:p-6">
          {posts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">No blog posts yet</p>
              <Button asChild className="bg-red-600 hover:bg-red-700 text-white">
                <Link href="/admin/blog/write">
                  <Plus className="h-4 w-4 mr-2" />
                  Write Your First Blog Post
                </Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Published</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {posts.map((post) => (
                    <TableRow key={post.id}>
                      <TableCell className="font-medium max-w-md">
                        <div className="truncate">{post.title}</div>
                        {post.slug && (
                          <div className="text-xs text-gray-500 mt-1 truncate">
                            /blog/{post.slug}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const postData = post as any
                          if (postData.scheduled_at && new Date(postData.scheduled_at) > new Date()) {
                            return (
                              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                                <Calendar className="h-3 w-3 mr-1" />
                                Scheduled
                              </Badge>
                            )
                          }
                          return (
                            <Badge 
                              variant={post.published ? "default" : "secondary"}
                              className={post.published ? "bg-green-600 hover:bg-green-700" : ""}
                            >
                              {post.published ? 'Published' : 'Draft'}
                            </Badge>
                          )
                        })()}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {(() => {
                          const postData = post as any
                          if (postData.scheduled_at && new Date(postData.scheduled_at) > new Date()) {
                            return (
                              <div>
                                <div className="flex items-center gap-1 text-yellow-700">
                                  <Calendar className="h-3 w-3" />
                                  <span>Scheduled: {new Date(postData.scheduled_at).toLocaleString()}</span>
                                </div>
                              </div>
                            )
                          }
                          return post.published_at 
                            ? formatDistanceToNow(new Date(post.published_at), { addSuffix: true })
                            : 'Not published'
                        })()}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {post.published && (
                            <Button
                              variant="ghost"
                              size="sm"
                              asChild
                              className="h-8 w-8 p-0"
                            >
                              <Link href={`/blog/${post.slug}`} target="_blank">
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => togglePublish(post)}
                            className="h-8 w-8 p-0"
                          >
                            {post.published ? 'Unpublish' : 'Publish'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                            className="h-8 w-8 p-0"
                          >
                            <Link href={`/admin/blog/write?edit=${post.id}`}>
                              <Edit className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(post.id)}
                            disabled={deletingId === post.id}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Blog Post</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this blog post? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false)
                setPostToDelete(null)
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deletingId !== null}
            >
              {deletingId ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

