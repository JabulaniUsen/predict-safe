'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { X, Download, Smartphone } from 'lucide-react'
import Image from 'next/image'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsStandalone(true)
      return
    }

    // Check if user has ever dismissed or seen the prompt (stored in localStorage)
    const hasSeenPrompt = localStorage.getItem('pwa-install-prompt-seen')
    
    // If user has already seen/dismissed the prompt, never show it again
    if (hasSeenPrompt) {
      return
    }

    // Check if iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    setIsIOS(iOS)

    // Show modal if:
    // 1. User has never seen the prompt before
    // 2. Not already installed
    // 3. On mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    
    if (!isStandalone && isMobile) {
      // Delay showing modal slightly for better UX
      const timer = setTimeout(() => {
        setShowModal(true)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Check if user has already seen the prompt
      const hasSeenPrompt = localStorage.getItem('pwa-install-prompt-seen')
      if (hasSeenPrompt) {
        return // Don't show if user has already seen it
      }

      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowModal(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt')
      }
      
      setDeferredPrompt(null)
      setShowModal(false)
      // Mark as seen so it never shows again
      localStorage.setItem('pwa-install-prompt-seen', 'true')
    }
  }

  const handleDismiss = () => {
    setShowModal(false)
    // Mark as seen so it never shows again
    localStorage.setItem('pwa-install-prompt-seen', 'true')
  }

  if (!showModal || isStandalone) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-none">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 transition-opacity duration-300 pointer-events-auto"
        onClick={handleDismiss}
      />
      
      {/* Modal */}
      <div 
        className="relative w-full max-w-md bg-white rounded-t-2xl shadow-2xl pointer-events-auto"
        style={{
          animation: 'slideUp 0.3s ease-out'
        }}
      >
        {/* Close Button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors z-10"
          aria-label="Close"
        >
          <X className="h-5 w-5 text-gray-500" />
        </button>

        {/* Content */}
        <div className="p-6 pt-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-shrink-0">
              <Image
                src="/logo.png"
                alt="PredictSafe Logo"
                width={64}
                height={64}
                className="w-16 h-16 rounded-lg"
              />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-900 mb-1">
                Install PredictSafe App
              </h3>
              <p className="text-sm text-gray-600">
                Get faster access and a better experience with our mobile app
              </p>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Smartphone className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-sm text-gray-900">Fast & Reliable</p>
                <p className="text-xs text-gray-600">Quick access to predictions and live scores</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Download className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-sm text-gray-900">Works Offline</p>
                <p className="text-xs text-gray-600">Access your saved predictions anytime</p>
              </div>
            </div>
          </div>

          {isIOS ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-700 font-medium mb-2">
                To install on iOS:
              </p>
              <ol className="text-xs text-gray-600 space-y-2 list-decimal list-inside">
                <li>Tap the Share button <span className="font-semibold">(□↑)</span> at the bottom</li>
                <li>Select <span className="font-semibold">"Add to Home Screen"</span></li>
                <li>Tap <span className="font-semibold">"Add"</span> to confirm</li>
              </ol>
              <Button
                onClick={handleDismiss}
                variant="outline"
                className="w-full mt-4"
              >
                Got it
              </Button>
            </div>
          ) : deferredPrompt ? (
            <div className="flex gap-3">
              <Button
                onClick={handleDismiss}
                variant="outline"
                className="flex-1"
              >
                Maybe Later
              </Button>
              <Button
                onClick={handleInstall}
                className="flex-1 bg-gradient-to-r from-[#1e40af] to-[#1e3a8a] hover:from-[#1e3a8a] hover:to-[#1e40af]"
              >
                <Download className="h-4 w-4 mr-2" />
                Install App
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleDismiss}
              variant="outline"
              className="w-full"
            >
              Close
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

