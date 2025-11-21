import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getFixtures } from '@/lib/api-football'
import { format } from 'date-fns'

const API_KEY = process.env.API_FOOTBALL_KEY || '1cb32db603edc3ff2e0c13ba21224f6d55a88a1be0bc9536ac15f4c12011e9ac'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { date, planType = 'free' } = body

    if (!date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 })
    }

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
    
    for (const fixture of fixtures.slice(0, 50)) { // Limit to 50 to avoid rate limits
      try {
        // Fetch odds for this fixture
        let odds = 1.85 // Default
        let predictionTypes: string[] = ['Over 2.5'] // Default
        
        try {
          const oddsResponse = await fetch(
            `${process.env.API_FOOTBALL_BASE_URL || 'https://apiv3.apifootball.com'}/?action=get_odds&APIkey=${API_KEY}&match_id=${fixture.match_id}&from=${date}&to=${date}`
          )
          
          if (oddsResponse.ok) {
            const oddsData = await oddsResponse.json()
            if (Array.isArray(oddsData) && oddsData.length > 0) {
              const matchOdds = oddsData[0]
              // Extract odds and prediction types
              if (matchOdds.odd_1) {
                predictionTypes.push('Home Win')
                odds = parseFloat(matchOdds.odd_1) || odds
              }
              if (matchOdds.odd_2) {
                predictionTypes.push('Away Win')
              }
              if (matchOdds['o+2.5']) {
                predictionTypes.push('Over 2.5')
                odds = parseFloat(matchOdds['o+2.5']) || odds
              }
              if (matchOdds['o+1.5']) {
                predictionTypes.push('Over 1.5')
              }
              if (matchOdds.bts_yes) {
                predictionTypes.push('BTTS')
              }
            }
          }
        } catch (oddsError) {
          console.error('Error fetching odds:', oddsError)
          // Continue with defaults
        }

        // Create predictions for each prediction type
        for (const predictionType of predictionTypes) {
          const confidence = Math.floor(Math.random() * 30) + 70 // 70-100% confidence
          
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
      synced: data?.length || 0 
    })
  } catch (error: any) {
    console.error('Sync error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

