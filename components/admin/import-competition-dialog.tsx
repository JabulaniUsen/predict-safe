'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Search, Download, Check } from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'

interface ApiLeague {
  league_id: string
  league_name: string
  country_name?: string
  country_logo?: string
  league_logo?: string
  league_type?: string
  current_season?: string
}

interface ImportedCompetition {
  id: string
  slug: string
  name: string
  league_id: string
  featured_image: string | null
  status: 'active' | 'inactive'
  country: string | null
  competition_type: string | null
  current_season: string | null
  display_order: number | null
}

interface ImportCompetitionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  existingSlugs: string[]
  existingLeagueIds: string[]
  nextDisplayOrder: number
  onImported: (competition: ImportedCompetition) => void
}

const slugify = (value: string) =>
  value.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

export function ImportCompetitionDialog({
  open,
  onOpenChange,
  existingSlugs,
  existingLeagueIds,
  nextDisplayOrder,
  onImported,
}: ImportCompetitionDialogProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ApiLeague[]>([])
  const [loading, setLoading] = useState(false)
  const [importingId, setImportingId] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams()
        if (query) params.append('country', query)
        const response = await fetch(`/api/football/leagues?${params.toString()}`)
        if (!response.ok) throw new Error('Failed to search competitions')
        const data = await response.json()
        setResults(data || [])
      } catch (err: any) {
        toast.error(err.message || 'Failed to search competitions')
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [query, open])

  const handleImport = async (league: ApiLeague) => {
    setImportingId(league.league_id)
    try {
      let slug = slugify(league.league_name)
      if (existingSlugs.includes(slug)) {
        slug = `${slug}-${league.league_id}`
      }

      const supabase = createClient()
      const { data, error } = await (supabase as any)
        .from('competitions')
        .insert({
          slug,
          name: league.league_name,
          league_id: league.league_id,
          featured_image: league.league_logo || null,
          country: league.country_name || null,
          competition_type: league.league_type || null,
          current_season: league.current_season || null,
          heading: league.league_name,
          status: 'inactive',
          display_order: nextDisplayOrder,
        })
        .select()
        .single()

      if (error) throw error
      onImported(data)
      toast.success(`${league.league_name} imported — activate it to make it live`)
    } catch (err: any) {
      toast.error(err.message || 'Failed to import competition')
    } finally {
      setImportingId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Import Competition</DialogTitle>
          <DialogDescription>
            Search competitions/leagues available in our football API and import them directly. The Competition API ID, logo, country, type and season are filled in automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by competition name, e.g. World Cup, MLS, Saudi Pro League..."
            className="pl-9"
            autoFocus
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 min-h-[200px]">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : results.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">
              {query ? 'No competitions found.' : 'Start typing to search competitions.'}
            </p>
          ) : (
            results.map(league => {
              const alreadyImported = existingLeagueIds.includes(league.league_id)
              const isImporting = importingId === league.league_id

              return (
                <div
                  key={league.league_id}
                  className="flex items-center gap-3 p-3 rounded border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  {league.league_logo ? (
                    <Image
                      src={league.league_logo}
                      alt={league.league_name}
                      width={32}
                      height={32}
                      className="h-8 w-8 object-contain flex-shrink-0"
                      unoptimized
                    />
                  ) : (
                    <div className="h-8 w-8 flex-shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm text-gray-900">{league.league_name}</span>
                      {league.league_type && (
                        <Badge variant="outline" className="text-xs">{league.league_type}</Badge>
                      )}
                      {league.current_season && (
                        <Badge variant="outline" className="text-xs">{league.current_season}</Badge>
                      )}
                    </div>
                    {league.country_name && (
                      <span className="text-xs text-gray-500">{league.country_name}</span>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant={alreadyImported ? 'secondary' : 'default'}
                    disabled={alreadyImported || isImporting}
                    onClick={() => handleImport(league)}
                    className="gap-1.5 flex-shrink-0"
                  >
                    {alreadyImported ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        Imported
                      </>
                    ) : isImporting ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Download className="h-3.5 w-3.5" />
                        Import
                      </>
                    )}
                  </Button>
                </div>
              )
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
