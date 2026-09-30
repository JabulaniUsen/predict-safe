'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { Plus, Edit, Trash2, ExternalLink, CheckCircle2, EyeOff, Search } from 'lucide-react'
import {
  LINK_PLACEMENTS,
  LINK_ATTRIBUTES,
  PARTNERSHIP_STATUSES,
  THEIR_LINK_STATUSES,
  domainFromUrl,
  type LinkPartnership,
} from '@/lib/link-partnerships'
import { Database } from '@/types/database'

type PartnershipInsert = Database['public']['Tables']['link_partnerships']['Insert']
type PartnershipUpdate = Database['public']['Tables']['link_partnerships']['Update']

interface LinkPartnershipsManagerProps {
  partnerships: LinkPartnership[]
}

const emptyForm = {
  partner_name: '',
  partner_domain: '',
  partner_website: '',
  target_url: '',
  anchor_text: '',
  placement: 'recommended_platforms',
  link_attribute: 'standard',
  status: 'pending',
  display_order: 0,
  their_backlink_url: '',
  our_target_url: '',
  their_anchor_text: '',
  their_link_status: 'expected',
  notes: '',
}

function statusBadge(status: string) {
  if (status === 'active') return <Badge className="bg-green-600">Active</Badge>
  if (status === 'inactive') return <Badge variant="secondary">Inactive</Badge>
  return <Badge variant="outline">Pending</Badge>
}

function theirStatusBadge(status: string) {
  if (status === 'confirmed') return <Badge className="bg-green-600">Confirmed</Badge>
  if (status === 'removed') return <Badge variant="destructive">Removed</Badge>
  return <Badge variant="outline">Expected</Badge>
}

export function LinkPartnershipsManager({ partnerships: initial }: LinkPartnershipsManagerProps) {
  const router = useRouter()
  const [items, setItems] = useState<LinkPartnership[]>(initial)
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState<LinkPartnership | null>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [theirFilter, setTheirFilter] = useState('all')
  const [placementFilter, setPlacementFilter] = useState('all')
  const [attributeFilter, setAttributeFilter] = useState('all')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false
      if (theirFilter !== 'all' && p.their_link_status !== theirFilter) return false
      if (placementFilter !== 'all' && p.placement !== placementFilter) return false
      if (attributeFilter !== 'all' && p.link_attribute !== attributeFilter) return false
      if (q && !`${p.partner_name} ${p.partner_domain} ${p.target_url} ${p.anchor_text}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [items, search, statusFilter, theirFilter, placementFilter, attributeFilter])

  const refresh = async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('link_partnerships')
      .select('*')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false })
    if (!error && data) setItems(data as LinkPartnership[])
    router.refresh()
  }

  const openAdd = () => {
    setForm(emptyForm)
    setEditing(null)
    setShowDialog(true)
  }

  const openEdit = (p: LinkPartnership) => {
    setForm({
      partner_name: p.partner_name,
      partner_domain: p.partner_domain,
      partner_website: p.partner_website,
      target_url: p.target_url,
      anchor_text: p.anchor_text,
      placement: p.placement,
      link_attribute: p.link_attribute,
      status: p.status,
      display_order: p.display_order,
      their_backlink_url: p.their_backlink_url ?? '',
      our_target_url: p.our_target_url ?? '',
      their_anchor_text: p.their_anchor_text ?? '',
      their_link_status: p.their_link_status,
      notes: p.notes ?? '',
    })
    setEditing(p)
    setShowDialog(true)
  }

  const validate = () => {
    if (!form.partner_name.trim()) { toast.error('Partner name is required'); return false }
    for (const [key, label] of [['partner_website', 'Partner website'], ['target_url', 'Target URL']] as const) {
      try { new URL(form[key]) }
      catch { toast.error(`${label} must be a valid URL (include https://)`); return false }
    }
    if (!form.anchor_text.trim()) { toast.error('Anchor text is required'); return false }
    if (!form.placement.trim()) { toast.error('Placement is required'); return false }
    if (form.their_backlink_url.trim()) {
      try { new URL(form.their_backlink_url.trim()) }
      catch { toast.error('Their backlink URL must be a valid URL'); return false }
    }
    return true
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setLoading(true)
    try {
      const supabase = createClient()
      const domain = form.partner_domain.trim()
        || domainFromUrl(form.partner_website)
        || domainFromUrl(form.target_url)
        || ''
      const payload = {
        partner_name: form.partner_name.trim(),
        partner_domain: domain,
        partner_website: form.partner_website.trim(),
        target_url: form.target_url.trim(),
        anchor_text: form.anchor_text.trim(),
        placement: form.placement.trim(),
        link_attribute: form.link_attribute,
        status: form.status,
        display_order: Number(form.display_order) || 0,
        their_backlink_url: form.their_backlink_url.trim() || null,
        our_target_url: form.our_target_url.trim() || null,
        their_anchor_text: form.their_anchor_text.trim() || null,
        their_link_status: form.their_link_status,
        notes: form.notes.trim() || null,
        updated_at: new Date().toISOString(),
      }
      if (editing) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any)
          .from('link_partnerships')
          .update(payload)
          .eq('id', editing.id)
        if (error) throw error
        toast.success('Partnership updated. Active records render publicly on the assigned placement.')
      } else {
        const insertPayload: PartnershipInsert = payload as PartnershipInsert
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any)
          .from('link_partnerships')
          .insert(insertPayload)
        if (error) throw error
        toast.success('Partnership added. Set status to Active to publish the public link.')
      }
      setShowDialog(false)
      setEditing(null)
      await refresh()
    } catch (error) {
      console.error('Error saving partnership:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save partnership')
    } finally {
      setLoading(false)
    }
  }

  const updateRow = async (id: string, patch: PartnershipUpdate, success: string) => {
    try {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('link_partnerships')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
      toast.success(success)
      await refresh()
    } catch (error) {
      console.error('Error updating partnership:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update partnership')
    }
  }

  const handleToggleActive = (p: LinkPartnership) =>
    updateRow(
      p.id,
      { status: p.status === 'active' ? 'inactive' : 'active' },
      p.status === 'active'
        ? 'Outgoing link unpublished (no longer rendered publicly).'
        : 'Partnership activated — outgoing link is now rendered publicly.'
    )

  const handleVerify = (p: LinkPartnership) =>
    updateRow(
      p.id,
      { their_link_status: 'confirmed', verified_at: new Date().toISOString() },
      'Their backlink marked as confirmed.'
    )

  const handleRemove = (p: LinkPartnership) =>
    updateRow(
      p.id,
      { status: 'inactive', their_link_status: 'removed' },
      'Partnership removed: our link unpublished and their side marked removed.'
    )

  const handleDelete = async (id: string) => {
    if (!confirm('Permanently delete this partnership record? This does not affect links already published on external sites.')) return
    setDeletingId(id)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('link_partnerships').delete().eq('id', id)
      if (error) throw error
      toast.success('Partnership deleted.')
      await refresh()
    } catch (error) {
      console.error('Error deleting partnership:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete partnership')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground max-w-2xl">
          Records are configuration only. Our outgoing link goes live when status is{' '}
          <strong>Active</strong> — the assigned public placement then renders a real crawlable{' '}
          <code>&lt;a href&gt;</code>. Incoming links must be published on the partner&apos;s own site;
          adding a record here never changes any backlink count.
        </p>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4 mr-2" /> Add Partnership
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="relative lg:col-span-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search partner, domain, URL…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger><SelectValue placeholder="Our status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {PARTNERSHIP_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={theirFilter} onValueChange={setTheirFilter}>
            <SelectTrigger><SelectValue placeholder="Their link" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Their link: all</SelectItem>
              {THEIR_LINK_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={placementFilter} onValueChange={setPlacementFilter}>
            <SelectTrigger><SelectValue placeholder="Placement" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All placements</SelectItem>
              {LINK_PLACEMENTS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={attributeFilter} onValueChange={setAttributeFilter}>
            <SelectTrigger><SelectValue placeholder="Link attribute" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All attributes</SelectItem>
              {LINK_ATTRIBUTES.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="pt-6 overflow-x-auto">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No partnerships match the current filters.</p>
          ) : (
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="pb-2 pr-4">Partner</th>
                  <th className="pb-2 pr-4">Our link →</th>
                  <th className="pb-2 pr-4">Their link ←</th>
                  <th className="pb-2 pr-4">Placement</th>
                  <th className="pb-2 pr-4">Attribute</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2 pr-4">Added</th>
                  <th className="pb-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-b last:border-0 align-top">
                    <td className="py-3 pr-4">
                      <p className="font-medium">{p.partner_name}</p>
                      <p className="text-muted-foreground text-xs">{p.partner_domain}</p>
                    </td>
                    <td className="py-3 pr-4 max-w-[220px]">
                      <a href={p.target_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1 break-all">
                        {p.anchor_text} <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    </td>
                    <td className="py-3 pr-4 max-w-[220px]">
                      {p.their_backlink_url ? (
                        <a href={p.their_backlink_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1 break-all">
                          {p.their_anchor_text || p.their_backlink_url} <ExternalLink className="h-3 w-3 shrink-0" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground text-xs">Not recorded</span>
                      )}
                      <div className="mt-1">{theirStatusBadge(p.their_link_status)}</div>
                    </td>
                    <td className="py-3 pr-4"><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{p.placement}</code></td>
                    <td className="py-3 pr-4 text-xs">{p.link_attribute === 'standard' ? 'Follow' : p.link_attribute}</td>
                    <td className="py-3 pr-4">{statusBadge(p.status)}</td>
                    <td className="py-3 pr-4 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(p.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3">
                      <div className="flex justify-end gap-1 flex-wrap">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(p)} title="Edit"><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleToggleActive(p)} title={p.status === 'active' ? 'Deactivate (unpublish link)' : 'Activate (publish link)'}>
                          <EyeOff className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleVerify(p)} title="Verify — mark their backlink confirmed"><CheckCircle2 className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleRemove(p)} title="Remove — unpublish our link, mark theirs removed">Remove</Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(p.id)} disabled={deletingId === p.id} title="Delete record">
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Link Partnership' : 'Add Link Partnership'}</DialogTitle>
            <DialogDescription>
              Set status to Active to publish our outgoing link on the selected public placement as a real HTML anchor.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
            <div className="sm:col-span-2"><h4 className="font-semibold text-sm">Partner information</h4></div>
            <div>
              <Label>Partner name *</Label>
              <Input value={form.partner_name} onChange={(e) => setForm({ ...form, partner_name: e.target.value })} placeholder="100 Percent Sure Wins" />
            </div>
            <div>
              <Label>Partner domain</Label>
              <Input value={form.partner_domain} onChange={(e) => setForm({ ...form, partner_domain: e.target.value })} placeholder="100percentsurewins.com (auto-filled if blank)" />
            </div>
            <div className="sm:col-span-2">
              <Label>Partner website *</Label>
              <Input value={form.partner_website} onChange={(e) => setForm({ ...form, partner_website: e.target.value })} placeholder="https://100percentsurewins.com/" />
            </div>

            <div className="sm:col-span-2 pt-2"><h4 className="font-semibold text-sm">Our outgoing link (rendered publicly)</h4></div>
            <div className="sm:col-span-2">
              <Label>Target URL *</Label>
              <Input value={form.target_url} onChange={(e) => setForm({ ...form, target_url: e.target.value })} placeholder="https://100percentsurewins.com/" />
            </div>
            <div>
              <Label>Anchor text *</Label>
              <Input value={form.anchor_text} onChange={(e) => setForm({ ...form, anchor_text: e.target.value })} placeholder="100 Percent Sure Wins" />
            </div>
            <div>
              <Label>Placement *</Label>
              <Select value={form.placement} onValueChange={(v) => setForm({ ...form, placement: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LINK_PLACEMENTS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label} ({p.value})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Link attribute *</Label>
              <Select value={form.link_attribute} onValueChange={(v) => setForm({ ...form, link_attribute: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LINK_ATTRIBUTES.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status *</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PARTNERSHIP_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Display order</Label>
              <Input type="number" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: Number(e.target.value) })} />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Switch checked={form.status === 'active'} onCheckedChange={(c) => setForm({ ...form, status: c ? 'active' : 'pending' })} />
              <span className="text-sm">Publish immediately</span>
            </div>

            <div className="sm:col-span-2 pt-2"><h4 className="font-semibold text-sm">Their link to us (tracking only)</h4></div>
            <div className="sm:col-span-2">
              <Label>Their backlink URL</Label>
              <Input value={form.their_backlink_url} onChange={(e) => setForm({ ...form, their_backlink_url: e.target.value })} placeholder="Exact page URL where they placed our link" />
            </div>
            <div>
              <Label>Our page they link to</Label>
              <Input value={form.our_target_url} onChange={(e) => setForm({ ...form, our_target_url: e.target.value })} placeholder="https://predictsafe.com/" />
            </div>
            <div>
              <Label>Anchor text they use</Label>
              <Input value={form.their_anchor_text} onChange={(e) => setForm({ ...form, their_anchor_text: e.target.value })} placeholder="PredictSafe" />
            </div>
            <div>
              <Label>Their link status</Label>
              <Select value={form.their_link_status} onValueChange={(v) => setForm({ ...form, their_link_status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {THEIR_LINK_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date added</Label>
              <Input value={editing ? new Date(editing.created_at).toLocaleString() : 'On save'} disabled />
            </div>
            <div className="sm:col-span-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Context about this exchange…" rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDialog(false); setEditing(null) }}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={loading}>{loading ? 'Saving…' : editing ? 'Save changes' : 'Add partnership'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
