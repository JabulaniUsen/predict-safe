'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Lock } from 'lucide-react'
import { Prediction, CorrectScorePrediction, UserSubscriptionWithPlan } from '@/types'
import { formatTime, getDateRange } from '@/lib/utils/date'
import { toast } from 'sonner'

interface PredictionsListProps {
  subscriptions: UserSubscriptionWithPlan[]
}

export function PredictionsList({ subscriptions }: PredictionsListProps) {
  const [selectedPlan, setSelectedPlan] = useState<string>('')
  const [dateType, setDateType] = useState<'previous' | 'today' | 'tomorrow'>('today')
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [correctScorePredictions, setCorrectScorePredictions] = useState<CorrectScorePrediction[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (subscriptions.length > 0 && !selectedPlan) {
      setSelectedPlan(subscriptions[0].plan_id)
    }
  }, [subscriptions, selectedPlan])

  useEffect(() => {
    if (selectedPlan) {
      fetchPredictions()
    }
  }, [selectedPlan, dateType])

  const fetchPredictions = async () => {
    setLoading(true)
    const supabase = createClient()
    const subscription = subscriptions.find((s) => s.plan_id === selectedPlan)
    
    if (!subscription) {
      setLoading(false)
      return
    }

    const plan = subscription.plan
    const { from, to } = getDateRange(dateType)

    if (plan.slug === 'correct-score') {
      // Fetch correct score predictions
      // Convert date strings to proper timestamp format for comparison
      // PostgreSQL will handle date string comparison with timestamps correctly
      const fromTimestamp = `${from}T00:00:00.000Z`
      const toTimestamp = `${to}T23:59:59.999Z`
      
      const { data, error } = await supabase
        .from('correct_score_predictions')
        .select('*')
        .gte('kickoff_time', fromTimestamp)
        .lte('kickoff_time', toTimestamp)
        .order('kickoff_time', { ascending: true })

      if (error) {
        console.error('Error fetching correct score predictions:', error)
        toast.error('Failed to load correct score predictions. Please try again.')
      } else {
        setCorrectScorePredictions(data || [])
        setPredictions([])
      }
    } else {
      // Fetch regular predictions
      let planType: 'profit_multiplier' | 'daily_2_odds' | 'standard' = 'standard'
      
      if (plan.slug === 'profit-multiplier') planType = 'profit_multiplier'
      else if (plan.slug === 'daily-2-odds') planType = 'daily_2_odds'

      // Convert date strings to proper timestamp format for comparison
      const fromTimestamp = `${from}T00:00:00.000Z`
      const toTimestamp = `${to}T23:59:59.999Z`

      let query = supabase
        .from('predictions')
        .select('*')
        .eq('plan_type', planType)
        .gte('kickoff_time', fromTimestamp)
        .lte('kickoff_time', toTimestamp)
        .order('kickoff_time', { ascending: true })

      // Apply plan-specific filters
      if (planType === 'profit_multiplier') {
        query = query.gte('odds', 2.8).lte('odds', 4.3)
      } else if (planType === 'daily_2_odds') {
        query = query.gte('odds', 2.0)
      }

      query = query.gte('confidence', 60).lte('confidence', 100)

      // Apply daily limit if set
      if (plan.max_predictions_per_day) {
        query = query.limit(plan.max_predictions_per_day)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching predictions:', error)
      } else {
        setPredictions(data || [])
        setCorrectScorePredictions([])
      }
    }

    setLoading(false)
  }

  const subscription = subscriptions.find((s) => s.plan_id === selectedPlan)
  const plan = subscription?.plan
  const isCorrectScorePlan = plan?.slug === 'correct-score'
  const isLocked = !subscription || subscription.plan_status !== 'active'

  if (subscriptions.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">
            You don't have any active subscriptions. Subscribe to a plan to view predictions.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Tabs value={selectedPlan} onValueChange={setSelectedPlan}>
        <TabsList>
          {subscriptions.map((sub) => (
            <TabsTrigger key={sub.plan_id} value={sub.plan_id}>
              {sub.plan.name}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">
            {subscriptions.find((s) => s.plan_id === selectedPlan)?.plan.name}
          </h2>
        </div>
        <div className="flex gap-2">
          <Button
            variant={dateType === 'previous' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDateType('previous')}
          >
            Previous
          </Button>
          <Button
            variant={dateType === 'today' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDateType('today')}
          >
            Today
          </Button>
          <Button
            variant={dateType === 'tomorrow' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDateType('tomorrow')}
          >
            Tomorrow
          </Button>
        </div>
      </div>

      {isLocked ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Lock className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">
              This plan is locked. Subscribe to unlock predictions.
            </p>
            <Button asChild>
              <a href={`/subscribe?plan=${subscriptions.find((s) => s.plan_id === selectedPlan)?.plan.slug}`}>
                Subscribe Now
              </a>
            </Button>
          </CardContent>
        </Card>
      ) : loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 w-3/4 bg-gray-200 rounded" />
                <div className="h-3 w-1/2 bg-gray-200 rounded mt-2" />
              </CardHeader>
              <CardContent>
                <div className="h-3 w-full bg-gray-200 rounded mb-2" />
                <div className="h-3 w-2/3 bg-gray-200 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : isCorrectScorePlan ? (
        correctScorePredictions.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {correctScorePredictions.map((prediction) => (
              <Card key={prediction.id}>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {prediction.home_team} vs {prediction.away_team}
                  </CardTitle>
                  <CardDescription>{prediction.league}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary">Score: {prediction.score_prediction}</Badge>
                    {prediction.odds && <span className="text-sm font-medium">Odds: {prediction.odds}</span>}
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Kickoff: {formatTime(prediction.kickoff_time)}</span>
                    <Badge
                      variant={
                        prediction.status === 'finished'
                          ? 'default'
                          : prediction.status === 'live'
                          ? 'destructive'
                          : 'outline'
                      }
                    >
                      {prediction.status === 'finished'
                        ? 'Finished'
                        : prediction.status === 'live'
                        ? 'Live'
                        : 'Not Started'}
                    </Badge>
                  </div>
                  {prediction.admin_notes && (
                    <p className="text-sm text-muted-foreground">{prediction.admin_notes}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                No correct score predictions available for {dateType === 'previous' ? 'yesterday' : dateType === 'today' ? 'today' : 'tomorrow'}.
                Try selecting a different date.
              </p>
            </CardContent>
          </Card>
        )
      ) : predictions.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {predictions.map((prediction) => (
            <Card key={prediction.id}>
              <CardHeader>
                <CardTitle className="text-lg">
                  {prediction.home_team} vs {prediction.away_team}
                </CardTitle>
                <CardDescription>{prediction.league}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary">{prediction.prediction_type}</Badge>
                  <span className="text-sm font-medium">Odds: {prediction.odds}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Confidence: {prediction.confidence}%</span>
                  <span>Kickoff: {formatTime(prediction.kickoff_time)}</span>
                </div>
                <Badge
                  variant={
                    prediction.status === 'finished'
                      ? 'default'
                      : prediction.status === 'live'
                      ? 'destructive'
                      : 'outline'
                  }
                >
                  {prediction.status === 'finished'
                    ? 'Finished'
                    : prediction.status === 'live'
                    ? 'Live'
                    : 'Not Started'}
                </Badge>
                {prediction.admin_notes && (
                  <p className="text-sm text-muted-foreground">{prediction.admin_notes}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No predictions available for this date.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

