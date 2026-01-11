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
    const { date, predictionIds } = body

    // If predictionIds are provided, use them directly. Otherwise, require date.
    let predictions: Prediction[] | null = null

    if (predictionIds && Array.isArray(predictionIds) && predictionIds.length > 0) {
      // Fetch specific predictions by IDs
      const { data, error: predictionsError } = await supabase
        .from('predictions')
        .select('*')
        .in('id', predictionIds)

      if (predictionsError) {
        throw predictionsError
      }

      predictions = data as Prediction[]
    } else {
      // Original behavior: filter by date
      if (!date) {
        return NextResponse.json({ error: 'Date is required when predictionIds are not provided' }, { status: 400 })
    }

    // Parse date string (format: YYYY-MM-DD) and create UTC date range
    // Treat the date as UTC date to match how date-fns formats dates in UTC
    const dateParts = date.split('-')
    if (dateParts.length !== 3) {
      return NextResponse.json({ error: 'Invalid date format. Expected YYYY-MM-DD' }, { status: 400 })
    }

    const year = parseInt(dateParts[0], 10)
    const month = parseInt(dateParts[1], 10) - 1 // Month is 0-indexed
    const day = parseInt(dateParts[2], 10)

    // Create UTC date boundaries for the entire day
    // This ensures we match all predictions for this date regardless of timezone
    const startOfDayUTC = new Date(Date.UTC(year, month, day, 0, 0, 0, 0))
    const endOfDayUTC = new Date(Date.UTC(year, month, day, 23, 59, 59, 999))

    console.log('📅 Date filtering for update:', {
      inputDate: date,
      utcStart: startOfDayUTC.toISOString(),
      utcEnd: endOfDayUTC.toISOString(),
      year,
      month: month + 1,
      day,
    })

      const { data, error: predictionsError } = await supabase
      .from('predictions')
      .select('*')
      .gte('kickoff_time', startOfDayUTC.toISOString())
      .lte('kickoff_time', endOfDayUTC.toISOString())

    if (predictionsError) {
      throw predictionsError
    }

      predictions = data as Prediction[]
    }

    if (!predictions || predictions.length === 0) {
      return NextResponse.json({ 
        message: 'No predictions found',
        updated: 0 
      })
    }

    // Fetch fixtures from API - we need to get fixtures for all dates that the predictions span
    // Get unique dates from predictions
    const predictionDates = new Set<string>()
    predictions.forEach(pred => {
      const kickoffDate = new Date(pred.kickoff_time).toISOString().split('T')[0]
      predictionDates.add(kickoffDate)
    })

    // Fetch fixtures for all dates
    const allFixtures: Fixture[] = []
    for (const predDate of predictionDates) {
      try {
        console.log(`🔍 Fetching fixtures for date: ${predDate}`)
        const fixtures = await getFixtures(predDate, undefined, predDate)
        
        // Handle different response formats
        let fixtureArray: Fixture[] = []
        if (Array.isArray(fixtures)) {
          fixtureArray = fixtures
        } else if (fixtures && typeof fixtures === 'object' && !Array.isArray(fixtures)) {
          // Check if it has a 'data' property that is an array
          const fixturesObj = fixtures as any
          if ('data' in fixturesObj && Array.isArray(fixturesObj.data)) {
            fixtureArray = fixturesObj.data
          } else {
            // Single fixture object
            fixtureArray = [fixtures as Fixture]
          }
        }
        
        if (fixtureArray.length > 0) {
          console.log(`📅 Found ${fixtureArray.length} fixtures for date ${predDate}`)
          // Log sample fixtures for debugging
          if (fixtureArray.length <= 5) {
            fixtureArray.forEach(f => {
              console.log(`   - ${f.match_hometeam_name} vs ${f.match_awayteam_name} (${f.match_status}) - ${f.match_hometeam_score}-${f.match_awayteam_score}`)
            })
          } else {
            console.log(`   Sample: ${fixtureArray[0].match_hometeam_name} vs ${fixtureArray[0].match_awayteam_name} (${fixtureArray[0].match_status})`)
          }
          allFixtures.push(...fixtureArray)
        } else {
          console.log(`⚠️ No fixtures found for date ${predDate}. Response type: ${typeof fixtures}, isArray: ${Array.isArray(fixtures)}`)
          if (fixtures) {
            console.log(`   Response preview:`, JSON.stringify(fixtures).substring(0, 200))
          }
        }
      } catch (error: any) {
        console.error(`❌ Error fetching fixtures for date ${predDate}:`, error.message)
        console.error(`   Stack:`, error.stack)
      }
    }
    
    console.log(`📊 Total fixtures fetched: ${allFixtures.length} for dates: ${Array.from(predictionDates).join(', ')}`)
    
    if (allFixtures.length === 0) {
      return NextResponse.json({ 
        message: `No fixtures found for the prediction dates: ${Array.from(predictionDates).join(', ')}. The API may not have data for these dates.`,
        updated: 0,
        details: {
          predictionDates: Array.from(predictionDates),
          totalPredictions: predictions.length,
          skippedNoFixture: 0,
          skippedNotFinished: 0,
          skippedNoScores: 0
        }
      })
    }

    const fixtures = allFixtures

    console.log('📊 Predictions retrieved from DB:', {
      date,
      predictionIds,
      count: predictions?.length || 0,
      predictions: predictions?.map(p => ({
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

    let updatedCount = 0
    let skippedNoFixture = 0
    let skippedNotFinished = 0
    let skippedNoScores = 0

    console.log(`🔍 Processing ${predictions.length} predictions against ${fixtures.length} fixtures`)

    // Match predictions to fixtures and update scores
    for (const prediction of predictions) {
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
        skippedNoFixture++
        console.log(`⚠️ No fixture found for: ${prediction.home_team} vs ${prediction.away_team} (ID: ${prediction.id})`)
        // Log available fixtures for debugging
        if (fixtures.length > 0 && fixtures.length <= 20) {
          console.log(`   Available fixtures (${fixtures.length} total):`)
          fixtures.forEach(f => {
            console.log(`     - ${f.match_hometeam_name} vs ${f.match_awayteam_name}`)
          })
        } else if (fixtures.length > 20) {
          console.log(`   Available fixtures (${fixtures.length} total, showing first 5):`)
          fixtures.slice(0, 5).forEach(f => {
            console.log(`     - ${f.match_hometeam_name} vs ${f.match_awayteam_name}`)
          })
        }
        continue
      }

      console.log(`✅ Found fixture for ${prediction.home_team} vs ${prediction.away_team}: status=${fixture.match_status}, score=${fixture.match_hometeam_score}-${fixture.match_awayteam_score}, live=${fixture.match_live}`)

      // Parse scores - handle empty strings, null, undefined
      const homeScoreStr = String(fixture.match_hometeam_score || '').trim()
      const awayScoreStr = String(fixture.match_awayteam_score || '').trim()
      const homeScore = homeScoreStr ? parseInt(homeScoreStr, 10) : null
      const awayScore = awayScoreStr ? parseInt(awayScoreStr, 10) : null
      const hasValidScores = homeScore !== null && !isNaN(homeScore) && awayScore !== null && !isNaN(awayScore)

      // Check match status - expanded to include more statuses
      const matchStatus = String(fixture.match_status || '').trim()
      const matchLive = String(fixture.match_live || '')
      
      const isFinished = matchStatus === 'FT' || 
                        matchStatus === 'AET' || 
                        matchStatus === 'PEN' ||
                        matchStatus === 'Finished' ||
                        matchStatus === 'FT_PEN' ||
                        matchStatus === 'CANC' ||
                        matchStatus === 'POSTP' ||
                        matchStatus === 'SUSP' ||
                        matchStatus === 'INT' ||
                        matchStatus === 'ABAN' ||
                        matchStatus === 'AWARDED' ||
                        matchStatus === 'WO' ||
                        matchStatus.includes('FT') ||
                        matchStatus.includes('Finished') ||
                        // If we have valid scores and match is not live, consider it finished
                        (hasValidScores && matchLive !== '1')
      
      const isLive = matchStatus === 'LIVE' || 
                    matchStatus === 'HT' ||
                    matchStatus === '1H' ||
                    matchStatus === '2H' ||
                    matchStatus === 'ET' ||
                    matchStatus === 'PEN_LIVE' ||
                    matchLive === '1'

      // Update if match is finished or live, OR if we have valid scores (even if status is unclear)
      if (!isFinished && !isLive && !hasValidScores) {
        skippedNotFinished++
        console.log(`⏸️ Match not finished/live and no scores: ${prediction.home_team} vs ${prediction.away_team}, status=${matchStatus}, scores=${homeScoreStr}-${awayScoreStr}`)
        continue
      }

      // If we have valid scores, proceed with update even if status is unclear
      if (hasValidScores) {
        console.log(`✅ Match has valid scores, proceeding with update: ${prediction.home_team} vs ${prediction.away_team}, scores=${homeScore}-${awayScore}`)
      } else {
        skippedNoScores++
        console.log(`⚠️ No valid scores available: ${prediction.home_team} vs ${prediction.away_team}, score strings=${homeScoreStr}-${awayScoreStr}`)
        // Still update status even if scores aren't available
      }

      // Determine result based on prediction type (only if finished and has valid scores)
      let result: 'win' | 'loss' | 'pending' | null = null
      if (isFinished && hasValidScores && homeScore !== null && awayScore !== null) {
        result = determineResult(prediction.prediction_type || '', homeScore, awayScore)
        console.log(`🎯 Determined result for ${prediction.home_team} vs ${prediction.away_team}: ${result} (prediction: ${prediction.prediction_type}, score: ${homeScore}-${awayScore})`)
      } else if (isLive) {
        result = 'pending'
      }

      // Determine status - prioritize finished if we have scores and it's not live
      const newStatus = isFinished || (hasValidScores && !isLive) ? 'finished' : (isLive ? 'live' : prediction.status)

      // Prepare update object
      const updateData: Database['public']['Tables']['predictions']['Update'] = {
        status: newStatus,
        updated_at: new Date().toISOString()
      }

      // Update scores if they're available and valid
      if (hasValidScores && homeScore !== null && awayScore !== null) {
        updateData.home_score = homeScore
        updateData.away_score = awayScore
        console.log(`📝 Updating scores: ${homeScore}-${awayScore}`)
      }

      // Only update result if match is finished and we have a result
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
      console.log(`✅ Updated prediction ${prediction.id}: ${prediction.home_team} vs ${prediction.away_team} - ${homeScore}-${awayScore}, result=${result}`)
    }

    console.log(`📊 Update summary: ${updatedCount} updated, ${skippedNoFixture} no fixture, ${skippedNotFinished} not finished, ${skippedNoScores} no scores`)

    if (updatedCount === 0) {
      return NextResponse.json({ 
        message: `No predictions were updated. ${skippedNoFixture > 0 ? `${skippedNoFixture} had no matching fixtures. ` : ''}${skippedNotFinished > 0 ? `${skippedNotFinished} matches not finished/live. ` : ''}${skippedNoScores > 0 ? `${skippedNoScores} finished matches had no scores.` : ''}`,
        updated: 0,
        details: {
          skippedNoFixture,
          skippedNotFinished,
          skippedNoScores,
          totalPredictions: predictions.length,
          totalFixtures: fixtures.length
        }
      })
    }

    return NextResponse.json({ 
      message: `Updated ${updatedCount} prediction(s)`,
      updated: updatedCount,
      details: {
        skippedNoFixture,
        skippedNotFinished,
        skippedNoScores
      }
    })
  } catch (error: any) {
    console.error('Error updating scores:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to update scores' 
    }, { status: 500 })
  }
}

