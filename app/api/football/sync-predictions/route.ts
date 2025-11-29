import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getFixtures } from '@/lib/api-football'
import { format } from 'date-fns'
import { notifyPredictionDropped } from '@/lib/notifications'

const API_KEY = process.env.API_FOOTBALL_KEY || '1cb32db603edc3ff2e0c13ba21224f6d55a88a1be0bc9536ac15f4c12011e9ac'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { date, planType = 'free', minConfidence = 50, minOdds, maxOdds, preview = false } = body

    if (!date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 })
    }

    // Validate minConfidence
    const confidenceThreshold = Math.max(50, Math.min(100, parseInt(minConfidence) || 50))
    
    // Validate odds filters (optional)
    const minOddsValue = minOdds !== undefined && minOdds !== null ? parseFloat(minOdds) : null
    const maxOddsValue = maxOdds !== undefined && maxOdds !== null ? parseFloat(maxOdds) : null
    
    // Ensure minOdds < maxOdds if both are provided
    if (minOddsValue !== null && maxOddsValue !== null && minOddsValue >= maxOddsValue) {
      return NextResponse.json({ error: 'minOdds must be less than maxOdds' }, { status: 400 })
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
    let filteredCount = 0 // Track how many predictions were filtered out
    
    // Check if this is for correct score predictions
    const isCorrectScore = planType === 'correct_score' || planType === 'correct-score'
    
    for (const fixture of fixtures.slice(0, 50)) { // Limit to 50 to avoid rate limits
      try {
        // Fetch odds for this fixture
        let odds = 1.85 // Default
        let predictionTypes: string[] = ['Over 2.5'] // Default
        let foundOdds: Array<{ type: string; odds: number }> = []
        let correctScoreOdds: Array<{ score: string; odds: number }> = []
        
        try {
          const oddsResponse = await fetch(
            `${process.env.API_FOOTBALL_BASE_URL || 'https://apiv3.apifootball.com'}/?action=get_odds&APIkey=${API_KEY}&match_id=${fixture.match_id}&from=${date}&to=${date}`
          )
          
          if (oddsResponse.ok) {
            const oddsData = await oddsResponse.json()
            if (Array.isArray(oddsData) && oddsData.length > 0) {
              const matchOdds = oddsData[0]
              
              // For correct score predictions, extract correct score odds
              if (isCorrectScore) {
                // Common correct score odds fields in API Football
                const scorePatterns = [
                  'cs_0_0', 'cs_0_1', 'cs_0_2', 'cs_0_3', 'cs_1_0', 'cs_1_1', 'cs_1_2', 'cs_1_3',
                  'cs_2_0', 'cs_2_1', 'cs_2_2', 'cs_2_3', 'cs_3_0', 'cs_3_1', 'cs_3_2', 'cs_3_3'
                ]
                
                scorePatterns.forEach(pattern => {
                  if (matchOdds[pattern]) {
                    const score = pattern.replace('cs_', '').replace('_', '-')
                    const oddValue = parseFloat(matchOdds[pattern])
                    correctScoreOdds.push({ score, odds: oddValue })
                  }
                })
                
                // If no specific correct score odds found, generate some common ones with estimated odds
                if (correctScoreOdds.length === 0) {
                  // Generate some common score predictions with estimated odds
                  const commonScores = [
                    { score: '1-0', odds: 8.0 },
                    { score: '2-1', odds: 9.0 },
                    { score: '1-1', odds: 6.5 },
                    { score: '2-0', odds: 10.0 },
                    { score: '0-1', odds: 8.5 },
                    { score: '1-2', odds: 9.5 },
                    { score: '2-2', odds: 12.0 },
                    { score: '0-0', odds: 7.0 }
                  ]
                  correctScoreOdds = commonScores
                }
              } else {
                // Extract all available odds for regular predictions
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
          }
        } catch (oddsError) {
          console.error('Error fetching odds:', oddsError)
          // Continue with defaults
        }

        // Handle correct score predictions
        if (isCorrectScore) {
          // Generate correct score predictions
          for (const scoreOption of correctScoreOdds.slice(0, 3)) { // Limit to top 3 scores
            const confidence = Math.floor(Math.random() * 20) + 75 // 75-95% confidence for correct scores
            
            // Check confidence threshold
            if (confidence < confidenceThreshold) {
              filteredCount++
              continue
            }
            
            // Check odds filters
            if (minOddsValue !== null && scoreOption.odds < minOddsValue) {
              filteredCount++
              continue
            }
            if (maxOddsValue !== null && scoreOption.odds > maxOddsValue) {
              filteredCount++
              continue
            }
            
            predictions.push({
              plan_type: 'correct_score', // Use correct_score as plan_type
              home_team: fixture.match_hometeam_name || 'Home Team',
              away_team: fixture.match_awayteam_name || 'Away Team',
              league: fixture.league_name || 'Unknown League',
              prediction_type: scoreOption.score, // Just the score (e.g., "2-1")
              odds: scoreOption.odds,
              confidence: confidence,
              kickoff_time: `${fixture.match_date} ${fixture.match_time || '00:00'}:00`,
              status: fixture.match_status === 'Finished' ? 'finished' : 
                      fixture.match_live === '1' ? 'live' : 'not_started',
              match_id: fixture.match_id,
              league_id: fixture.league_id,
              home_team_id: fixture.match_hometeam_id,
              away_team_id: fixture.match_awayteam_id,
            })
          }
        }
        // For daily_2_odds, only include games with odds between 1.8 and 2.2 (around 2.0)
        else if (planType === 'daily_2_odds') {
          const twoOddsOptions = foundOdds.filter(o => o.odds >= 1.8 && o.odds <= 2.2)
          
          if (twoOddsOptions.length === 0) {
            // Skip this fixture if no 2 odds options found
            filteredCount++
            continue
          }
          
          // Only use the 2 odds options
          for (const option of twoOddsOptions) {
            const confidence = Math.floor(Math.random() * 30) + 70 // 70-100% confidence
            
            // Check confidence threshold
            if (confidence < confidenceThreshold) {
              filteredCount++
              continue
            }
            
            // Check odds filters
            if (minOddsValue !== null && option.odds < minOddsValue) {
              filteredCount++
              continue
            }
            if (maxOddsValue !== null && option.odds > maxOddsValue) {
              filteredCount++
              continue
            }
            
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
                match_id: fixture.match_id,
                league_id: fixture.league_id,
                home_team_id: fixture.match_hometeam_id,
                away_team_id: fixture.match_awayteam_id,
              })
          }
        } else {
          // For other plan types, use all prediction types
          // Find the odds for each prediction type
        for (const predictionType of predictionTypes) {
          const confidence = Math.floor(Math.random() * 30) + 70 // 70-100% confidence
          
            // Find the odds for this prediction type
            const typeOdds = foundOdds.find(o => o.type === predictionType)?.odds || odds
            
            // Check confidence threshold
            if (confidence < confidenceThreshold) {
              filteredCount++
              continue
            }
            
            // Check odds filters
            if (minOddsValue !== null && typeOdds < minOddsValue) {
              filteredCount++
              continue
            }
            if (maxOddsValue !== null && typeOdds > maxOddsValue) {
              filteredCount++
              continue
            }
            
            predictions.push({
              plan_type: planType,
              home_team: fixture.match_hometeam_name || 'Home Team',
              away_team: fixture.match_awayteam_name || 'Away Team',
              league: fixture.league_name || 'Unknown League',
              prediction_type: predictionType,
              odds: typeOdds,
              confidence: confidence,
              kickoff_time: `${fixture.match_date} ${fixture.match_time || '00:00'}:00`,
              status: fixture.match_status === 'Finished' ? 'finished' : 
                      fixture.match_live === '1' ? 'live' : 'not_started',
              match_id: fixture.match_id,
              league_id: fixture.league_id,
              home_team_id: fixture.match_hometeam_id,
              away_team_id: fixture.match_awayteam_id,
            })
          }
        }
      } catch (error) {
        console.error(`Error processing fixture ${fixture.match_id}:`, error)
        // Continue with next fixture
      }
    }

    // If preview mode, return predictions without inserting
    if (preview) {
      return NextResponse.json({ 
        message: 'Predictions fetched successfully', 
        predictions: predictions,
        preview: true,
        filtered: filteredCount,
        minConfidence: confidenceThreshold,
        minOdds: minOddsValue,
        maxOdds: maxOddsValue
      })
    }

    // Filter out fields that don't exist in the database schema before inserting
    // Only keep valid columns: plan_type, home_team, away_team, league, prediction_type, odds, confidence, kickoff_time, status
    const validColumns = ['plan_type', 'home_team', 'away_team', 'league', 'prediction_type', 'odds', 'confidence', 'kickoff_time', 'status', 'result', 'admin_notes']
    const cleanedPredictions = predictions.map((pred: any) => {
      const cleaned: any = {}
      validColumns.forEach(col => {
        if (pred[col] !== undefined && pred[col] !== null) {
          cleaned[col] = pred[col]
        }
      })
      return cleaned
    })

    // Insert predictions into database
    const { data, error } = await supabase
      .from('predictions')
      .insert(cleanedPredictions as any)
      .select()

    if (error) {
      console.error('Error inserting predictions:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Notify users subscribed to this plan type
    if (data && data.length > 0) {
      try {
        // Map plan_type to plan slug to get plan ID
        const planTypeToSlug: Record<string, string> = {
          'profit_multiplier': 'profit-multiplier',
          'daily_2_odds': 'daily-2-odds',
          'standard': 'standard',
          'free': 'free'
        }

        const planSlug = planTypeToSlug[planType]
        if (planSlug) {
          const planResult: any = await supabase
            .from('plans')
            .select('id, name')
            .eq('slug', planSlug)
            .single()
          const planData = planResult.data as { id: string; name: string } | null

          if (planData) {
            await notifyPredictionDropped(planData.id, planData.name)
          }
        }
      } catch (notifyError) {
        console.error('Error notifying users:', notifyError)
        // Don't fail the request if notification fails
      }
    }

    return NextResponse.json({ 
      message: 'Predictions synced successfully', 
      synced: data?.length || 0,
      filtered: filteredCount,
      minConfidence: confidenceThreshold,
      minOdds: minOddsValue,
      maxOdds: maxOddsValue
    })
  } catch (error: any) {
    console.error('Sync error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

