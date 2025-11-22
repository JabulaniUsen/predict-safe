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

interface Team {
  team_id: string
  team_name: string
  team_badge?: string
}

interface TeamSelectorProps {
  value?: string // team name
  onValueChange: (teamName: string) => void
  placeholder?: string
  className?: string
  leagueId?: string // Filter teams by league
}

export function TeamSelector({
  value,
  onValueChange,
  placeholder = 'Select team...',
  className,
  leagueId,
}: TeamSelectorProps) {
  const [open, setOpen] = React.useState(false)
  const [teams, setTeams] = React.useState<Team[]>([])
  const [loading, setLoading] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState('')

  // Fetch teams when dropdown opens or league changes
  React.useEffect(() => {
    if (open && leagueId) {
      fetchTeams('')
    }
  }, [open, leagueId])

  // Fetch teams when search query changes (debounced)
  React.useEffect(() => {
    if (!open || !leagueId) return

    const timer = setTimeout(() => {
      fetchTeams(searchQuery)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, open, leagueId])

  const fetchTeams = async (search: string) => {
    if (!leagueId) {
      setTeams([])
      return
    }

    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('league_id', leagueId)
      if (search) {
        params.append('search', search)
      }

      const response = await fetch(`/api/football/teams?${params.toString()}`)
      if (!response.ok) {
        throw new Error('Failed to fetch teams')
      }

      const data = await response.json()
      setTeams(data || [])
    } catch (error: any) {
      console.error('Error fetching teams:', error)
      toast.error('Failed to load teams. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const selectedTeam = teams.find((team) => team.team_name === value)

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
            {selectedTeam ? (
              <>
                {selectedTeam.team_badge && (
                  <img
                    src={selectedTeam.team_badge}
                    alt={selectedTeam.team_name}
                    className="h-5 w-5 object-contain flex-shrink-0"
                    onError={(e) => {
                      // Hide image if it fails to load
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                )}
                <span className="truncate">{selectedTeam.team_name}</span>
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
            placeholder="Search teams..." 
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
                  {!leagueId 
                    ? 'Please select a league first' 
                    : searchQuery 
                    ? 'No teams found.' 
                    : 'Start typing to search...'}
                </CommandEmpty>
                <CommandGroup>
                  {teams.map((team) => (
                    <CommandItem
                      key={team.team_id}
                      value={team.team_name}
                      onSelect={() => {
                        onValueChange(team.team_name === value ? '' : team.team_name)
                        setOpen(false)
                      }}
                      className="cursor-pointer"
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          value === team.team_name ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      {team.team_badge && (
                        <img
                          src={team.team_badge}
                          alt={team.team_name}
                          className="h-5 w-5 object-contain mr-2 flex-shrink-0"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      )}
                      <span>{team.team_name}</span>
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

