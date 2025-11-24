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
import { Combobox } from '@/components/ui/combobox'
import { toast } from 'sonner'
import { Database } from '@/types/database'
import { Navbar } from '@/components/layout/navbar'
import { getRandomAvatar } from '@/lib/utils/avatars'

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

      // Sign up user with metadata (database trigger will create user record)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            country: countryName,
          },
        },
      })

      if (authError) throw authError

      if (authData.user) {
        // Get a random avatar from the avatars bucket
        console.log('Fetching random avatar...')
        const randomAvatarUrl = await getRandomAvatar()
        console.log('Random avatar URL:', randomAvatarUrl)
        
        // Function to update user with avatar
        const updateUserAvatar = async () => {
          if (randomAvatarUrl && authData.user) {
            const { error: updateError } = await supabase
              .from('users')
              // @ts-expect-error - Supabase type inference issue
              .update({ avatar_url: randomAvatarUrl })
              .eq('id', authData.user.id)
            
            if (updateError) {
              console.error('Error updating user avatar:', updateError)
            } else {
              console.log('Successfully updated user avatar')
            }
          } else {
            console.warn('No avatar URL to assign or user not found')
          }
        }
        
        // Try to create user profile manually as backup (trigger should handle this)
        // This ensures the user is created even if trigger hasn't run yet
        try {
        const userData: UserInsert = {
            id: authData.user.id,
            email,
            full_name: fullName,
          country: countryName,
          avatar_url: randomAvatarUrl,
        }
        const result: any = await supabase
          .from('users')
          // @ts-expect-error - Supabase type inference issue
          .insert(userData)
        const { error: profileError } = result

          // If error is due to duplicate (trigger already created it), update with avatar
          if (profileError && (profileError.message?.includes('duplicate') || profileError.code?.includes('23505'))) {
            // User already exists (trigger created it), update with avatar
            console.log('User already exists, updating avatar...')
            await updateUserAvatar()
          } else if (profileError) {
            console.warn('User profile creation warning:', profileError)
            // Still try to update avatar even if insert failed
            await updateUserAvatar()
          } else {
            // Insert succeeded, but also ensure avatar is set (in case it was null)
            console.log('User created successfully, verifying avatar...')
            if (!randomAvatarUrl) {
              // If avatar fetch failed, try again
              const retryAvatarUrl = await getRandomAvatar()
              if (retryAvatarUrl && authData.user) {
                await supabase
                  .from('users')
                  // @ts-expect-error - Supabase type inference issue
                  .update({ avatar_url: retryAvatarUrl })
                  .eq('id', authData.user.id)
              }
            }
          }
        } catch (profileError: any) {
          // If it's a duplicate key error, the trigger already created the user
          if (profileError.message?.includes('duplicate') || profileError.code?.includes('23505')) {
            // User already exists (trigger created it), update with avatar
            console.log('User already exists (catch), updating avatar...')
            await updateUserAvatar()
          } else {
            console.warn('User profile creation warning:', profileError)
            // Still try to update avatar
            await updateUserAvatar()
          }
        }
        
        // Final fallback: wait a bit and try to update avatar one more time
        // This handles race conditions where trigger creates user after our insert attempt
        if (authData.user) {
          const userId = authData.user.id
          setTimeout(async () => {
            const existingUserResult: any = await supabase
              .from('users')
              .select('avatar_url')
              .eq('id', userId)
              .single()
            const existingUser = existingUserResult.data as { avatar_url: string | null } | null
            
            if (existingUser && !existingUser.avatar_url && randomAvatarUrl) {
              console.log('Fallback: Updating avatar after delay...')
              await updateUserAvatar()
            }
          }, 1000)
        }

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
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <div className="flex flex-1">
      {/* Left Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-white p-4 lg:p-12">
        <div className="w-full max-w-lg">

          {/* Form Container */}
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-br from-[#1e40af] via-[#1e3a8a] to-[#1e40af] p-8 text-center">
              <h1 className="text-3xl font-bold text-white mb-2">Create Account</h1>
              <p className="text-blue-100 text-sm">Join PredictSafe and start winning today</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSignup} className="p-8 space-y-6">
              {rateLimitError && (
                <div className="bg-orange-50 border-l-4 border-orange-400 rounded-lg p-4">
                  <p className="text-sm text-orange-800 font-semibold">
                    Please wait {rateLimitCountdown} seconds before trying again
                  </p>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="fullName" className="text-sm font-medium text-gray-700 ml-1">
                  Full Name
                </Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Enter your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="h-12 border-2 border-gray-200 rounded-lg focus:border-[#1e40af] focus:ring-2 focus:ring-[#1e40af]/20 transition-all bg-gray-50/50"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700 ml-1">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 border-2 border-gray-200 rounded-lg focus:border-[#1e40af] focus:ring-2 focus:ring-[#1e40af]/20 transition-all bg-gray-50/50"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700 ml-1">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a strong password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="h-12 border-2 border-gray-200 rounded-lg focus:border-[#1e40af] focus:ring-2 focus:ring-[#1e40af]/20 transition-all bg-gray-50/50 pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#1e40af] transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500 ml-1">Minimum 6 characters</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="country" className="text-sm font-medium text-gray-700 ml-1">
                  Country
                </Label>
                <div className="border-2 border-gray-200 rounded-lg focus-within:border-[#1e40af] focus-within:ring-2 focus-within:ring-[#1e40af]/20 transition-all bg-gray-50/50">
                  <Combobox
                    options={countries}
                    value={selectedCountry}
                    onValueChange={setSelectedCountry}
                    placeholder={loadingCountries ? "Loading countries..." : "Select your country"}
                    searchPlaceholder="Search countries..."
                    emptyMessage="No country found."
                    className="border-0 focus:ring-0"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-[#1e40af] to-[#1e3a8a] hover:from-[#1e3a8a] hover:to-[#1e40af] text-white font-semibold text-base rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                disabled={loading || rateLimitError}
              >
                {loading ? 'Creating account...' : rateLimitError ? `Wait ${rateLimitCountdown}s` : 'Create Account'}
              </Button>

              <div className="text-center pt-4">
                <p className="text-sm text-gray-600">
                  Already have an account?{' '}
                  <Link href="/login" className="text-[#1e40af] font-semibold hover:text-[#1e3a8a] transition-colors">
                    Sign in
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Right Side - Hero Image */}
      <div className="hidden lg:block lg:w-1/2 relative">
        <div className="absolute inset-0">
          <Image
            src="/hero-pics/hero-bg1.jpg"
            alt="Football stadium background"
            fill
            className="object-cover"
            priority
            quality={90}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#1e40af]/80 to-[#1e3a8a]/80" />
        </div>
        <div className="relative z-10 h-full flex flex-col items-center justify-center p-12 text-white">
          <div className="max-w-md text-center">
            <h2 className="text-4xl font-bold mb-4">Start Your Winning Journey</h2>
            <p className="text-xl text-white/90 leading-relaxed">
              Join thousands of successful bettors who trust PredictSafe for accurate football predictions and expert betting tips.
            </p>
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}


