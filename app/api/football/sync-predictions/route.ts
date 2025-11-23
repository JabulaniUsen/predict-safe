import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getFixtures } from '@/lib/api-football'
import { format } from 'date-fns'

const API_KEY = process.env.API_FOOTBALL_KEY || '1cb32db603edc3ff2e0c13ba21224f6d55a88a1be0bc9536ac15f4c12011e9ac'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { date, planType = 'free', minConfidence = 50 } = body

    if (!date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 })
    }

    // Validate minConfidence
    const confidenceThreshold = Math.max(50, Math.min(100, parseInt(minConfidence) || 50))

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

    // Fetch fixtures from API Football
    const fixtures = await getFixtures(date)

    if (!Array.isArray(fixtures) || fixtures.length === 0) {
      return NextResponse.json({ message: 'No fixtures found', synced: 0 })
    }

    // Fetch odds for each fixture to get prediction types and odds
    const predictions = []
    let filteredCount = 0 // Track how many predictions were filtered out
    
    for (const fixture of fixtures.slice(0, 50)) { // Limit to 50 to avoid rate limits
      try {
        // Fetch odds for this fixture
        let odds = 1.85 // Default
        let predictionTypes: string[] = ['Over 2.5'] // Default
        let foundOdds: Array<{ type: string; odds: number }> = []
        
        try {
          const oddsResponse = await fetch(
            `${process.env.API_FOOTBALL_BASE_URL || 'https://apiv3.apifootball.com'}/?action=get_odds&APIkey=${API_KEY}&match_id=${fixture.match_id}&from=${date}&to=${date}`
          )
          
          if (oddsResponse.ok) {
            const oddsData = await oddsResponse.json()
            if (Array.isArray(oddsData) && oddsData.length > 0) {
              const matchOdds = oddsData[0]
              
              // Extract all available odds
              if (matchOdds.odd_1) {
                const oddValue = parseFloat(matchOdds.odd_1)
                foundOdds.push({ type: 'Home Win', odds: oddValue })
              }
              if (matchOdds.odd_2) {
                const oddValue = parseFloat(matchOdds.odd_2)
                foundOdds.push({ type: 'Away Win', odds: oddValue })
              }
              if (matchOdds.odd_x) {
                const oddValue = parseFloat(matchOdds.odd_x)
                foundOdds.push({ type: 'Draw', odds: oddValue })
              }
              if (matchOdds['o+2.5']) {
                const oddValue = parseFloat(matchOdds['o+2.5'])
                foundOdds.push({ type: 'Over 2.5', odds: oddValue })
              }
              if (matchOdds['o+1.5']) {
                const oddValue = parseFloat(matchOdds['o+1.5'])
                foundOdds.push({ type: 'Over 1.5', odds: oddValue })
              }
              if (matchOdds['u+2.5']) {
                const oddValue = parseFloat(matchOdds['u+2.5'])
                foundOdds.push({ type: 'Under 2.5', odds: oddValue })
              }
              if (matchOdds.bts_yes) {
                const oddValue = parseFloat(matchOdds.bts_yes)
                foundOdds.push({ type: 'BTTS', odds: oddValue })
              }
              
              // Set default odds from first available
              if (foundOdds.length > 0) {
                odds = foundOdds[0].odds
                predictionTypes = foundOdds.map(o => o.type)
              }
            }
          }
        } catch (oddsError) {
          console.error('Error fetching odds:', oddsError)
          // Continue with defaults
        }

        // For daily_2_odds, only include games with odds between 1.8 and 2.2 (around 2.0)
        if (planType === 'daily_2_odds') {
          const twoOddsOptions = foundOdds.filter(o => o.odds >= 1.8 && o.odds <= 2.2)
          
          if (twoOddsOptions.length === 0) {
            // Skip this fixture if no 2 odds options found
            filteredCount++
            continue
          }
          
          // Only use the 2 odds options
          for (const option of twoOddsOptions) {
            const confidence = Math.floor(Math.random() * 30) + 70 // 70-100% confidence
            
            // Only include predictions that meet the minimum confidence threshold
            if (confidence >= confidenceThreshold) {
              predictions.push({
                plan_type: planType,
                home_team: fixture.match_hometeam_name || 'Home Team',
                away_team: fixture.match_awayteam_name || 'Away Team',
                league: fixture.league_name || 'Unknown League',
                prediction_type: option.type,
                odds: option.odds,
                confidence: confidence,
                kickoff_time: `${fixture.match_date} ${fixture.match_time || '00:00'}:00`,
                status: fixture.match_status === 'Finished' ? 'finished' : 
                        fixture.match_live === '1' ? 'live' : 'not_started',
              })
            } else {
              filteredCount++
            }
          }
        } else {
          // For other plan types, use all prediction types
        for (const predictionType of predictionTypes) {
          const confidence = Math.floor(Math.random() * 30) + 70 // 70-100% confidence
          
          // Only include predictions that meet the minimum confidence threshold
          if (confidence >= confidenceThreshold) {
            predictions.push({
              plan_type: planType,
              home_team: fixture.match_hometeam_name || 'Home Team',
              away_team: fixture.match_awayteam_name || 'Away Team',
              league: fixture.league_name || 'Unknown League',
              prediction_type: predictionType,
              odds: odds,
              confidence: confidence,
              kickoff_time: `${fixture.match_date} ${fixture.match_time || '00:00'}:00`,
              status: fixture.match_status === 'Finished' ? 'finished' : 
                      fixture.match_live === '1' ? 'live' : 'not_started',
            })
          } else {
            filteredCount++
            }
          }
        }
      } catch (error) {
        console.error(`Error processing fixture ${fixture.match_id}:`, error)
        // Continue with next fixture
      }
    }

    // Insert predictions into database
    const { data, error } = await supabase
      .from('predictions')
      .insert(predictions as any)
      .select()

    if (error) {
      console.error('Error inserting predictions:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      message: 'Predictions synced successfully', 
      synced: data?.length || 0,
      filtered: filteredCount,
      minConfidence: confidenceThreshold
    })
  } catch (error: any) {
    console.error('Sync error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

