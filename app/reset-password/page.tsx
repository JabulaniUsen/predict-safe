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
import { Navbar } from '@/components/layout/navbar'
import { toast } from 'sonner'

/**
 * Where a password-reset link lands, after /auth/callback has exchanged the
 * code for a session. The recovery session is what authorises the change, so
 * this page is only usable by someone who opened a link sent to that address.
 */
export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [hasSession, setHasSession] = useState(false)

  useEffect(() => {
    const checkSession = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      setHasSession(Boolean(session))
      setCheckingSession(false)
    }
    checkSession()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password.length < 6) {
      toast.error('Please use at least 6 characters')
      return
    }
    if (password !== confirmPassword) {
      toast.error('Both passwords must match')
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error

      toast.success('Password updated. You are now signed in.')
      router.push('/dashboard')
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Could not update your password'
      toast.error(message)
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <div className="flex flex-1">
        <div className="hidden lg:block lg:w-1/2 relative">
          <div className="absolute inset-0">
            <Image
              src="/hero-pics/hero-bg2-1920.jpg"
              alt=""
              fill
              sizes="50vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-[#1e40af]/80 to-[#1e3a8a]/80" />
          </div>
          <div className="relative z-10 h-full flex flex-col items-center justify-center p-12 text-white">
            <div className="max-w-md text-center">
              <h2 className="text-4xl font-bold mb-4">Choose a new password</h2>
              <p className="text-xl text-white/90 leading-relaxed">
                Pick something you haven&apos;t used elsewhere.
              </p>
            </div>
          </div>
        </div>

        <div className="w-full lg:w-1/2 flex items-center justify-center bg-white p-4 lg:p-12">
          <div className="w-full max-w-lg">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-br from-[#1e40af] via-[#1e3a8a] to-[#1e40af] p-8 text-center">
                <h1 className="text-3xl font-bold text-white mb-2">Set a new password</h1>
                <p className="text-blue-100 text-sm">You&apos;ll be signed in straight afterwards</p>
              </div>

              {checkingSession ? (
                <div className="p-8 text-center text-sm text-gray-600">Checking your link...</div>
              ) : !hasSession ? (
                <div className="p-8 space-y-4 text-center">
                  <p className="text-gray-900 font-semibold">This link is no longer valid</p>
                  <p className="text-sm text-gray-600">
                    Reset links expire after an hour and can only be used once.
                  </p>
                  <Link href="/forgot-password" className="block">
                    <Button className="w-full h-12 bg-gradient-to-r from-[#1e40af] to-[#1e3a8a]">
                      Request a new link
                    </Button>
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                  <div className="space-y-1.5">
                    <Label htmlFor="password" className="text-sm font-medium text-gray-700 ml-1">
                      New Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="At least 6 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        autoComplete="new-password"
                        className="h-12 border-2 border-gray-200 rounded-lg focus:border-[#1e40af] focus:ring-2 focus:ring-[#1e40af]/20 transition-all bg-gray-50/50 pr-12"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#1e40af] transition-colors"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="confirmPassword"
                      className="text-sm font-medium text-gray-700 ml-1"
                    >
                      Confirm New Password
                    </Label>
                    <Input
                      id="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Repeat your new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                      autoComplete="new-password"
                      className="h-12 border-2 border-gray-200 rounded-lg focus:border-[#1e40af] focus:ring-2 focus:ring-[#1e40af]/20 transition-all bg-gray-50/50"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 bg-gradient-to-r from-[#1e40af] to-[#1e3a8a] hover:from-[#1e3a8a] hover:to-[#1e40af] text-white font-semibold text-base rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={loading}
                  >
                    {loading ? 'Updating...' : 'Update password'}
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
