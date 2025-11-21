'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Lock } from 'lucide-react'
import { CorrectScorePrediction } from '@/types'
import { formatDate, formatTime, getDateRange } from '@/lib/utils/date'

export function CorrectScorePreviewSection() {
  const router = useRouter()
  const [predictions, setPredictions] = useState<CorrectScorePrediction[]>([])
  const [dateType, setDateType] = useState<'previous' | 'today' | 'tomorrow'>('today')
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      const supabase = createClient()

      // Check user
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      // Fetch correct score predictions (limited preview)
      const { from, to } = getDateRange(dateType)
      const { data, error } = await supabase
        .from('correct_score_predictions')
        .select('*')
        .gte('kickoff_time', from)
        .lte('kickoff_time', to)
        .order('kickoff_time', { ascending: true })
        .limit(3)

      if (error) {
        console.error('Error fetching predictions:', error)
      } else {
        setPredictions(data || [])
      }

      setLoading(false)
    }

    fetchData()
  }, [dateType])

  const handleSubscribe = () => {
    if (!user) {
      router.push('/login')
    } else {
      router.push('/subscribe?plan=correct-score')
    }
  }

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-4xl font-bold text-[#1e40af] mb-2">Correct Score Predictions</h2>
            <p className="text-gray-600">Premium scoreline predictions (Locked Preview)</p>
          </div>
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setDateType('previous')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                dateType === 'previous'
                  ? 'bg-[#1e40af] text-white shadow-sm'
                  : 'text-gray-600 hover:text-[#1e40af] hover:bg-white'
              }`}
            >
              Previous
            </button>
            <button
              onClick={() => setDateType('today')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                dateType === 'today'
                  ? 'bg-[#1e40af] text-white shadow-sm'
                  : 'text-gray-600 hover:text-[#1e40af] hover:bg-white'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setDateType('tomorrow')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                dateType === 'tomorrow'
                  ? 'bg-[#1e40af] text-white shadow-sm'
                  : 'text-gray-600 hover:text-[#1e40af] hover:bg-white'
              }`}
            >
              Tomorrow
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 w-3/4 bg-gray-200 rounded" />
                </CardHeader>
                <CardContent>
                  <div className="h-10 w-full bg-gray-200 rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : predictions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No predictions available for this date.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {predictions.map((prediction) => (
              <Card key={prediction.id} className="relative border-2 border-gray-200 hover:border-[#f97316] hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-10 rounded-lg">
                  <div className="text-center">
                    <Lock className="mx-auto mb-4 h-12 w-12 text-[#f97316]" />
                    <Button 
                      onClick={handleSubscribe} 
                      className="mt-2 bg-gradient-to-r from-[#f97316] to-[#ea580c] hover:from-[#ea580c] hover:to-[#f97316] text-white font-bold px-6 py-3 rounded-lg"
                    >
                      Subscribe to Unlock
                    </Button>
                  </div>
                </div>
                <CardHeader className="bg-gradient-to-r from-[#1e40af] to-[#1e3a8a] text-white">
                  <CardTitle className="text-lg font-bold">
                    {prediction.home_team} vs {prediction.away_team}
                  </CardTitle>
                  <p className="text-sm text-blue-100">{prediction.league}</p>
                </CardHeader>
                <CardContent className="bg-gray-50">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-2 bg-white rounded">
                      <span className="text-sm font-semibold text-gray-700">Score Prediction:</span>
                      <Badge className="bg-[#22c55e] text-white font-bold opacity-50">
                        {prediction.score_prediction}
                      </Badge>
                    </div>
                    {prediction.odds && (
                      <div className="flex items-center justify-between p-2 bg-white rounded">
                        <span className="text-sm font-semibold text-gray-700">Odds:</span>
                        <span className="text-sm font-bold text-[#1e40af] opacity-50">{prediction.odds}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between p-2 bg-white rounded">
                      <span className="text-sm font-semibold text-gray-700">Kickoff:</span>
                      <span className="text-sm font-medium text-gray-600 opacity-50">{formatTime(prediction.kickoff_time)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

