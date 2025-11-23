'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, User, ArrowRight, Menu, X } from 'lucide-react'

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [siteHeader, setSiteHeader] = useState('PredictSafe')
  const [siteSubheader, setSiteSubheader] = useState('Your trusted source for accurate football predictions')

  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
    }
    checkUser()
  }, [pathname])

  useEffect(() => {
    const fetchConfig = async () => {
      const supabase = createClient()
      const { data: config } = await supabase
        .from('site_config')
        .select('key, value')
        .in('key', ['site_header', 'site_subheader'])

      if (config && Array.isArray(config)) {
        config.forEach((item: { key: string; value: any }) => {
          if (item.key === 'site_header' && item.value) setSiteHeader(item.value)
          if (item.key === 'site_subheader' && item.value) setSiteSubheader(item.value)
        })
      }
    }
    fetchConfig()
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <nav className="relative bg-white border-b border-purple-500">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt={`${siteHeader} Logo`}
              width={70}
              height={70}
              className=" w-auto object-contain"
              priority
            />
          </Link>

          {/* Navigation Links */}
          <div className="hidden lg:flex items-center gap-6">
            <Link
              href="/"
              className={`text-sm font-medium transition-colors ${
                pathname === '/' ? 'text-[#1e40af]' : 'text-gray-600 hover:text-[#1e40af]'
              }`}
            >
              Home
            </Link>
            
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-[#1e40af] transition-colors focus:outline-none">
                Premium Tips
                <ChevronDown className="h-3 w-3" />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-white border-gray-200">
                <DropdownMenuItem asChild>
                  <Link href="/subscriptions" className="text-gray-900 hover:bg-gray-100">VIP Packages</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/predictions?plan=profit-multiplier" className="text-gray-900 hover:bg-gray-100">Profit Multiplier</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/predictions?plan=correct-score" className="text-gray-900 hover:bg-gray-100">Correct Score</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-[#1e40af] transition-colors focus:outline-none">
                Free Tips
                <ChevronDown className="h-3 w-3" />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-white border-gray-200">
                <DropdownMenuItem asChild>
                  <Link href="/" className="text-gray-900 hover:bg-gray-100">Free Predictions</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/predictions?plan=free" className="text-gray-900 hover:bg-gray-100">View All Free</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Link
              href="/subscriptions"
              className={`text-sm font-medium transition-colors ${
                pathname === '/subscriptions' ? 'text-purple-600' : 'text-purple-600 hover:text-purple-700'
              }`}
            >
              VIP Packages
            </Link>

            <Link
              href="/livescores"
              className={`text-sm font-medium transition-colors ${
                pathname === '/livescores' ? 'text-blue-600' : 'text-blue-600 hover:text-blue-700'
              }`}
            >
              Livescores
            </Link>

            <Link
              href="/blog"
              className={`text-sm font-medium transition-colors ${
                pathname === '/blog' ? 'text-[#1e40af]' : 'text-gray-600 hover:text-[#1e40af]'
              }`}
            >
              Blog
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-[#1e40af] transition-colors focus:outline-none">
                More
                <ChevronDown className="h-3 w-3" />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-white border-gray-200">
                <DropdownMenuItem asChild>
                  <Link href="/faq" className="text-gray-900 hover:bg-gray-100">FAQ</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/about" className="text-gray-900 hover:bg-gray-100">About Us</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/terms" className="text-gray-900 hover:bg-gray-100">Terms & Conditions</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/privacy" className="text-gray-900 hover:bg-gray-100">Privacy Policy</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Link
              href="/contact"
              className={`text-sm font-medium transition-colors ${
                pathname === '/contact' ? 'text-[#1e40af]' : 'text-gray-600 hover:text-[#1e40af]'
              }`}
            >
              Contact Us
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden text-gray-600 hover:text-[#1e40af]"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>

          {/* Right Side Buttons */}
          <div className="hidden lg:flex items-center gap-3">
            {loading ? (
              <div className="h-8 w-8 animate-pulse rounded-full bg-gray-200" />
            ) : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.user_metadata?.avatar_url} alt={user.email} />
                      <AvatarFallback className="bg-[#1e40af] text-white">{user.email?.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-white border-gray-200" align="end" forceMount>
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      <p className="font-medium text-gray-900">{user.email}</p>
                    </div>
                  </div>
                  <DropdownMenuSeparator className="bg-gray-200" />
                  <DropdownMenuItem asChild className="text-gray-900 hover:bg-gray-100">
                    <Link href="/dashboard">Dashboard</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="text-gray-900 hover:bg-gray-100">
                    <Link href="/dashboard/settings">Settings</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-gray-200" />
                  <DropdownMenuItem onClick={handleLogout} className="text-gray-900 hover:bg-gray-100">Log out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Link href="/signup">
                  <Button 
                    variant="outline" 
                    className="border-pink-500 text-pink-500 hover:bg-pink-500 hover:text-white bg-transparent rounded-lg"
                  >
                    <User className="h-4 w-4 mr-2" />
                    Register
                  </Button>
                </Link>
                <Link href="/login">
                  <Button 
                    className="bg-[#1e3a8a] hover:bg-[#1e40af] text-white rounded-lg"
                  >
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Login
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity duration-300"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Mobile Menu */}
        <div
          className={`lg:hidden fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
            mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex flex-col h-full">
            {/* Mobile Menu Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <Link href="/" className="flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
                <Image
                  src="/logo.png"
                  alt={`${siteHeader} Logo`}
                  width={50}
                  height={50}
                  className="w-auto object-contain"
                  priority
                />
              </Link>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="text-gray-600 hover:text-[#1e40af] transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Mobile Menu Content */}
            <div className="flex-1 overflow-y-auto py-4 px-4">
              <div className="flex flex-col gap-1">
                <Link 
                  href="/" 
                  className={`px-4 py-3 rounded-lg transition-colors ${
                    pathname === '/' 
                      ? 'bg-[#1e40af]/10 text-[#1e40af] font-medium' 
                      : 'text-gray-600 hover:bg-gray-100 hover:text-[#1e40af]'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Home
                </Link>
                <Link 
                  href="/subscriptions" 
                  className={`px-4 py-3 rounded-lg transition-colors ${
                    pathname === '/subscriptions' 
                      ? 'bg-purple-100 text-purple-600 font-medium' 
                      : 'text-purple-600 hover:bg-purple-50 hover:text-purple-700'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  VIP Packages
                </Link>
                <Link 
                  href="/dashboard/predictions?plan=profit-multiplier" 
                  className="px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-[#1e40af] transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Profit Multiplier
                </Link>
                <Link 
                  href="/dashboard/predictions?plan=correct-score" 
                  className="px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-[#1e40af] transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Correct Score
                </Link>
                <Link 
                  href="/livescores" 
                  className={`px-4 py-3 rounded-lg transition-colors ${
                    pathname === '/livescores' 
                      ? 'bg-blue-100 text-blue-600 font-medium' 
                      : 'text-blue-600 hover:bg-blue-50 hover:text-blue-700'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Livescores
                </Link>
                <Link 
                  href="/blog" 
                  className={`px-4 py-3 rounded-lg transition-colors ${
                    pathname === '/blog' 
                      ? 'bg-[#1e40af]/10 text-[#1e40af] font-medium' 
                      : 'text-gray-600 hover:bg-gray-100 hover:text-[#1e40af]'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Blog
                </Link>
                <Link 
                  href="/faq" 
                  className="px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-[#1e40af] transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  FAQ
                </Link>
                <Link 
                  href="/contact" 
                  className={`px-4 py-3 rounded-lg transition-colors ${
                    pathname === '/contact' 
                      ? 'bg-[#1e40af]/10 text-[#1e40af] font-medium' 
                      : 'text-gray-600 hover:bg-gray-100 hover:text-[#1e40af]'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Contact Us
                </Link>
              </div>

              {/* User Section */}
              {loading ? (
                <div className="mt-4 px-4">
                  <div className="h-10 w-full animate-pulse rounded-lg bg-gray-200" />
                </div>
              ) : user ? (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="px-4 mb-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.user_metadata?.avatar_url} alt={user.email} />
                        <AvatarFallback className="bg-[#1e40af] text-white">{user.email?.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{user.email}</p>
                      </div>
                    </div>
                  </div>
                  <Link 
                    href="/dashboard" 
                    className="block px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-[#1e40af] transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <Link 
                    href="/dashboard/settings" 
                    className="block px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-[#1e40af] transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Settings
                  </Link>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false)
                      handleLogout()
                    }}
                    className="w-full text-left px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-red-600 transition-colors"
                  >
                    Log out
                  </button>
                </div>
              ) : (
                <div className="mt-6 pt-6 border-t border-gray-200 px-4 space-y-2 flex flex-col gap-2">
                  <Link href="/signup" onClick={() => setMobileMenuOpen(false)}>
                    <Button 
                      variant="outline" 
                      className="w-full border-pink-500 text-pink-500 hover:bg-pink-500 hover:text-white bg-transparent rounded-lg"
                    >
                      <User className="h-4 w-4 mr-2" />
                      Register
                    </Button>
                  </Link>
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button 
                      className="w-full bg-[#1e3a8a] hover:bg-[#1e40af] text-white rounded-lg"
                    >
                      <ArrowRight className="h-4 w-4 mr-2" />
                      Login
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}

