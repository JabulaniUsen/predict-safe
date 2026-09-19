'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { MailCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Navbar } from '@/components/layout/navbar'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const supabase = createClient()
      const redirectTo = `${window.location.origin}/auth/callback?next=/reset-password`

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo })
      if (error) throw error

      setSent(true)
    } catch (error: unknown) {
      // Deliberately generic: telling a stranger whether an address is
      // registered would leak our user list.
      console.error('Password reset request failed:', error)
      setSent(true)
    } finally {
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
              <h2 className="text-4xl font-bold mb-4">Back in a minute</h2>
              <p className="text-xl text-white/90 leading-relaxed">
                We&apos;ll email you a secure link so you can choose a new password.
              </p>
            </div>
          </div>
        </div>

        <div className="w-full lg:w-1/2 flex items-center justify-center bg-white p-4 lg:p-12">
          <div className="w-full max-w-lg">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-br from-[#1e40af] via-[#1e3a8a] to-[#1e40af] p-8 text-center">
                <h1 className="text-3xl font-bold text-white mb-2">Reset your password</h1>
                <p className="text-blue-100 text-sm">
                  Enter the email address you signed up with
                </p>
              </div>

              {sent ? (
                <div className="p-8 space-y-6 text-center">
                  <div className="flex justify-center">
                    <div className="h-14 w-14 rounded-full bg-blue-50 flex items-center justify-center">
                      <MailCheck className="h-7 w-7 text-[#1e40af]" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-gray-900 font-semibold">Check your inbox</p>
                    <p className="text-sm text-gray-600">
                      If an account exists for <span className="font-medium">{email}</span>, we&apos;ve
                      sent a link to reset your password. It expires in one hour.
                    </p>
                    <p className="text-xs text-gray-500">
                      Can&apos;t find it? Check your spam folder.
                    </p>
                  </div>
                  <div className="space-y-3 pt-2">
                    <Button
                      variant="outline"
                      className="w-full h-12"
                      onClick={() => {
                        setSent(false)
                      }}
                    >
                      Use a different email
                    </Button>
                    <Link href="/login" className="block">
                      <Button variant="ghost" className="w-full">
                        Back to sign in
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="p-8 space-y-6">
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
                      autoComplete="email"
                      className="h-12 border-2 border-gray-200 rounded-lg focus:border-[#1e40af] focus:ring-2 focus:ring-[#1e40af]/20 transition-all bg-gray-50/50"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 bg-gradient-to-r from-[#1e40af] to-[#1e3a8a] hover:from-[#1e3a8a] hover:to-[#1e40af] text-white font-semibold text-base rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={loading}
                  >
                    {loading ? 'Sending link...' : 'Send reset link'}
                  </Button>

                  <div className="text-center pt-2">
                    <p className="text-sm text-gray-600">
                      Remembered it?{' '}
                      <Link
                        href="/login"
                        className="text-[#1e40af] font-semibold hover:text-[#1e3a8a] transition-colors"
                      >
                        Sign in
                      </Link>
                    </p>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
