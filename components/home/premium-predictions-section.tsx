'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Lock } from 'lucide-react'

export function PremiumPredictionsSection() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    fetchUser()
  }, [])

  const handleSubscribe = (planType: 'profit-multiplier' | 'correct-score') => {
    if (!user) {
      router.push('/login')
    } else {
      router.push('/subscriptions')
    }
  }

  return (
    <section className="py-8 lg:py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="mb-8 text-center">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#1e40af] mb-2">Premium Predictions</h2>
          <p className="text-sm lg:text-base text-gray-600">Unlock exclusive predictions with a subscription</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
          {/* Profit Multiplier Card */}
          <div>
            <h3 className="text-xl lg:text-2xl font-bold text-gray-900 mb-4 text-center">Profit Multiplier</h3>
            <Card 
              className="relative border-2 border-gray-200 hover:border-[#f97316] hover:shadow-xl transition-all duration-300 transform hover:scale-105 cursor-pointer"
              onClick={() => handleSubscribe('profit-multiplier')}
            >
              <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-md z-10 rounded-lg">
                <div className="text-center p-6">
                  <Lock className="mx-auto mb-4 h-16 w-16 text-[#f97316] animate-pulse" />
                  <h3 className="text-xl font-bold text-white mb-2">Premium Locked</h3>
                  <p className="text-sm text-gray-200 mb-4">Subscribe to unlock</p>
                  <Button 
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSubscribe('profit-multiplier')
                    }}
                    className="bg-gradient-to-r from-[#f97316] to-[#ea580c] hover:from-[#ea580c] hover:to-[#f97316] text-white font-bold px-8 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    Subscribe to Premium
                  </Button>
                </div>
              </div>
              <CardContent className="bg-gradient-to-br from-[#1e40af] to-[#1e3a8a] text-white p-12 min-h-[300px] flex flex-col items-center justify-center opacity-30">
                <p className="text-center text-blue-100">High-value predictions with odds between 2.8 - 4.3</p>
              </CardContent>
            </Card>
          </div>

          {/* Correct Score Card */}
          <div>
            <h3 className="text-xl lg:text-2xl font-bold text-gray-900 mb-4 text-center">Correct Score Predictions</h3>
            <Card 
              className="relative border-2 border-gray-200 hover:border-[#f97316] hover:shadow-xl transition-all duration-300 transform hover:scale-105 cursor-pointer"
              onClick={() => handleSubscribe('correct-score')}
            >
              <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-md z-10 rounded-lg">
                <div className="text-center p-6">
                  <Lock className="mx-auto mb-4 h-16 w-16 text-[#f97316] animate-pulse" />
                  <h3 className="text-xl font-bold text-white mb-2">Premium Locked</h3>
                  <p className="text-sm text-gray-200 mb-4">Subscribe to unlock</p>
                  <Button 
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSubscribe('correct-score')
                    }}
                    className="bg-gradient-to-r from-[#f97316] to-[#ea580c] hover:from-[#ea580c] hover:to-[#f97316] text-white font-bold px-8 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    Subscribe to Premium
                  </Button>
                </div>
              </div>
              <CardContent className="bg-gradient-to-br from-[#1e40af] to-[#1e3a8a] text-white p-12 min-h-[300px] flex flex-col items-center justify-center opacity-30">
                <p className="text-center text-blue-100">Accurate score predictions for maximum returns</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  )
}

