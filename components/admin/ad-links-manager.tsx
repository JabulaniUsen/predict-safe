'use client'

import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Pencil, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import {
  AFFILIATE_LINK_TYPES,
  AFFILIATE_LINK_LOCATIONS,
  affiliateLocationLabel,
  type AffiliateLink,
  type AffiliateLinkType,
  type AffiliateLinkLocation,
} from '@/lib/affiliate-links'

interface AdLinksManagerProps {
  adLinks: AffiliateLink[]
}

type StatusValue = 'published' | 'draft'

const emptyForm = {
  type: '' as '' | AffiliateLinkType,
  location: '' as '' | AffiliateLinkLocation,
  label: '',
  website: '',
  status: 'published' as StatusValue,
}

function typeBadge(type: string) {
  if (type === 'partners') return <Badge variant="secondary">Partners</Badge>
  return <Badge variant="outline">Menu Link</Badge>
}

function statusBadge(isActive: boolean) {
  if (isActive) return <Badge className="bg-green-600">Published</Badge>
  return <Badge variant="secondary">Draft</Badge>
}

export function AdLinksManager({ adLinks: initialAdLinks }: AdLinksManagerProps) {
  const router = useRouter()
  const [links, setLinks] = useState<AffiliateLink[]>(initialAdLinks)
  const [loading, setLoading] = useState(false)
  const [editingLink, setEditingLink] = useState<AffiliateLink | null>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState('all')

  const [form, setForm] = useState(emptyForm)

  const filtered = useMemo(() => {
    if (typeFilter === 'all') return links
    return links.filter((l) => l.type === typeFilter)
  }, [links, typeFilter])

  const refresh = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('ad_links')
      .select('*')
      .order('created_at', { ascending: true })
    if (data) setLinks(data as AffiliateLink[])
    router.refresh()
  }

  const resetForm = () => {
    setForm(emptyForm)
    setEditingLink(null)
  }

  const openAddDialog = () => {
    resetForm()
    setShowDialog(true)
  }

  const openEditDialog = (link: AffiliateLink) => {
    setForm({
      type: link.type,
      location: link.location,
      label: link.title,
      website: link.url,
      status: link.is_active ? 'published' : 'draft',
    })
    setEditingLink(link)
    setShowDialog(true)
  }

  const validate = () => {
    if (!form.type) {
      toast.error('Type is required')
      return false
    }
    if (!form.location) {
      toast.error('Location is required')
      return false
    }
    if (!form.label.trim()) {
      toast.error('Link label is required')
      return false
    }
    if (!form.website.trim()) {
      toast.error('Website address is required')
      return false
    }
    try {
      new URL(form.website.trim())
    } catch {
      toast.error('Website address must be a valid URL (include https://)')
      return false
    }
    return true
  }

  const handleSubmit = async () => {
    if (!validate()) return

    setLoading(true)
    try {
      const supabase = createClient()
      const payload = {
        title: form.label.trim(),
        url: form.website.trim(),
        type: form.type,
        location: form.location,
        is_active: form.status === 'published',
        updated_at: new Date().toISOString(),
      }

      if (editingLink) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any)
          .from('ad_links')
          .update(payload)
          .eq('id', editingLink.id)
        if (error) throw error
        toast.success('Link updated successfully!')
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any)
          .from('ad_links')
          .insert(payload)
        if (error) throw error
        toast.success(
          form.type === 'menu_link'
            ? 'Menu link saved. It renders in the navbar Link slot as a follow backlink.'
            : 'Partner link saved.'
        )
      }

      setShowDialog(false)
      resetForm()
      await refresh()
    } catch (error) {
      console.error('Error saving affiliate link:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save link')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this link?')) return

    setDeletingId(id)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('ad_links').delete().eq('id', id)
      if (error) throw error
      toast.success('Link deleted successfully!')
      await refresh()
    } catch (error) {
      console.error('Error deleting affiliate link:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete link')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Affiliate/Partners Links</h2>
        <Button onClick={openAddDialog} className="bg-green-600 hover:bg-green-700">
          Add New Link
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-end mb-4">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {AFFILIATE_LINK_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label === 'Menu Link' ? 'Menu Links' : t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No links yet. Click &ldquo;Add New Link&rdquo; to create one.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[760px]">
                <thead>
                  <tr className="text-left text-muted-foreground border-b">
                    <th className="pb-2 pr-4 font-medium">ID</th>
                    <th className="pb-2 pr-4 font-medium">TYPE</th>
                    <th className="pb-2 pr-4 font-medium">LOCATION</th>
                    <th className="pb-2 pr-4 font-medium">LABEL</th>
                    <th className="pb-2 pr-4 font-medium">URL</th>
                    <th className="pb-2 pr-4 font-medium">STATUS</th>
                    <th className="pb-2 text-right font-medium">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((link, index) => (
                    <tr key={link.id} className="border-b last:border-0">
                      <td className="py-3 pr-4 text-muted-foreground">{index + 1}</td>
                      <td className="py-3 pr-4">{typeBadge(link.type)}</td>
                      <td className="py-3 pr-4">
                        {affiliateLocationLabel(link.location)}
                      </td>
                      <td className="py-3 pr-4 font-medium">{link.title}</td>
                      <td className="py-3 pr-4 max-w-[260px] truncate">
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {link.url}
                        </a>
                      </td>
                      <td className="py-3 pr-4">{statusBadge(link.is_active)}</td>
                      <td className="py-3">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(link)}
                            className="h-8 w-8 text-green-600 hover:text-green-700"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(link.id)}
                            disabled={deletingId === link.id}
                            className="h-8 w-8 text-red-500 hover:text-red-600"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="mt-4 text-xs text-muted-foreground">
            Menu links publish into the navbar slots as follow backlinks
            (server-rendered{' '}
            <code>&lt;a href&gt;</code>, no nofollow) for reciprocal-link SEO.
            Partner links publish on the public partners page.
          </p>
        </CardContent>
      </Card>

      {/* Add / Edit dialog */}
      <Dialog
        open={showDialog}
        onOpenChange={(open) => {
          setShowDialog(open)
          if (!open) resetForm()
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Add/Edit Affiliate Link</DialogTitle>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Type <span className="text-red-500">*</span>
              </label>
              <Select
                value={form.type || undefined}
                onValueChange={(v) =>
                  setForm({ ...form, type: v as AffiliateLinkType })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Menu Link" />
                </SelectTrigger>
                <SelectContent>
                  {AFFILIATE_LINK_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Location <span className="text-red-500">*</span>
              </label>
              <Select
                value={form.location || undefined}
                onValueChange={(v) =>
                  setForm({ ...form, location: v as AffiliateLinkLocation })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="placeholder" disabled>
                    Select
                  </SelectItem>
                  {AFFILIATE_LINK_LOCATIONS.map((l) => (
                    <SelectItem key={l.value} value={l.value}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Label <span className="text-red-500">*</span>
              </label>
              <Input
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder="Link Label"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Website Address <span className="text-red-500">*</span>
              </label>
              <Input
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                placeholder="Link Address"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Status <span className="text-red-500">*</span>
              </label>
              <Select
                value={form.status}
                onValueChange={(v) =>
                  setForm({ ...form, status: v as StatusValue })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Publish" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="published">Publish</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700"
            >
              {loading ? 'Saving…' : 'Save Link'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
