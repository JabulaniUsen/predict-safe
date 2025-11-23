'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { VIPWinning } from '@/types'
import { formatDate } from '@/lib/utils/date'

export function VIPWinningsSection() {
  const [winnings, setWinnings] = useState<VIPWinning[]>([])
  const [loading, setLoading] = useState(true)
  const [offset, setOffset] = useState(0)
  const limit = 6

  useEffect(() => {
    fetchWinnings()
  }, [offset])

  const fetchWinnings = async () => {
    setLoading(true)
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('vip_winnings')
      .select('*')
      .order('date', { ascending: false })
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
    <section className="py-8 lg:py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="mb-4 lg:mb-8">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-1 lg:mb-2 text-[#1e40af] text-center">VIP Previous Winnings</h2>
          <p className="text-sm lg:text-base text-gray-600 text-center">Track our successful predictions</p>
        </div>
        
        {loading ? (
          <div className="grid gap-3 lg:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse border-2 border-gray-200">
                <CardContent className="py-6">
                  <div className="h-4 w-3/4 bg-gray-200 rounded mb-2" />
                  <div className="h-3 w-1/2 bg-gray-200 rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : winnings.length === 0 ? (
          <Card className="border-2 border-gray-200">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No winnings records available.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-3 lg:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 mb-4 lg:mb-6">
              {winnings.map((winning) => (
                <Card 
                  key={winning.id}
                  className="border-2 border-gray-200 hover:border-[#22c55e] hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                >
                  <CardContent className="py-4 lg:py-6 px-4 lg:px-6">
                    <div className="flex items-start justify-between mb-2 lg:mb-3">
                      <Badge
                        className={`text-xs ${winning.result === 'win' ? 'bg-[#22c55e] text-white font-bold' : 'bg-red-500 text-white font-bold'}`}
                      >
                        {winning.result === 'win' ? '✓ Win' : '✗ Loss'}
                      </Badge>
                      <span className="text-xs lg:text-sm font-semibold text-gray-600">
                        {formatDate(winning.date)}
                      </span>
                    </div>
                    <h3 className="font-bold text-base lg:text-lg mb-1 lg:mb-2 text-gray-900">
                      {winning.home_team} vs {winning.away_team}
                    </h3>
                    <p className="text-xs lg:text-sm font-semibold text-[#1e40af] mb-1 lg:mb-2">
                      {winning.prediction_type}
                    </p>
                    <p className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded inline-block">{winning.plan_name}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="flex justify-center">
              <Button 
                variant="outline" 
                onClick={handlePrevious} 
                disabled={offset === 0}
                className="bg-white border-2 border-[#1e40af] text-[#1e40af] hover:bg-[#1e40af] hover:text-white font-bold px-4 py-2 lg:px-8 lg:py-3 rounded-lg transition-all duration-300 disabled:opacity-50 text-sm lg:text-base"
              >
                Previous
              </Button>
            </div>
          </>
        )}
      </div>
    </section>
  )
}

