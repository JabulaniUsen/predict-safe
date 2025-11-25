'use client'

import { useEffect } from 'react'

interface MatchSchemaProps {
  match: {
    home_team: string
    away_team: string
    league: string
    match_date?: string
    match_time?: string
    match_status?: string
    home_team_id?: string
    away_team_id?: string
  }
  prediction?: {
    prediction_type: string
    odds: number
    confidence?: number
  }
}

export function MatchSchema({ match, prediction }: MatchSchemaProps) {
  useEffect(() => {
    if (!match) return

    const kickoffTime = match.match_date && match.match_time
      ? `${match.match_date}T${match.match_time}:00`
      : undefined

    // Create SportsEvent schema
    const sportsEventSchema = {
      '@context': 'https://schema.org',
      '@type': 'SportsEvent',
      name: `${match.home_team} vs ${match.away_team}`,
      sport: 'Soccer',
      homeTeam: {
        '@type': 'SportsTeam',
        name: match.home_team,
      },
      awayTeam: {
        '@type': 'SportsTeam',
        name: match.away_team,
      },
      ...(kickoffTime && {
        startDate: kickoffTime,
      }),
      location: {
        '@type': 'Place',
        name: match.league,
      },
    }

    // Create prediction schema if available
    let predictionSchema = null
    if (prediction) {
      predictionSchema = {
        '@context': 'https://schema.org',
        '@type': 'Prediction',
        about: {
          '@type': 'SportsEvent',
          name: `${match.home_team} vs ${match.away_team}`,
        },
        predictionType: prediction.prediction_type,
        ...(prediction.odds && {
          odds: {
            '@type': 'QuantitativeValue',
            value: prediction.odds,
          },
        }),
        ...(prediction.confidence && {
          confidence: {
            '@type': 'QuantitativeValue',
            value: prediction.confidence,
            unitText: 'percentage',
          },
        }),
      }
    }

    // Remove existing scripts
    const existingEvent = document.getElementById('match-event-schema')
    const existingPrediction = document.getElementById('match-prediction-schema')
    if (existingEvent) existingEvent.remove()
    if (existingPrediction) existingPrediction.remove()

    // Add sports event schema
    const eventScript = document.createElement('script')
    eventScript.id = 'match-event-schema'
    eventScript.type = 'application/ld+json'
    eventScript.text = JSON.stringify(sportsEventSchema)
    document.head.appendChild(eventScript)

    // Add prediction schema if available
    if (predictionSchema) {
      const predictionScript = document.createElement('script')
      predictionScript.id = 'match-prediction-schema'
      predictionScript.type = 'application/ld+json'
      predictionScript.text = JSON.stringify(predictionSchema)
      document.head.appendChild(predictionScript)
    }

    // Cleanup
    return () => {
      const eventScript = document.getElementById('match-event-schema')
      const predictionScript = document.getElementById('match-prediction-schema')
      if (eventScript) eventScript.remove()
      if (predictionScript) predictionScript.remove()
    }
  }, [match, prediction])

  return null
}

