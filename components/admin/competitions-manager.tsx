'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { RichTextEditor } from '@/components/admin/rich-text-editor'
import { ImportCompetitionDialog } from '@/components/admin/import-competition-dialog'
import { toast } from 'sonner'
import { ChevronDown, ChevronUp, Plus, ExternalLink, Trash2, ImagePlus, Download } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

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
  display_order: number | null
  country: string | null
  competition_type: string | null
  current_season: string | null
}

interface CompetitionsManagerProps {
  competitions: Competition[]
}

const slugify = (value: string) =>
  value.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

async function uploadFeaturedImage(file: File, slug: string, previousUrl?: string | null): Promise<string | null> {
  if (!file.type.startsWith('image/')) {
    toast.error('Please upload an image file')
    return null
  }
  if (file.size > 5 * 1024 * 1024) {
    toast.error('File size must be less than 5MB')
    return null
  }

  const fileExt = file.name.split('.').pop()?.toLowerCase()
  if (!fileExt || !['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(fileExt)) {
    toast.error('Invalid file type. Please upload PNG, JPG, GIF, WEBP, or SVG')
    return null
  }

  const supabase = createClient()
  const fileName = `competitions/${slug || `temp-${Date.now()}`}-${Date.now()}.${fileExt}`

  if (previousUrl) {
    try {
      const oldPath = previousUrl.split('/').slice(-2).join('/')
      if (oldPath && oldPath.startsWith('competitions/')) {
        await supabase.storage.from('competition-images').remove([oldPath])
      }
    } catch {
      // ignore — old file may not exist
    }
  }

  const { error } = await supabase.storage
    .from('competition-images')
    .upload(fileName, file, { cacheControl: '3600', upsert: false })

  if (error) {
    if (error.message?.includes('row-level security') || error.message?.includes('RLS')) {
      toast.error('Storage policy missing! Go to Supabase Dashboard → Storage → competition-images → Policies → Create INSERT policy with: bucket_id = \'competition-images\'', { duration: 10000 })
    } else {
      toast.error(error.message || 'Failed to upload image')
    }
    return null
  }

  const { data: { publicUrl } } = supabase.storage.from('competition-images').getPublicUrl(fileName)
  return publicUrl || null
}

export function CompetitionsManager({ competitions: initialCompetitions }: CompetitionsManagerProps) {
  const [competitions, setCompetitions] = useState<Competition[]>(initialCompetitions)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const [showNewForm, setShowNewForm] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [creatingCompetition, setCreatingCompetition] = useState(false)
  const [newCompetition, setNewCompetition] = useState({
    slug: '',
    name: '',
    league_id: '',
    heading: '',
    subheading: '',
    introduction: '',
    seo_title: '',
    seo_description: '',
  })

  const updateCompetition = (id: string, field: keyof Competition, value: any) => {
    setCompetitions(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c))
  }

  const saveCompetition = async (competition: Competition) => {
    setSaving(competition.id)
    try {
      const supabase = createClient()
      const { error } = await (supabase as any)
        .from('competitions')
        .update({
          name: competition.name,
          league_id: competition.league_id,
          featured_image: competition.featured_image,
          status: competition.status,
          seo_title: competition.seo_title,
          seo_description: competition.seo_description,
          heading: competition.heading,
          subheading: competition.subheading,
          introduction: competition.introduction,
          display_order: competition.display_order,
          country: competition.country,
          competition_type: competition.competition_type,
          current_season: competition.current_season,
        })
        .eq('id', competition.id)

      if (error) throw error
      toast.success('Competition saved!')
    } catch (err: any) {
      toast.error(err.message || 'Failed to save competition')
    } finally {
      setSaving(null)
    }
  }

  const deleteCompetition = async (competition: Competition) => {
    if (!confirm(`Delete "${competition.name}"? This cannot be undone.`)) return
    setDeleting(competition.id)
    try {
      const supabase = createClient()
      const { error } = await (supabase as any).from('competitions').delete().eq('id', competition.id)
      if (error) throw error
      setCompetitions(prev => prev.filter(c => c.id !== competition.id))
      toast.success('Competition deleted')
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete competition')
    } finally {
      setDeleting(null)
    }
  }

  const createCompetition = async () => {
    if (!newCompetition.slug || !newCompetition.name || !newCompetition.league_id) {
      toast.error('Slug, name, and league ID are required')
      return
    }
    setCreatingCompetition(true)
    try {
      const supabase = createClient()
      const { data, error } = await (supabase as any)
        .from('competitions')
        .insert({
          slug: slugify(newCompetition.slug),
          name: newCompetition.name,
          league_id: newCompetition.league_id,
          heading: newCompetition.heading || newCompetition.name,
          subheading: newCompetition.subheading || null,
          introduction: newCompetition.introduction || null,
          seo_title: newCompetition.seo_title || null,
          seo_description: newCompetition.seo_description || null,
          status: 'active',
          display_order: competitions.length + 1,
        })
        .select()
        .single()

      if (error) throw error
      setCompetitions(prev => [...prev, data])
      setNewCompetition({ slug: '', name: '', league_id: '', heading: '', subheading: '', introduction: '', seo_title: '', seo_description: '' })
      setShowNewForm(false)
      toast.success('Competition created!')
    } catch (err: any) {
      toast.error(err.message || 'Failed to create competition')
    } finally {
      setCreatingCompetition(false)
    }
  }

  const handleImageSelect = async (competition: Competition, file: File) => {
    setUploadingId(competition.id)
    const url = await uploadFeaturedImage(file, competition.slug, competition.featured_image)
    if (url) {
      updateCompetition(competition.id, 'featured_image', url)
      toast.success('Image uploaded — remember to Save Changes')
    }
    setUploadingId(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Competitions</h1>
          <p className="text-sm lg:text-base text-muted-foreground mt-1">
            Manage competition landing pages shown at /competitions
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowImportDialog(true)} className="gap-2">
            <Download className="h-4 w-4" />
            Import Competition
          </Button>
          <Button onClick={() => setShowNewForm(!showNewForm)} className="gap-2">
            <Plus className="h-4 w-4" />
            New Competition
          </Button>
        </div>
      </div>

      <ImportCompetitionDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        existingSlugs={competitions.map(c => c.slug)}
        existingLeagueIds={competitions.map(c => c.league_id)}
        nextDisplayOrder={competitions.length + 1}
        onImported={imported => setCompetitions(prev => [...prev, imported as Competition])}
      />

      {showNewForm && (
        <Card className="border-2 border-blue-200 bg-blue-50/30">
          <CardHeader className="p-5 border-b border-blue-200">
            <CardTitle className="text-lg">Create New Competition</CardTitle>
            <CardDescription>New competitions are accessible at /competitions/[slug]</CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Slug <span className="text-red-500">*</span></Label>
                <Input
                  value={newCompetition.slug}
                  onChange={e => setNewCompetition(p => ({ ...p, slug: e.target.value }))}
                  placeholder="e.g. world-cup"
                />
                <p className="text-xs text-muted-foreground">URL: /competitions/{newCompetition.slug || 'your-slug'}</p>
              </div>
              <div className="space-y-2">
                <Label>Competition Name <span className="text-red-500">*</span></Label>
                <Input
                  value={newCompetition.name}
                  onChange={e => setNewCompetition(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. World Cup"
                />
              </div>
              <div className="space-y-2">
                <Label>API-Football League ID <span className="text-red-500">*</span></Label>
                <Input
                  value={newCompetition.league_id}
                  onChange={e => setNewCompetition(p => ({ ...p, league_id: e.target.value }))}
                  placeholder="e.g. 1"
                />
                <p className="text-xs text-muted-foreground">Drives fixtures, results, live scores and standings for this page</p>
              </div>
              <div className="space-y-2">
                <Label>Page Heading (H1)</Label>
                <Input
                  value={newCompetition.heading}
                  onChange={e => setNewCompetition(p => ({ ...p, heading: e.target.value }))}
                  placeholder="Displayed as the H1 on the page"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Subheading</Label>
                <Input
                  value={newCompetition.subheading}
                  onChange={e => setNewCompetition(p => ({ ...p, subheading: e.target.value }))}
                  placeholder="Short subtitle under the heading"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Introduction</Label>
                <RichTextEditor
                  value={newCompetition.introduction}
                  onChange={value => setNewCompetition(p => ({ ...p, introduction: value }))}
                  placeholder="Custom written content that appears at the top of the competition page..."
                />
              </div>
              <div className="space-y-2">
                <Label>SEO Title</Label>
                <Input
                  value={newCompetition.seo_title}
                  onChange={e => setNewCompetition(p => ({ ...p, seo_title: e.target.value }))}
                  placeholder="Browser tab / search result title"
                />
              </div>
              <div className="space-y-2">
                <Label>SEO Description</Label>
                <Input
                  value={newCompetition.seo_description}
                  onChange={e => setNewCompetition(p => ({ ...p, seo_description: e.target.value }))}
                  placeholder="Search engine description"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={createCompetition} disabled={creatingCompetition}>
                {creatingCompetition ? 'Creating...' : 'Create Competition'}
              </Button>
              <Button variant="outline" onClick={() => setShowNewForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {competitions.map(competition => {
          const isExpanded = expandedId === competition.id
          const isSaving = saving === competition.id
          const isDeleting = deleting === competition.id
          const isUploading = uploadingId === competition.id

          return (
            <Card key={competition.id} className="border-2 border-gray-200">
              <div
                className="flex items-center justify-between p-4 lg:p-5 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : competition.id)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {competition.featured_image && (
                    <Image
                      src={competition.featured_image}
                      alt={competition.name}
                      width={40}
                      height={40}
                      className="h-10 w-10 rounded object-cover flex-shrink-0"
                    />
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900 text-sm lg:text-base">{competition.heading || competition.name}</span>
                      {competition.status === 'inactive' && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
                      <Badge variant="outline" className="text-xs">League ID: {competition.league_id}</Badge>
                    </div>
                    <span className="text-xs text-gray-500">/competitions/{competition.slug}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Link
                    href={`/competitions/${competition.slug}`}
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

              {isExpanded && (
                <div className="border-t border-gray-200 p-4 lg:p-5 space-y-5">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Basic Information</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Competition Name</Label>
                        <Input
                          value={competition.name}
                          onChange={e => updateCompetition(competition.id, 'name', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>API-Football League ID</Label>
                        <Input
                          value={competition.league_id}
                          onChange={e => updateCompetition(competition.id, 'league_id', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Country</Label>
                        <Input
                          value={competition.country || ''}
                          onChange={e => updateCompetition(competition.id, 'country', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Competition Type</Label>
                        <Input
                          value={competition.competition_type || ''}
                          onChange={e => updateCompetition(competition.id, 'competition_type', e.target.value)}
                          placeholder="League or Cup"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Current Season</Label>
                        <Input
                          value={competition.current_season || ''}
                          onChange={e => updateCompetition(competition.id, 'current_season', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label>Featured Image</Label>
                        <div className="flex items-center gap-3">
                          {competition.featured_image && (
                            <Image
                              src={competition.featured_image}
                              alt={competition.name}
                              width={64}
                              height={64}
                              className="h-16 w-16 rounded object-cover border"
                            />
                          )}
                          <label className="inline-flex items-center gap-2 px-3 py-2 rounded border border-gray-300 text-sm cursor-pointer hover:bg-gray-50">
                            <ImagePlus className="h-4 w-4" />
                            {isUploading ? 'Uploading...' : 'Upload Image'}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={isUploading}
                              onChange={e => {
                                const file = e.target.files?.[0]
                                if (file) handleImageSelect(competition, file)
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Landing Page Content</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Page Heading (H1)</Label>
                        <Input
                          value={competition.heading || ''}
                          onChange={e => updateCompetition(competition.id, 'heading', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Subheading</Label>
                        <Input
                          value={competition.subheading || ''}
                          onChange={e => updateCompetition(competition.id, 'subheading', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label>Introduction / Additional SEO Content</Label>
                        <RichTextEditor
                          value={competition.introduction || ''}
                          onChange={value => updateCompetition(competition.id, 'introduction', value)}
                          placeholder="Custom written content that appears at the top of the competition page..."
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">SEO</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>SEO Title</Label>
                        <Input
                          value={competition.seo_title || ''}
                          onChange={e => updateCompetition(competition.id, 'seo_title', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>SEO Description</Label>
                        <Input
                          value={competition.seo_description || ''}
                          onChange={e => updateCompetition(competition.id, 'seo_description', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Display Order</Label>
                        <Input
                          type="number"
                          value={competition.display_order ?? 0}
                          onChange={e => updateCompetition(competition.id, 'display_order', parseInt(e.target.value) || 0)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    <Switch
                      id={`status-${competition.id}`}
                      checked={competition.status === 'active'}
                      onCheckedChange={v => updateCompetition(competition.id, 'status', v ? 'active' : 'inactive')}
                    />
                    <Label htmlFor={`status-${competition.id}`} className="cursor-pointer">
                      Active (visible to public)
                    </Label>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                    <Button onClick={() => saveCompetition(competition)} disabled={isSaving}>
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteCompetition(competition)}
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

        {competitions.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No competitions yet. Click &quot;New Competition&quot; to create one.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
