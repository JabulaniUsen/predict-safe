'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { ChevronDown, ChevronUp, Plus, ExternalLink, Trash2 } from 'lucide-react'
import Link from 'next/link'

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

interface PagesManagerProps {
  pages: CustomPage[]
}

const FILTER_OPTIONS = [
  { id: 'free', label: 'Safe Free Picks' },
  { id: 'all', label: 'All Tips' },
  { id: 'super_single', label: 'Super Single' },
  { id: 'double_chance', label: 'Double Chance' },
  { id: 'home_win', label: 'Home Win' },
  { id: 'away_win', label: 'Away Win' },
  { id: 'over_1_5', label: '1.5 Goals' },
  { id: 'over_2_5', label: '2.5 Goals' },
  { id: 'btts', label: 'BTTS/GG' },
  { id: 'none', label: 'No predictions (content-only)' },
]

const FOOTER_SECTIONS = [
  { value: 'predictions', label: 'Predictions' },
  { value: 'quick_links', label: 'Quick Links' },
  { value: 'legal', label: 'Legal & Support' },
]

export function PagesManager({ pages: initialPages }: PagesManagerProps) {
  const [pages, setPages] = useState<CustomPage[]>(initialPages)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [showNewForm, setShowNewForm] = useState(false)
  const [newPage, setNewPage] = useState({
    slug: '',
    title: '',
    heading: '',
    subheading: '',
    description: '',
    filter_id: 'free',
  })
  const [creatingPage, setCreatingPage] = useState(false)

  const updatePage = (id: string, field: keyof CustomPage, value: any) => {
    setPages(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p))
  }

  const savePage = async (page: CustomPage) => {
    setSaving(page.id)
    try {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('custom_pages')
        .update({
          heading: page.heading,
          subheading: page.subheading,
          description: page.description,
          filter_id: page.filter_id,
          is_published: page.is_published,
          show_in_footer: page.show_in_footer,
          footer_section: page.footer_section,
          footer_label: page.footer_label,
          footer_order: page.footer_order,
          meta_title: page.meta_title,
          meta_description: page.meta_description,
        })
        .eq('id', page.id)

      if (error) throw error
      toast.success('Page saved!')
    } catch (err: any) {
      toast.error(err.message || 'Failed to save page')
    } finally {
      setSaving(null)
    }
  }

  const deletePage = async (page: CustomPage) => {
    if (!confirm(`Delete "${page.title}"? This cannot be undone.`)) return
    setDeleting(page.id)
    try {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from('custom_pages').delete().eq('id', page.id)
      if (error) throw error
      setPages(prev => prev.filter(p => p.id !== page.id))
      toast.success('Page deleted')
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete page')
    } finally {
      setDeleting(null)
    }
  }

  const createPage = async () => {
    if (!newPage.slug || !newPage.title) {
      toast.error('Slug and title are required')
      return
    }
    setCreatingPage(true)
    try {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('custom_pages')
        .insert({
          slug: newPage.slug.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
          title: newPage.title,
          heading: newPage.heading || newPage.title,
          subheading: newPage.subheading || null,
          description: newPage.description || null,
          filter_id: newPage.filter_id === 'none' ? null : newPage.filter_id,
          is_published: true,
          show_in_footer: false,
          footer_section: 'predictions',
          footer_order: pages.length + 1,
        })
        .select()
        .single()

      if (error) throw error
      setPages(prev => [...prev, data])
      setNewPage({ slug: '', title: '', heading: '', subheading: '', description: '', filter_id: 'free' })
      setShowNewForm(false)
      toast.success('Page created!')
    } catch (err: any) {
      toast.error(err.message || 'Failed to create page')
    } finally {
      setCreatingPage(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Pages</h1>
          <p className="text-sm lg:text-base text-muted-foreground mt-1">
            Manage tip pages and their footer visibility
          </p>
        </div>
        <Button onClick={() => setShowNewForm(!showNewForm)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Page
        </Button>
      </div>

      {/* New Page Form */}
      {showNewForm && (
        <Card className="border-2 border-blue-200 bg-blue-50/30">
          <CardHeader className="p-5 border-b border-blue-200">
            <CardTitle className="text-lg">Create New Page</CardTitle>
            <CardDescription>New pages are accessible at /tips/[slug]</CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Slug <span className="text-red-500">*</span></Label>
                <Input
                  value={newPage.slug}
                  onChange={e => setNewPage(p => ({ ...p, slug: e.target.value }))}
                  placeholder="e.g. correct-score"
                />
                <p className="text-xs text-muted-foreground">URL: /tips/{newPage.slug || 'your-slug'}</p>
              </div>
              <div className="space-y-2">
                <Label>Title <span className="text-red-500">*</span></Label>
                <Input
                  value={newPage.title}
                  onChange={e => setNewPage(p => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. Correct Score Tips"
                />
              </div>
              <div className="space-y-2">
                <Label>Heading</Label>
                <Input
                  value={newPage.heading}
                  onChange={e => setNewPage(p => ({ ...p, heading: e.target.value }))}
                  placeholder="Displayed as the H1 on the page"
                />
              </div>
              <div className="space-y-2">
                <Label>Subheading</Label>
                <Input
                  value={newPage.subheading}
                  onChange={e => setNewPage(p => ({ ...p, subheading: e.target.value }))}
                  placeholder="Short subtitle under the heading"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Description</Label>
                <Textarea
                  value={newPage.description}
                  onChange={e => setNewPage(p => ({ ...p, description: e.target.value }))}
                  placeholder="Introductory paragraph shown below the hero"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Predictions Filter</Label>
                <Select value={newPage.filter_id} onValueChange={v => setNewPage(p => ({ ...p, filter_id: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FILTER_OPTIONS.map(opt => (
                      <SelectItem key={opt.id} value={opt.id}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={createPage} disabled={creatingPage}>
                {creatingPage ? 'Creating...' : 'Create Page'}
              </Button>
              <Button variant="outline" onClick={() => setShowNewForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pages List */}
      <div className="space-y-3">
        {pages.map(page => {
          const isExpanded = expandedId === page.id
          const isSaving = saving === page.id
          const isDeleting = deleting === page.id

          return (
            <Card key={page.id} className="border-2 border-gray-200">
              {/* Page Header Row */}
              <div
                className="flex items-center justify-between p-4 lg:p-5 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : page.id)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900 text-sm lg:text-base">{page.heading || page.title}</span>
                      {!page.is_published && <Badge variant="secondary" className="text-xs">Draft</Badge>}
                      {page.show_in_footer && <Badge variant="outline" className="text-xs text-blue-600 border-blue-300">In Footer</Badge>}
                    </div>
                    <span className="text-xs text-gray-500">/tips/{page.slug}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Link
                    href={`/tips/${page.slug}`}
                    target="_blank"
                    onClick={e => e.stopPropagation()}
                    className="p-1.5 rounded hover:bg-gray-100 transition-colors"
                    title="View page"
                  >
                    <ExternalLink className="h-4 w-4 text-gray-500" />
                  </Link>
                  {isExpanded ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
                </div>
              </div>

              {/* Expanded Edit Form */}
              {isExpanded && (
                <div className="border-t border-gray-200 p-4 lg:p-5 space-y-5">
                  {/* Content Fields */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Page Content</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Heading</Label>
                        <Input
                          value={page.heading || ''}
                          onChange={e => updatePage(page.id, 'heading', e.target.value)}
                          placeholder="Main page heading (H1)"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Subheading</Label>
                        <Input
                          value={page.subheading || ''}
                          onChange={e => updatePage(page.id, 'subheading', e.target.value)}
                          placeholder="Short subtitle under the heading"
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label>Description</Label>
                        <Textarea
                          value={page.description || ''}
                          onChange={e => updatePage(page.id, 'description', e.target.value)}
                          placeholder="Introductory paragraph visible below the hero section"
                          rows={3}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Predictions Filter</Label>
                        <Select
                          value={page.filter_id || 'none'}
                          onValueChange={v => updatePage(page.id, 'filter_id', v === 'none' ? null : v)}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {FILTER_OPTIONS.map(opt => (
                              <SelectItem key={opt.id} value={opt.id}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">Which prediction category to display on this page</p>
                      </div>
                    </div>
                  </div>

                  {/* SEO Fields */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">SEO</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Meta Title</Label>
                        <Input
                          value={page.meta_title || ''}
                          onChange={e => updatePage(page.id, 'meta_title', e.target.value)}
                          placeholder="Browser tab title (defaults to heading)"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Meta Description</Label>
                        <Input
                          value={page.meta_description || ''}
                          onChange={e => updatePage(page.id, 'meta_description', e.target.value)}
                          placeholder="Search engine description"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Footer Settings */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Footer Settings</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="flex items-center gap-3">
                        <Switch
                          id={`footer-${page.id}`}
                          checked={page.show_in_footer}
                          onCheckedChange={v => updatePage(page.id, 'show_in_footer', v)}
                        />
                        <Label htmlFor={`footer-${page.id}`} className="cursor-pointer">
                          Show in footer
                        </Label>
                      </div>
                      <div className="space-y-2">
                        <Label>Footer Section</Label>
                        <Select
                          value={page.footer_section || 'predictions'}
                          onValueChange={v => updatePage(page.id, 'footer_section', v)}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {FOOTER_SECTIONS.map(s => (
                              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Footer Label</Label>
                        <Input
                          value={page.footer_label || ''}
                          onChange={e => updatePage(page.id, 'footer_label', e.target.value)}
                          placeholder="Text shown as the footer link"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Footer Order</Label>
                        <Input
                          type="number"
                          value={page.footer_order ?? 0}
                          onChange={e => updatePage(page.id, 'footer_order', parseInt(e.target.value) || 0)}
                          placeholder="Sort order (lower = higher)"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Visibility */}
                  <div className="flex items-center gap-3 pt-1">
                    <Switch
                      id={`published-${page.id}`}
                      checked={page.is_published}
                      onCheckedChange={v => updatePage(page.id, 'is_published', v)}
                    />
                    <Label htmlFor={`published-${page.id}`} className="cursor-pointer">
                      Published (visible to public)
                    </Label>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                    <Button
                      onClick={() => savePage(page)}
                      disabled={isSaving}
                    >
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deletePage(page)}
                      disabled={isDeleting}
                      className="ml-auto gap-1"
                    >
                      <Trash2 className="h-4 w-4" />
                      {isDeleting ? 'Deleting...' : 'Delete'}
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          )
        })}

        {pages.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No pages yet. Click "New Page" to create one.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
