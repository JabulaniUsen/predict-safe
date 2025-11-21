'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function ProfitMultiplierSection() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    checkUser()
  }, [])

  const handleAccess = () => {
    if (!user) {
      router.push('/login')
    } else {
      // Check if user has active subscription
      router.push('/dashboard')
    }
  }

  return (
    <section className="py-16 bg-[#1e40af]">
      <div className="container mx-auto px-4">
        <Card className="border-2 border-white shadow-2xl">
          <CardContent className="py-12 text-center bg-gradient-to-br from-[#1e40af] to-[#1e3a8a] text-white">
            <h2 className="mb-4 text-4xl font-bold text-white">Profit Multiplier</h2>
            <p className="mb-8 text-lg text-blue-100 max-w-2xl mx-auto leading-relaxed">
              Boost your returns with our expert predictions! Enjoy a winning rate of up to 90% with
              daily high-odds predictions ranging from 2.80 to 4.30. Get ready to amplify your
              profits!
            </p>
            <Button 
              size="lg" 
              onClick={handleAccess}
              className="bg-gradient-to-r from-[#f97316] to-[#ea580c] hover:from-[#ea580c] hover:to-[#f97316] text-white font-bold px-8 py-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            >
              Access Profit Multiplier Tips
            </Button>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}

