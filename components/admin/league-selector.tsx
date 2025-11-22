'use client'

import * as React from 'react'
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { toast } from 'sonner'

interface League {
  league_id: string
  league_name: string
  country_name?: string
  country_logo?: string
  league_logo?: string
}

interface LeagueSelectorProps {
  value?: string // league_id
  onValueChange: (leagueId: string, leagueName: string) => void
  placeholder?: string
  className?: string
}

export function LeagueSelector({
  value,
  onValueChange,
  placeholder = 'Select league...',
  className,
}: LeagueSelectorProps) {
  const [open, setOpen] = React.useState(false)
  const [leagues, setLeagues] = React.useState<League[]>([])
  const [loading, setLoading] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState('')

  // Fetch leagues when dropdown opens
  React.useEffect(() => {
    if (open && leagues.length === 0) {
      fetchLeagues('')
    }
  }, [open])

  // Fetch leagues when search query changes (debounced)
  React.useEffect(() => {
    if (!open) return

    const timer = setTimeout(() => {
      fetchLeagues(searchQuery)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, open])

  const fetchLeagues = async (search: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) {
        params.append('country', search)
      }

      const response = await fetch(`/api/football/leagues?${params.toString()}`)
      if (!response.ok) {
        throw new Error('Failed to fetch leagues')
      }

      const data = await response.json()
      setLeagues(data || [])
    } catch (error: any) {
      console.error('Error fetching leagues:', error)
      toast.error('Failed to load leagues. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Filter leagues by search query client-side
  const filteredLeagues = React.useMemo(() => {
    if (!searchQuery) return leagues
    const query = searchQuery.toLowerCase()
    return leagues.filter((league) =>
      league.league_name?.toLowerCase().includes(query) ||
      league.country_name?.toLowerCase().includes(query)
    )
  }, [leagues, searchQuery])

  const selectedLeague = leagues.find((league) => league.league_id === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between h-11', className)}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {selectedLeague ? (
              <>
                {selectedLeague.league_logo && (
                  <img
                    src={selectedLeague.league_logo}
                    alt={selectedLeague.league_name}
                    className="h-5 w-5 object-contain flex-shrink-0"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                )}
                <span className="truncate">
                  {selectedLeague.league_name}
                  {selectedLeague.country_name && (
                    <span className="text-muted-foreground text-xs ml-1">
                      ({selectedLeague.country_name})
                    </span>
                  )}
                </span>
              </>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Search leagues..." 
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <CommandEmpty>
                  {searchQuery ? 'No leagues found.' : 'Start typing to search...'}
                </CommandEmpty>
                <CommandGroup>
                  {filteredLeagues.map((league) => (
                    <CommandItem
                      key={league.league_id}
                      value={league.league_name}
                      onSelect={() => {
                        onValueChange(
                          league.league_id === value ? '' : league.league_id,
                          league.league_name
                        )
                        setOpen(false)
                      }}
                      className="cursor-pointer"
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          value === league.league_id ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      {league.league_logo && (
                        <img
                          src={league.league_logo}
                          alt={league.league_name}
                          className="h-5 w-5 object-contain mr-2 flex-shrink-0"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      )}
                      <div className="flex flex-col flex-1 min-w-0">
                        <span>{league.league_name}</span>
                        {league.country_name && (
                          <span className="text-xs text-muted-foreground">
                            {league.country_name}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

