'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Lock } from 'lucide-react'
import { Prediction, CorrectScorePrediction } from '@/types'
import { formatTime, getDateRange } from '@/lib/utils/date'

export function PremiumPredictionsSection() {
  const router = useRouter()
  const [profitPredictions, setProfitPredictions] = useState<Prediction[]>([])
  const [correctScorePredictions, setCorrectScorePredictions] = useState<CorrectScorePrediction[]>([])
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

      // Fetch profit multiplier predictions
      const { from, to } = getDateRange(dateType)
      const fromTimestamp = `${from}T00:00:00.000Z`
      const toTimestamp = `${to}T23:59:59.999Z`
      
      const [profitData, correctScoreData] = await Promise.all([
        supabase
          .from('predictions')
          .select('*')
          .eq('plan_type', 'profit_multiplier')
          .gte('kickoff_time', fromTimestamp)
          .lte('kickoff_time', toTimestamp)
          .gte('odds', 2.8)
          .lte('odds', 4.3)
          .order('kickoff_time', { ascending: true })
          .limit(3),
        supabase
          .from('correct_score_predictions')
          .select('*')
          .gte('kickoff_time', from)
          .lte('kickoff_time', to)
          .order('kickoff_time', { ascending: true })
          .limit(3)
      ])

      if (profitData.error) {
        console.error('Error fetching profit predictions:', profitData.error)
      } else {
        setProfitPredictions(profitData.data || [])
      }

      if (correctScoreData.error) {
        console.error('Error fetching correct score predictions:', correctScoreData.error)
      } else {
        setCorrectScorePredictions(correctScoreData.data || [])
      }

      setLoading(false)
    }

    fetchData()
  }, [dateType])

  const handleSubscribe = (planType: 'profit-multiplier' | 'correct-score') => {
    if (!user) {
      router.push('/login')
    } else {
      router.push('/subscriptions')
    }
  }

  const renderProfitCard = (prediction: Prediction) => (
    <Card key={prediction.id} className="relative border-2 border-gray-200 hover:border-[#f97316] hover:shadow-xl transition-all duration-300 transform hover:scale-105">
      <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-md z-10 rounded-lg">
        <div className="text-center p-4">
          <Lock className="mx-auto mb-4 h-14 w-14 text-[#f97316] animate-pulse" />
          <h3 className="text-lg font-bold text-white mb-2">Premium Locked</h3>
          <p className="text-sm text-gray-200 mb-4">Subscribe to view this prediction</p>
          <Button 
            onClick={() => handleSubscribe('profit-multiplier')} 
            className="bg-gradient-to-r from-[#f97316] to-[#ea580c] hover:from-[#ea580c] hover:to-[#f97316] text-white font-bold px-8 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
          >
            Subscribe to Premium
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
            <span className="text-sm font-semibold text-gray-700">Prediction:</span>
            <Badge className="bg-[#22c55e] text-white font-bold opacity-50">
              {prediction.prediction_type}
            </Badge>
          </div>
          <div className="flex items-center justify-between p-2 bg-white rounded">
            <span className="text-sm font-semibold text-gray-700">Odds:</span>
            <span className="text-sm font-bold text-[#1e40af] opacity-50">{prediction.odds}</span>
          </div>
          <div className="flex items-center justify-between p-2 bg-white rounded">
            <span className="text-sm font-semibold text-gray-700">Confidence:</span>
            <span className="text-sm font-medium text-gray-600 opacity-50">{prediction.confidence}%</span>
          </div>
          <div className="flex items-center justify-between p-2 bg-white rounded">
            <span className="text-sm font-semibold text-gray-700">Kickoff:</span>
            <span className="text-sm font-medium text-gray-600 opacity-50">{formatTime(prediction.kickoff_time)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  const renderCorrectScoreCard = (prediction: CorrectScorePrediction) => (
    <Card key={prediction.id} className="relative border-2 border-gray-200 hover:border-[#f97316] hover:shadow-xl transition-all duration-300 transform hover:scale-105">
      <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-md z-10 rounded-lg">
        <div className="text-center p-4">
          <Lock className="mx-auto mb-4 h-14 w-14 text-[#f97316] animate-pulse" />
          <h3 className="text-lg font-bold text-white mb-2">Premium Locked</h3>
          <p className="text-sm text-gray-200 mb-4">Subscribe to view this prediction</p>
          <Button 
            onClick={() => handleSubscribe('correct-score')} 
            className="bg-gradient-to-r from-[#f97316] to-[#ea580c] hover:from-[#ea580c] hover:to-[#f97316] text-white font-bold px-8 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
          >
            Subscribe to Premium
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
  )

  return (
    <section className="py-8 lg:py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="mb-4 lg:mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 lg:gap-0">
          <div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#1e40af] mb-1 lg:mb-2">Premium Predictions</h2>
            <p className="text-sm lg:text-base text-gray-600">Profit Multiplier & Correct Score (Locked Preview)</p>
          </div>
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setDateType('previous')}
              className={`px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${
                dateType === 'previous'
                  ? 'bg-[#1e40af] text-white shadow-sm'
                  : 'text-gray-600 hover:text-[#1e40af] hover:bg-white'
              }`}
            >
              Previous
            </button>
            <button
              onClick={() => setDateType('today')}
              className={`px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${
                dateType === 'today'
                  ? 'bg-[#1e40af] text-white shadow-sm'
                  : 'text-gray-600 hover:text-[#1e40af] hover:bg-white'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setDateType('tomorrow')}
              className={`px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${
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
          <div className="grid gap-3 lg:gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
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
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {/* Profit Multiplier Section */}
            <div>
              <h3 className="text-xl lg:text-2xl font-bold text-gray-900 mb-4 lg:mb-6">Profit Multiplier Predictions</h3>
              {profitPredictions.length === 0 ? (
                <Card className="relative border-2 border-gray-200">
                  <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-10 rounded-lg">
                    <div className="text-center p-8">
                      <Lock className="mx-auto mb-4 h-16 w-16 text-[#f97316]" />
                      <h3 className="text-xl font-bold text-white mb-2">Premium Content Locked</h3>
                      <p className="text-gray-200 mb-6">Subscribe to unlock Profit Multiplier predictions</p>
                      <Button 
                        onClick={() => handleSubscribe('profit-multiplier')} 
                        className="bg-gradient-to-r from-[#f97316] to-[#ea580c] hover:from-[#ea580c] hover:to-[#f97316] text-white font-bold px-8 py-3 rounded-lg text-lg"
                      >
                        Subscribe to Premium
                      </Button>
                    </div>
                  </div>
                  <CardHeader className="bg-gradient-to-r from-[#1e40af] to-[#1e3a8a] text-white opacity-30">
                    <CardTitle className="text-lg font-bold">Premium Predictions</CardTitle>
                    <p className="text-sm text-blue-100">Unlock with subscription</p>
                  </CardHeader>
                  <CardContent className="bg-gray-50 py-12 opacity-30">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-2 bg-white rounded">
                        <span className="text-sm font-semibold text-gray-700">Prediction:</span>
                        <Badge className="bg-[#22c55e] text-white font-bold">Locked</Badge>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-white rounded">
                        <span className="text-sm font-semibold text-gray-700">Odds:</span>
                        <span className="text-sm font-bold text-[#1e40af]">Premium</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="">
                  {profitPredictions.map(renderProfitCard)}
                </div>
              )}
            </div>

            {/* Correct Score Section */}
            <div>
              <h3 className="text-xl lg:text-2xl font-bold text-gray-900 mb-4 lg:mb-6">Correct Score Predictions</h3>
              {correctScorePredictions.length === 0 ? (
                <Card className="relative border-2 border-gray-200">
                  <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-10 rounded-lg">
                    <div className="text-center p-8">
                      <Lock className="mx-auto mb-4 h-16 w-16 text-[#f97316]" />
                      <h3 className="text-xl font-bold text-white mb-2">Premium Content Locked</h3>
                      <p className="text-gray-200 mb-6">Subscribe to unlock Correct Score predictions</p>
                      <Button 
                        onClick={() => handleSubscribe('correct-score')} 
                        className="bg-gradient-to-r from-[#f97316] to-[#ea580c] hover:from-[#ea580c] hover:to-[#f97316] text-white font-bold px-8 py-3 rounded-lg text-lg"
                      >
                        Subscribe to Premium
                      </Button>
                    </div>
                  </div>
                  <CardHeader className="bg-gradient-to-r from-[#1e40af] to-[#1e3a8a] text-white opacity-30">
                    <CardTitle className="text-lg font-bold">Premium Predictions</CardTitle>
                    <p className="text-sm text-blue-100">Unlock with subscription</p>
                  </CardHeader>
                  <CardContent className="bg-gray-50 py-12 opacity-30">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-2 bg-white rounded">
                        <span className="text-sm font-semibold text-gray-700">Score Prediction:</span>
                        <Badge className="bg-[#22c55e] text-white font-bold">Locked</Badge>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-white rounded">
                        <span className="text-sm font-semibold text-gray-700">Odds:</span>
                        <span className="text-sm font-bold text-[#1e40af]">Premium</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-3">
                  {correctScorePredictions.map(renderCorrectScoreCard)}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

