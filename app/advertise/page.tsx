import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function AdvertisePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 bg-gray-50">
        <div className="container mx-auto px-4 py-8 lg:py-16 max-w-4xl">
          <div className="text-center mb-8 lg:mb-12">
            <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">Advertise With Us</h1>
            <p className="text-lg lg:text-xl text-gray-600">Promote Your Brand to a Highly Engaged Sports Audience</p>
          </div>

          <div className="space-y-6">
            <Card className="border-2 border-gray-200 shadow-sm">
              <CardHeader className="p-5 border-b border-gray-200">
                <CardTitle className="text-lg font-semibold">Why Advertise on PredictSafe?</CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-[#1e40af] mb-2">🎯 Highly Targeted Audience</h3>
                  <p className="text-base text-gray-700 leading-relaxed">
                    Your ads reach users who are: Active football bettors, Engaged sports followers, Daily prediction seekers, Fans of analytics and betting tools. This makes ad conversions higher and more profitable.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-[#1e40af] mb-2">📈 High Daily Traffic</h3>
                  <p className="text-base text-gray-700 leading-relaxed">
                    PredictSafe receives consistent and growing daily visitors through: Free daily predictions, VIP plans, Live scores, Match tracking, Correct Score features. Your brand gets constant exposure.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-[#1e40af] mb-2">📍 Strategic Ad Placements</h3>
                  <p className="text-base text-gray-700 leading-relaxed mb-2">
                    Advertisers get access to premium visibility spots:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-base text-gray-700 ml-4">
                    <li>Homepage banners</li>
                    <li>VIP page placements</li>
                    <li>Live score page ads</li>
                    <li>User dashboard ads</li>
                    <li>Blog/Insights placements</li>
                    <li>Bottom screen fixed banners</li>
                    <li>Pop-up ads (optional)</li>
                  </ul>
                  <p className="text-base text-gray-700 leading-relaxed mt-2">
                    Your ad appears exactly where users are most active.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-[#1e40af] mb-2">💼 Perfect For</h3>
                  <p className="text-base text-gray-700 leading-relaxed mb-2">Businesses in:</p>
                  <ul className="list-disc list-inside space-y-1 text-base text-gray-700 ml-4">
                    <li>Sports betting</li>
                    <li>Betting tools & software</li>
                    <li>Football blogs</li>
                    <li>Tipster channels</li>
                    <li>Betting groups (Telegram & WhatsApp)</li>
                    <li>Sports merchandise</li>
                    <li>Payment processors</li>
                    <li>Entertainment & digital products</li>
                  </ul>
                  <p className="text-base text-gray-700 leading-relaxed mt-2">
                    If your audience is football or betting-related, this is your ideal platform.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-gray-200 shadow-sm">
              <CardHeader className="p-5 border-b border-gray-200">
                <CardTitle className="text-lg font-semibold">Ad Formats Available</CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                <p className="text-base text-gray-700 leading-relaxed mb-4">You can promote using:</p>
                <ul className="list-disc list-inside space-y-2 text-base text-gray-700 ml-4">
                  <li>Banner Ads (PNG/JPG/Static)</li>
                  <li>Animated Banners (GIF/MP4)</li>
                  <li>Text Advertisements</li>
                  <li>Sponsored Posts</li>
                  <li>Feature Promotions</li>
                  <li>Pinned ads on match pages</li>
                </ul>
                <p className="text-base text-gray-700 leading-relaxed mt-4">
                  We match your ad format to the best location for maximum results.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-gray-200 shadow-sm">
              <CardHeader className="p-5 border-b border-gray-200">
                <CardTitle className="text-lg font-semibold">Flexible Advertising Packages</CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                <p className="text-base text-gray-700 leading-relaxed mb-4">We offer:</p>
                <ul className="list-disc list-inside space-y-2 text-base text-gray-700 ml-4">
                  <li>Daily placements</li>
                  <li>Weekly placements</li>
                  <li>Monthly plans</li>
                  <li>Long-term sponsorship packages</li>
                </ul>
                <p className="text-base text-gray-700 leading-relaxed mt-4">
                  Prices vary based on traffic volume & ad size.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-[#1e40af] shadow-lg bg-gradient-to-br from-blue-50 to-white">
              <CardHeader className="p-5 border-b border-gray-200">
                <CardTitle className="text-lg font-semibold text-[#1e40af]">Ready to Advertise?</CardTitle>
                <CardDescription className="text-base">
                  Send us your ad materials and preferred placement.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5">
                <div className="space-y-4">
                  <div>
                    <p className="text-base text-gray-700 mb-2">Contact us:</p>
                    <ul className="list-none space-y-2 text-base text-gray-700">
                      <li>📧 Email: <a href="mailto:advert@predictsafe.com" className="text-[#1e40af] hover:underline font-semibold">advert@predictsafe.com</a></li>
                      <li>📧 Alternative: <a href="mailto:predictsafe@gmail.com" className="text-[#1e40af] hover:underline font-semibold">predictsafe@gmail.com</a></li>
                      <li>🌐 Or use our Contact Page on the website</li>
                    </ul>
                  </div>
                  <p className="text-base text-gray-700 leading-relaxed">
                    Our team will guide you through placement, pricing, and ad setup.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

