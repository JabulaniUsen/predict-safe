'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { VIPWinning } from '@/types'
import { formatDate } from '@/lib/utils/date'
import { cn } from '@/lib/utils'

interface VIPWinningsSectionProps {
  planIds?: string[] // Optional: filter by plan IDs
  showAll?: boolean // If true, show all wins regardless of plan
}

export function VIPWinningsSection({ planIds, showAll = true }: VIPWinningsSectionProps) {
  const [winnings, setWinnings] = useState<VIPWinning[]>([])
  const [loading, setLoading] = useState(true)
  const [offset, setOffset] = useState(0)
  const limit = 6

  useEffect(() => {
    fetchWinnings()
  }, [offset, planIds, showAll])

  const fetchWinnings = async () => {
    setLoading(true)
    const supabase = createClient()
    
    let query = supabase
      .from('vip_winnings')
      .select('*')
      .order('date', { ascending: false })

    // Filter by plan IDs if provided and not showing all
    if (!showAll && planIds && planIds.length > 0) {
      query = query.in('plan_id', planIds)
    }
    
    const { data, error } = await query
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching winnings:', error)
    } else {
      setWinnings(data || [])
    }

    setLoading(false)
  }

  const handlePrevious = () => {
    if (offset > 0) {
      setOffset((prev) => Math.max(0, prev - limit))
    }
  }

  return (
    <section className="py-4 lg:py-8 bg-white">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-4 lg:mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-1 lg:mb-2 text-[#1e40af]">VIP Winnings</h2>
            <p className="text-sm lg:text-base text-gray-600">Track our successful VIP predictions</p>
          </div>
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            <Button 
              variant="outline" 
              onClick={handlePrevious} 
              disabled={offset === 0}
              className={`px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${
                offset === 0
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-600 hover:text-[#1e40af] hover:bg-white'
              }`}
            >
              Previous
            </Button>
          </div>
        </div>
        
        {loading ? (
          <>
            {/* Mobile Loading State */}
            <div className="lg:hidden space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-gray-100 rounded-lg p-3 space-y-2 animate-pulse">
                  <div className="h-4 w-16 bg-gray-300 rounded" />
                  <div className="h-3 w-20 bg-gray-300 rounded" />
                  <div className="bg-[#1e40af] text-white px-3 py-2 rounded grid grid-cols-4 gap-2 text-xs font-semibold">
                    <div>Result</div>
                    <div>Teams</div>
                    <div>Tip</div>
                    <div>Plan</div>
                  </div>
                  <div className="bg-gray-200 px-3 py-2 rounded grid grid-cols-4 gap-2">
                    <div className="h-4 w-12 bg-gray-300 rounded" />
                    <div className="h-4 w-24 bg-gray-300 rounded" />
                    <div className="h-4 w-16 bg-gray-300 rounded" />
                    <div className="h-4 w-20 bg-gray-300 rounded" />
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Loading State */}
            <div className="hidden lg:block space-y-0 border rounded-lg overflow-hidden bg-white">
              <div className="bg-gradient-to-r from-[#1e40af] to-[#1e3a8a] text-white px-6 py-3 grid grid-cols-12 gap-4 items-center font-semibold text-sm">
                <div className="col-span-2">Date</div>
                <div className="col-span-5">Teams</div>
                <div className="col-span-1 text-center">Result</div>
                <div className="col-span-2 text-center">Tip</div>
                <div className="col-span-2 text-center">Plan</div>
              </div>
              {[1, 2, 3].map((i) => (
                <div key={i} className="px-6 py-4 grid grid-cols-12 gap-4 items-center border-t animate-pulse">
                  <div className="col-span-2">
                    <div className="h-4 w-20 bg-gray-200 rounded" />
                  </div>
                  <div className="col-span-5">
                    <div className="h-4 w-32 bg-gray-200 rounded" />
                  </div>
                  <div className="col-span-1">
                    <div className="h-6 w-12 bg-gray-200 rounded mx-auto" />
                  </div>
                  <div className="col-span-2">
                    <div className="h-4 w-16 bg-gray-200 rounded mx-auto" />
                  </div>
                  <div className="col-span-2">
                    <div className="h-4 w-20 bg-gray-200 rounded mx-auto" />
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : winnings.length === 0 ? (
          <Card className="border-2 border-gray-200">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No winnings records available.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Mobile View */}
            <div className="lg:hidden space-y-3">
              {winnings.map((winning) => (
                <div
                  key={winning.id}
                  className="bg-gray-100 rounded-lg p-3 space-y-2"
                >
                  {/* Date and League */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      {formatDate(winning.date)}
                    </span>
                    {winning.league && (
                      <span className="text-xs text-gray-600">{winning.league}</span>
                    )}
                  </div>

                  {/* Header Bar */}
                  <div className="bg-[#1e40af] text-white px-3 py-2 rounded grid grid-cols-4 gap-2 text-xs font-semibold">
                    <div>Result</div>
                    <div>Teams</div>
                    <div>Tip</div>
                    <div>Plan</div>
                  </div>

                  {/* Data Row */}
                  <div className="bg-gray-200 px-3 py-2 rounded grid grid-cols-4 gap-2 items-center">
                    <div className="flex items-center">
                      <Badge
                        className={`text-xs ${winning.result === 'win' ? 'bg-[#22c55e] text-white font-bold' : 'bg-red-500 text-white font-bold'}`}
                      >
                        {winning.result === 'win' ? '✓ Win' : '✗ Loss'}
                      </Badge>
                    </div>
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {winning.home_team} vs {winning.away_team}
                    </div>
                    <div className="text-xs font-semibold text-[#1e40af] truncate">
                      {winning.prediction_type}
                    </div>
                    <div className="text-xs font-medium text-gray-600 truncate">
                      {winning.plan_name}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop View */}
            <div className="hidden lg:block space-y-0 border-2 border-gray-200 rounded-xl overflow-hidden bg-white shadow-lg">
              {/* Header */}
              <div className="bg-gradient-to-r from-[#1e40af] to-[#1e3a8a] text-white px-6 py-4 grid grid-cols-12 gap-4 items-center font-bold text-sm shadow-md">
                <div className="col-span-2">Date</div>
                <div className="col-span-5">Teams</div>
                <div className="col-span-1 text-center">Result</div>
                <div className="col-span-2 text-center">Tip</div>
                <div className="col-span-2 text-center">Plan</div>
              </div>

              {/* Winnings */}
              {winnings.map((winning, index) => (
                <div
                  key={winning.id}
                  className={cn(
                    'px-6 py-5 grid grid-cols-12 gap-4 items-center border-b border-gray-100 bg-white hover:bg-gradient-to-r hover:from-blue-50 hover:to-green-50 hover:shadow-md transition-all duration-300',
                    index === winnings.length - 1 && 'border-b-0',
                    index % 2 === 0 && 'bg-gray-50/50'
                  )}
                >
                  {/* Date */}
                  <div className="col-span-2">
                    <div className="text-sm font-medium text-gray-900">
                      {formatDate(winning.date)}
                    </div>
                    {winning.league && (
                      <div className="text-xs text-gray-500 mt-1 truncate">{winning.league}</div>
                    )}
                  </div>

                  {/* Teams */}
                  <div className="col-span-5">
                    <div className="text-sm font-medium text-gray-900">
                      {winning.home_team} vs {winning.away_team}
                    </div>
                  </div>

                  {/* Result */}
                  <div className="col-span-1 flex justify-center">
                    <Badge
                      className={`text-xs ${winning.result === 'win' ? 'bg-[#22c55e] text-white font-bold' : 'bg-red-500 text-white font-bold'}`}
                    >
                      {winning.result === 'win' ? '✓ Win' : '✗ Loss'}
                    </Badge>
                  </div>

                  {/* Tip */}
                  <div className="col-span-2 text-center">
                    <span className="text-sm font-semibold text-[#1e40af]">
                      {winning.prediction_type}
                    </span>
                  </div>

                  {/* Plan */}
                  <div className="col-span-2 text-center">
                    <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded">
                      {winning.plan_name}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  )
}

