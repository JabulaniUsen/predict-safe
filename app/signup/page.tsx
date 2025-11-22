'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Combobox } from '@/components/ui/combobox'
import { toast } from 'sonner'
import { Database } from '@/types/database'

type UserInsert = Database['public']['Tables']['users']['Insert']

interface Country {
  name: {
    common: string
    official: string
  }
  cca2: string
  cca3: string
}


export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [fullName, setFullName] = useState('')
  const [selectedCountry, setSelectedCountry] = useState('')
  const [loading, setLoading] = useState(false)
  const [rateLimitError, setRateLimitError] = useState(false)
  const [rateLimitCountdown, setRateLimitCountdown] = useState(0)
  const [countries, setCountries] = useState<Array<{ value: string; label: string }>>([])
  const [loadingCountries, setLoadingCountries] = useState(true)

  // Countdown timer for rate limit
  useEffect(() => {
    if (rateLimitCountdown > 0) {
      const timer = setTimeout(() => {
        setRateLimitCountdown(rateLimitCountdown - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else if (rateLimitCountdown === 0 && rateLimitError) {
      setRateLimitError(false)
    }
  }, [rateLimitCountdown, rateLimitError])

  // Fetch countries from REST Countries API
  useEffect(() => {
    const fetchCountries = async () => {
      try {
        setLoadingCountries(true)
        const response = await fetch('https://restcountries.com/v3.1/all?fields=name,cca2,cca3')
        const data: Country[] = await response.json()
        
        const countryOptions = data
          .map((country) => ({
            value: country.cca2,
            label: country.name.common,
          }))
          .sort((a, b) => a.label.localeCompare(b.label))
        
        setCountries(countryOptions)
      } catch (error) {
        console.error('Error fetching countries:', error)
        toast.error('Failed to load countries')
      } finally {
        setLoadingCountries(false)
      }
    }
    fetchCountries()
  }, [])


  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const supabase = createClient()
      
      // Sign up user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (authError) throw authError

      if (authData.user) {
        // Map selected country code to country name
        let countryName = 'Nigeria' // Default
        if (selectedCountry) {
          // Get country name from REST Countries API
          try {
            const countryResponse = await fetch(`https://restcountries.com/v3.1/alpha/${selectedCountry}?fields=name,cca2,cca3`)
            const countryData = await countryResponse.json()
            const countryCommonName = countryData?.name?.common || ''
            
            // Map to our supported countries
            if (['Nigeria', 'Ghana', 'Kenya'].includes(countryCommonName)) {
              countryName = countryCommonName
            } else {
              countryName = 'Other' // For any other country
            }
          } catch (error) {
            console.error('Error fetching country name:', error)
            // Default to Nigeria if API fails
            countryName = 'Nigeria'
          }
        }

        // Create user profile
        const userData: UserInsert = {
          id: authData.user.id,
          email,
          full_name: fullName,
          country: countryName,
        }
        const result: any = await supabase
          .from('users')
          // @ts-expect-error - Supabase type inference issue
          .insert(userData)
        const { error: profileError } = result

        if (profileError) throw profileError

        toast.success('Account created successfully! Please check your email to verify your account.')
        router.push('/login')
      }
    } catch (error: any) {
      // Handle specific Supabase errors
      if (error.code === 'over_email_send_rate_limit' || error.message?.includes('rate_limit')) {
        setRateLimitError(true)
        setRateLimitCountdown(40)
        toast.error('Too many email requests. Please wait 40 seconds before trying again.')
      } else if (error.message?.includes('email') || error.message?.includes('already registered')) {
        toast.error('Email address is already registered or invalid. Please try a different email.')
      } else if (error.message?.includes('password') || error.message?.includes('Password')) {
        toast.error('Password is too weak. Please use a stronger password (minimum 6 characters).')
      } else {
        toast.error(error.message || 'Failed to create account. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#1e40af]/5 via-white to-[#22c55e]/5 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="PredictSafe Logo"
              width={60}
              height={60}
              className="h-16 w-auto"
              priority
            />
          </Link>
        </div>

        <Card className="border-2 border-gray-200 shadow-2xl">
          <CardHeader className="bg-gradient-to-r from-[#1e40af] to-[#1e3a8a] text-white rounded-t-lg">
            <CardTitle className="text-2xl font-bold text-center">Create Account</CardTitle>
            <CardDescription className="text-blue-100 text-center">
              Join PredictSafe and start winning today
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSignup}>
            <CardContent className="space-y-5 p-6">
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-sm font-semibold text-gray-700">
                  Full Name
                </Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="h-11 border-gray-300 focus:border-[#1e40af] focus:ring-[#1e40af]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold text-gray-700">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11 border-gray-300 focus:border-[#1e40af] focus:ring-[#1e40af]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-semibold text-gray-700">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a password (min. 6 characters)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="h-11 border-gray-300 focus:border-[#1e40af] focus:ring-[#1e40af] pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#1e40af] transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500">Password must be at least 6 characters</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="country" className="text-sm font-semibold text-gray-700">
                  Country
                </Label>
                <Combobox
                  options={countries}
                  value={selectedCountry}
                  onValueChange={setSelectedCountry}
                  placeholder={loadingCountries ? "Loading countries..." : "Select your country"}
                  searchPlaceholder="Search countries..."
                  emptyMessage="No country found."
                  className="border-gray-300 focus:border-[#1e40af] focus:ring-[#1e40af]"
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4 p-6 pt-0">
              {rateLimitError && (
                <div className="w-full bg-orange-50 border border-orange-200 rounded-lg p-3 text-center">
                  <p className="text-sm text-orange-800 font-semibold">
                    Please wait {rateLimitCountdown} seconds before trying again
                  </p>
                </div>
              )}
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-[#1e40af] to-[#1e3a8a] hover:from-[#1e3a8a] hover:to-[#1e40af] text-white font-bold h-11 text-lg shadow-lg hover:shadow-xl transition-all duration-300"
                disabled={loading || rateLimitError}
              >
                {loading ? 'Creating account...' : rateLimitError ? `Wait ${rateLimitCountdown}s` : 'Create Account'}
              </Button>
              <p className="text-sm text-center text-gray-600">
                Already have an account?{' '}
                <Link href="/login" className="text-[#1e40af] font-semibold hover:underline">
                  Sign in
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}

