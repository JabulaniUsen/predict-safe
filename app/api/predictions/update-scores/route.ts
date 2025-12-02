import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getFixtures, Fixture } from '@/lib/api-football'
import { Prediction } from '@/types'
import { Database } from '@/types/database'

// Helper function to determine if a prediction is correct based on actual scores
function determineResult(
  predictionType: string,
  homeScore: number,
  awayScore: number
): 'win' | 'loss' {
  const totalGoals = homeScore + awayScore
  const bothTeamsScored = homeScore > 0 && awayScore > 0

  switch (predictionType.toLowerCase()) {
    case 'home win':
    case '1':
      return homeScore > awayScore ? 'win' : 'loss'
    
    case 'away win':
    case '2':
      return awayScore > homeScore ? 'win' : 'loss'
    
    case 'draw':
    case 'x':
      return homeScore === awayScore ? 'win' : 'loss'
    
    case 'over 0.5':
      return totalGoals > 0.5 ? 'win' : 'loss'
    
    case 'over 1.5':
      return totalGoals > 1.5 ? 'win' : 'loss'
    
    case 'over 2.5':
      return totalGoals > 2.5 ? 'win' : 'loss'
    
    case 'over 3.5':
      return totalGoals > 3.5 ? 'win' : 'loss'
    
    case 'under 0.5':
      return totalGoals < 0.5 ? 'win' : 'loss'
    
    case 'under 1.5':
      return totalGoals < 1.5 ? 'win' : 'loss'
    
    case 'under 2.5':
      return totalGoals < 2.5 ? 'win' : 'loss'
    
    case 'under 3.5':
      return totalGoals < 3.5 ? 'win' : 'loss'
    
    case 'btts':
    case 'both teams to score':
    case 'gg':
      return bothTeamsScored ? 'win' : 'loss'
    
    case 'btts no':
    case 'both teams not to score':
      return !bothTeamsScored ? 'win' : 'loss'
    
    case 'double chance':
    case '1x':
      return homeScore >= awayScore ? 'win' : 'loss'
    
    case '12':
      return homeScore !== awayScore ? 'win' : 'loss'
    
    case 'x2':
      return awayScore >= homeScore ? 'win' : 'loss'
    
    default:
      // For correct score predictions, check if the score matches
      if (predictionType.includes('-')) {
        const [predHome, predAway] = predictionType.split('-').map(Number)
        if (!isNaN(predHome) && !isNaN(predAway)) {
          return homeScore === predHome && awayScore === predAway ? 'win' : 'loss'
        }
      }
      return 'loss'
  }
}

// Helper function to match team names (fuzzy matching)
function matchTeams(predHome: string, predAway: string, fixtureHome: string, fixtureAway: string): boolean {
  const normalize = (name: string) => name.toLowerCase().trim().replace(/\s+/g, ' ')
  
  const predHomeNorm = normalize(predHome)
  const predAwayNorm = normalize(predAway)
  const fixtureHomeNorm = normalize(fixtureHome)
  const fixtureAwayNorm = normalize(fixtureAway)
  
  // Exact match
  if (predHomeNorm === fixtureHomeNorm && predAwayNorm === fixtureAwayNorm) {
    return true
  }
  
  // Check if one contains the other (for partial matches)
  const homeMatch = predHomeNorm === fixtureHomeNorm || 
                   predHomeNorm.includes(fixtureHomeNorm) || 
                   fixtureHomeNorm.includes(predHomeNorm)
  
  const awayMatch = predAwayNorm === fixtureAwayNorm || 
                   predAwayNorm.includes(fixtureAwayNorm) || 
                   fixtureAwayNorm.includes(predAwayNorm)
  
  return homeMatch && awayMatch
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userProfile } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!userProfile || !(userProfile as any).is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { date } = body

    if (!date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 })
    }

    // Fetch fixtures from API for the given date
    const fixtures = await getFixtures(date, undefined, date)
    
    if (!Array.isArray(fixtures) || fixtures.length === 0) {
      return NextResponse.json({ 
        message: 'No fixtures found for this date',
        updated: 0 
      })
    }

    // Get all predictions for this date
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    const { data: predictions, error: predictionsError } = await supabase
      .from('predictions')
      .select('*')
      .gte('kickoff_time', startOfDay.toISOString())
      .lte('kickoff_time', endOfDay.toISOString())

    if (predictionsError) {
      throw predictionsError
    }

    console.log('📊 Predictions retrieved from DB:', {
      date,
      count: predictions?.length || 0,
      predictions: (predictions as Prediction[])?.map(p => ({
        id: p.id,
        home_team: p.home_team,
        away_team: p.away_team,
        prediction_type: p.prediction_type,
        status: p.status,
        home_score: p.home_score,
        away_score: p.away_score,
        result: p.result,
        kickoff_time: p.kickoff_time
      }))
    })

    if (!predictions || predictions.length === 0) {
      return NextResponse.json({ 
        message: 'No predictions found for this date',
        updated: 0 
      })
    }

    let updatedCount = 0

    // Match predictions to fixtures and update scores
    for (const prediction of predictions as Prediction[]) {
      // Find matching fixture
      const fixture = fixtures.find((f: Fixture) => 
        matchTeams(
          prediction.home_team,
          prediction.away_team,
          f.match_hometeam_name,
          f.match_awayteam_name
        )
      )

      if (!fixture) {
        continue
      }

      // Check match status
      const isFinished = fixture.match_status === 'FT' || 
                        fixture.match_status === 'AET' || 
                        fixture.match_status === 'PEN' ||
                        fixture.match_status === 'Finished' ||
                        fixture.match_status === 'FT_PEN'
      
      const isLive = fixture.match_status === 'LIVE' || 
                    fixture.match_status === 'HT' ||
                    fixture.match_status === '1H' ||
                    fixture.match_status === '2H' ||
                    fixture.match_live === '1'

      // Parse scores (use '0' if not available yet)
      const homeScore = parseInt(fixture.match_hometeam_score || '0', 10)
      const awayScore = parseInt(fixture.match_awayteam_score || '0', 10)

      // Only update if match is finished or live
      if (!isFinished && !isLive) {
        continue
      }

      // Determine result based on prediction type (only if finished)
      let result: 'win' | 'loss' | 'pending' | null = null
      if (isFinished && !isNaN(homeScore) && !isNaN(awayScore)) {
        result = determineResult(prediction.prediction_type || '', homeScore, awayScore)
      } else if (isLive) {
        result = 'pending'
      }

      // Determine status
      const newStatus = isFinished ? 'finished' : (isLive ? 'live' : prediction.status)

      // Prepare update object
      const updateData: Database['public']['Tables']['predictions']['Update'] = {
        status: newStatus,
        updated_at: new Date().toISOString()
      }

      // Only update scores if they're available
      if (!isNaN(homeScore) && !isNaN(awayScore)) {
        updateData.home_score = homeScore
        updateData.away_score = awayScore
      }

      // Only update result if match is finished
      if (result !== null) {
        updateData.result = result
      }

      // Update prediction
      const { error: updateError } = await (supabase
        .from('predictions') as any)
        .update(updateData)
        .eq('id', prediction.id)

      if (updateError) {
        console.error(`Error updating prediction ${prediction.id}:`, updateError)
        continue
      }

      updatedCount++
    }

    return NextResponse.json({ 
      message: `Updated ${updatedCount} prediction(s)`,
      updated: updatedCount 
    })
  } catch (error: any) {
    console.error('Error updating scores:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to update scores' 
    }, { status: 500 })
  }
}

