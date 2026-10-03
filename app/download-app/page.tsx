'use client'

import { useState, useEffect } from 'react'
import { NavbarClient as Navbar } from '@/components/layout/navbar-client'
import { Footer } from '@/components/layout/footer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Download, Smartphone, Share2, Plus, Check, ArrowRight } from 'lucide-react'
import Image from 'next/image'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function DownloadAppPage() {
  const [isIOS, setIsIOS] = useState(false)
  const [isAndroid, setIsAndroid] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsStandalone(true)
      return
    }

    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    setIsIOS(iOS)

    // Detect Android
    const android = /Android/.test(navigator.userAgent)
    setIsAndroid(android)
  }, [])

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
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
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <section className="py-12 lg:py-20 bg-gradient-to-b from-[#1e40af] to-[#1e3a8a]">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <div className="flex justify-center mb-6">
                <div className="relative w-32 h-32 bg-white rounded-2xl p-4 shadow-2xl">
                  <Image
                    src="/logo.png"
                    alt="PredictSafe Logo"
                    width={128}
                    height={128}
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
              <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4">
                Download PredictSafe App
              </h1>
              <p className="text-xl text-blue-100 mb-8">
                Get faster access to predictions, live scores, and betting tips on your mobile device
              </p>
            </div>
          </div>
        </section>

        <section className="py-12 lg:py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              {isStandalone ? (
                <Card className="border-2 border-green-500">
                  <CardHeader>
                    <CardTitle className="text-center text-green-600 flex items-center justify-center gap-2">
                      <Check className="h-6 w-6" />
                      App Already Installed
                    </CardTitle>
                    <CardDescription className="text-center">
                      You're currently using the installed version of PredictSafe
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-center">
                    <p className="text-gray-600">
                      Enjoy the app experience! You can access all features directly from your home screen.
                    </p>
                  </CardContent>
                </Card>
              ) : isIOS ? (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-2xl text-center">Install on iOS</CardTitle>
                      <CardDescription className="text-center">
                        Follow these simple steps to add PredictSafe to your home screen
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-lg">
                          <div className="flex-shrink-0 w-12 h-12 bg-[#1e40af] rounded-full flex items-center justify-center text-white font-bold text-lg">
                            1
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg mb-2">Open Safari Share Menu</h3>
                            <p className="text-gray-600 mb-3">
                              Tap the <strong>Share button</strong> at the bottom of your Safari browser
                            </p>
                            <div className="flex items-center gap-2 text-[#1e40af] font-semibold">
                              <Share2 className="h-5 w-5" />
                              <span>Look for the Share icon (□↑)</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-lg">
                          <div className="flex-shrink-0 w-12 h-12 bg-[#1e40af] rounded-full flex items-center justify-center text-white font-bold text-lg">
                            2
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg mb-2">Select "Add to Home Screen"</h3>
                            <p className="text-gray-600 mb-3">
                              Scroll down in the share menu and tap <strong>"Add to Home Screen"</strong>
                            </p>
                            <div className="flex items-center gap-2 text-[#1e40af] font-semibold">
                              <Plus className="h-5 w-5" />
                              <span>Add to Home Screen option</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-lg">
                          <div className="flex-shrink-0 w-12 h-12 bg-[#1e40af] rounded-full flex items-center justify-center text-white font-bold text-lg">
                            3
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg mb-2">Confirm Installation</h3>
                            <p className="text-gray-600 mb-3">
                              Review the app name and icon, then tap <strong>"Add"</strong> in the top right corner
                            </p>
                            <div className="flex items-center gap-2 text-[#1e40af] font-semibold">
                              <Check className="h-5 w-5" />
                              <span>Tap Add to confirm</span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-8 p-6 bg-gradient-to-r from-[#1e40af] to-[#1e3a8a] rounded-lg text-white">
                          <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                            <Smartphone className="h-5 w-5" />
                            You're All Set!
                          </h3>
                          <p className="text-blue-100">
                            Once installed, you'll find the PredictSafe app on your home screen. 
                            Tap it anytime to access predictions, live scores, and more!
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Benefits of Installing</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <Smartphone className="h-5 w-5 text-[#1e40af]" />
                          </div>
                          <div>
                            <h4 className="font-semibold mb-1">Fast Access</h4>
                            <p className="text-sm text-gray-600">Quick launch from your home screen</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <Download className="h-5 w-5 text-[#1e40af]" />
                          </div>
                          <div>
                            <h4 className="font-semibold mb-1">Offline Access</h4>
                            <p className="text-sm text-gray-600">View saved predictions without internet</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <Check className="h-5 w-5 text-[#1e40af]" />
                          </div>
                          <div>
                            <h4 className="font-semibold mb-1">App-like Experience</h4>
                            <p className="text-sm text-gray-600">Full-screen, native app feel</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <ArrowRight className="h-5 w-5 text-[#1e40af]" />
                          </div>
                          <div>
                            <h4 className="font-semibold mb-1">Push Notifications</h4>
                            <p className="text-sm text-gray-600">Get alerts for new predictions</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : isAndroid ? (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-2xl text-center">Install on Android</CardTitle>
                      <CardDescription className="text-center">
                        Click the button below to install PredictSafe on your Android device
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="text-center space-y-6">
                      {deferredPrompt ? (
                        <Button
                          onClick={handleInstall}
                          size="lg"
                          className="bg-gradient-to-r from-[#1e40af] to-[#1e3a8a] hover:from-[#1e3a8a] hover:to-[#1e40af] text-white px-8 py-6 text-lg font-bold shadow-lg"
                        >
                          <Download className="h-6 w-6 mr-2" />
                          Install PredictSafe App
                        </Button>
                      ) : (
                        <div className="space-y-4">
                          <p className="text-gray-600">
                            Your browser will show an install prompt. If you don't see it, try:
                          </p>
                          <ol className="text-left max-w-md mx-auto space-y-2 text-gray-600">
                            <li className="flex items-start gap-2">
                              <span className="font-semibold">1.</span>
                              <span>Tap the menu (three dots) in your browser</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="font-semibold">2.</span>
                              <span>Look for "Install app" or "Add to Home screen"</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="font-semibold">3.</span>
                              <span>Tap it to install PredictSafe</span>
                            </li>
                          </ol>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Benefits of Installing</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <Smartphone className="h-5 w-5 text-[#1e40af]" />
                          </div>
                          <div>
                            <h4 className="font-semibold mb-1">Fast Access</h4>
                            <p className="text-sm text-gray-600">Quick launch from your home screen</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <Download className="h-5 w-5 text-[#1e40af]" />
                          </div>
                          <div>
                            <h4 className="font-semibold mb-1">Offline Access</h4>
                            <p className="text-sm text-gray-600">View saved predictions without internet</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <Check className="h-5 w-5 text-[#1e40af]" />
                          </div>
                          <div>
                            <h4 className="font-semibold mb-1">App-like Experience</h4>
                            <p className="text-sm text-gray-600">Full-screen, native app feel</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <ArrowRight className="h-5 w-5 text-[#1e40af]" />
                          </div>
                          <div>
                            <h4 className="font-semibold mb-1">Push Notifications</h4>
                            <p className="text-sm text-gray-600">Get alerts for new predictions</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-2xl text-center">Download PredictSafe</CardTitle>
                    <CardDescription className="text-center">
                      Visit this page on your mobile device to install the app
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-center space-y-4">
                    <p className="text-gray-600">
                      For the best experience, please open this page on your mobile device:
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <Smartphone className="h-8 w-8 text-[#1e40af] mx-auto mb-2" />
                        <p className="font-semibold">iOS Device</p>
                        <p className="text-sm text-gray-600">Use Safari browser</p>
                      </div>
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <Smartphone className="h-8 w-8 text-[#1e40af] mx-auto mb-2" />
                        <p className="font-semibold">Android Device</p>
                        <p className="text-sm text-gray-600">Use Chrome browser</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}

