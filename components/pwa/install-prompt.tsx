'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { X, Download, Smartphone } from 'lucide-react'
import Image from 'next/image'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const STORAGE_KEY = 'pwa-install-prompt-seen'

/**
 * Routes where the install prompt must never appear.
 *
 * This banner used to render as `fixed inset-0` with a full-screen
 * `pointer-events-auto` backdrop, two seconds after load, on every mobile
 * device. On /signup that meant the first tap on "Create Account" hit the
 * backdrop and dismissed the banner instead of submitting the form - the
 * registration button genuinely did not work on mobile. It's now a bottom
 * sheet that doesn't cover the page, and it stays away from the flows where
 * an interruption costs the most.
 */
const SUPPRESSED_PATHS = ['/login', '/signup', '/checkout', '/subscribe', '/payment']

function hasSeenPrompt(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    // Private browsing / blocked storage - treat as seen so a user who can't
    // persist the dismissal isn't nagged on every page.
    return true
  }
}

function markPromptSeen() {
  try {
    localStorage.setItem(STORAGE_KEY, 'true')
  } catch {
    // Nothing to do - the banner is dismissed for this page view regardless.
  }
}

interface BannerState {
  visible: boolean
  isIOS: boolean
}

export function InstallPrompt() {
  const pathname = usePathname()
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [banner, setBanner] = useState<BannerState>({ visible: false, isIOS: false })

  // Whether this route allows the banner at all - a plain render-time
  // derivation, so navigating to checkout hides it without an extra effect.
  const suppressed = SUPPRESSED_PATHS.some((path) => pathname?.startsWith(path))

  useEffect(() => {
    if (suppressed) return
    if (window.matchMedia('(display-mode: standalone)').matches) return
    if (hasSeenPrompt()) return

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    )
    if (!isMobile) return

    // Long enough that it never lands mid-tap on a page the visitor has just
    // started interacting with.
    const timer = setTimeout(() => {
      const isIOS =
        /iPad|iPhone|iPod/.test(navigator.userAgent) &&
        !(window as unknown as { MSStream?: unknown }).MSStream
      setBanner({ visible: true, isIOS })
    }, 8000)

    return () => clearTimeout(timer)
  }, [suppressed])

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Always capture the event so "Install" can work if the banner is shown
      // later; only the UI is suppressed.
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
    setBanner((prev) => ({ ...prev, visible: false }))
    markPromptSeen()
  }

  const handleDismiss = () => {
    setBanner((prev) => ({ ...prev, visible: false }))
    markPromptSeen()
  }

  if (suppressed || !banner.visible) return null

  const isIOS = banner.isIOS

  return (
    // No backdrop, and the container itself never intercepts taps - only the
    // card does. Everything behind the banner stays usable.
    <div
      className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-3 pointer-events-none"
      role="dialog"
      aria-label="Install PredictSafe"
    >
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-gray-200 pointer-events-auto">
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-2 rounded-full hover:bg-gray-100 transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4 text-gray-500" />
        </button>

        <div className="p-4 pr-12">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt=""
              width={44}
              height={44}
              className="w-11 h-11 rounded-lg flex-shrink-0"
            />
            <div className="min-w-0">
              <h3 className="text-base font-bold text-gray-900">Install PredictSafe</h3>
              <p className="text-xs text-gray-600">Faster access to predictions and live scores</p>
            </div>
          </div>

          {isIOS ? (
            <div className="mt-3">
              <p className="text-xs text-gray-600">
                Tap the Share button, then <span className="font-semibold">Add to Home Screen</span>.
              </p>
              <Button onClick={handleDismiss} variant="outline" size="sm" className="w-full mt-3">
                Got it
              </Button>
            </div>
          ) : deferredPrompt ? (
            <div className="flex gap-2 mt-3">
              <Button onClick={handleDismiss} variant="outline" size="sm" className="flex-1">
                Not now
              </Button>
              <Button
                onClick={handleInstall}
                size="sm"
                className="flex-1 bg-gradient-to-r from-[#1e40af] to-[#1e3a8a] hover:from-[#1e3a8a] hover:to-[#1e40af]"
              >
                <Download className="h-4 w-4 mr-1.5" />
                Install
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 mt-3">
              <Smartphone className="h-4 w-4 text-blue-600 flex-shrink-0" />
              <p className="text-xs text-gray-600 flex-1">
                Add PredictSafe to your home screen from your browser menu.
              </p>
              <Button onClick={handleDismiss} variant="outline" size="sm">
                Close
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
