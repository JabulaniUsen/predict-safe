import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function FAQPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 bg-gray-50">
        <div className="container mx-auto px-4 py-8 lg:py-16 max-w-4xl">
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">Frequently Asked Questions (FAQ)</h1>
          <p className="text-base lg:text-lg text-gray-600 mb-8">Everything you need to know about PredictSafe and our premium plans.</p>

          <div className="space-y-6">
            <Card className="border-2 border-gray-200 shadow-sm">
              <CardHeader className="p-5 border-b border-gray-200">
                <CardTitle className="text-lg font-semibold">1. What is PredictSafe?</CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                <p className="text-base lg:text-lg text-gray-700 leading-relaxed">
                  PredictSafe is a premium football prediction platform delivering highly analyzed sports predictions using advanced statistics, AI models, and professional expert review. We offer four major VIP packages designed for different betting strategies.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-gray-200 shadow-sm">
              <CardHeader className="p-5 border-b border-gray-200">
                <CardTitle className="text-lg font-semibold">2. What VIP Packages do you offer?</CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div>
                  <p className="font-semibold text-base lg:text-lg mb-2">⭐ 1. Standard Package</p>
                  <p className="text-sm lg:text-base text-gray-700 mb-2">A balanced plan for users who want simple, reliable daily predictions.</p>
                  <p className="text-sm lg:text-base text-gray-600">What it includes: Daily football predictions, Select markets (Banker, Over/Under, BTTS, GG/NG, etc.), Covers major leagues worldwide, Beginner-friendly and affordable.</p>
                </div>
                <div>
                  <p className="font-semibold text-base lg:text-lg mb-2">⭐ 2. Daily 2 Odds Package</p>
                  <p className="text-sm lg:text-base text-gray-700 mb-2">Designed for users who want steady profit growth with minimal risk.</p>
                  <p className="text-sm lg:text-base text-gray-600">What it includes: Daily predictions of 2+ total odds, Expert-analyzed picks, Focus on safety and consistency, Stable results ideal for small bankroll growth.</p>
                </div>
                <div>
                  <p className="font-semibold text-base lg:text-lg mb-2">⭐ 3. Profit Multiplier Plan</p>
                  <p className="text-sm lg:text-base text-gray-700 mb-2">Our high-odds, high-value VIP plan for aggressive bettors.</p>
                  <p className="text-sm lg:text-base text-gray-600">What it includes: Carefully selected accumulator predictions, High-value odds with strong accuracy, Expert breakdown and reasoning, Access to historical win records, Priority support for subscribers. Perfect for users looking for big winning potential.</p>
                </div>
                <div>
                  <p className="font-semibold text-base lg:text-lg mb-2">⭐ 4. Correct Score Premium Package (Special Plan)</p>
                  <p className="text-sm lg:text-base text-gray-700 mb-2">Our most exclusive plan with the highest accuracy.</p>
                  <p className="text-sm lg:text-base text-gray-600">What it includes: Correct Score predictions with up to 95% accuracy, Deep statistical modeling + expert manual review, Limited-access premium picks, Covers Yesterday / Today / Tomorrow filters. Reserved only for serious bettors seeking precision. This is PredictSafe's most premium and most limited service.</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-gray-200 shadow-sm">
              <CardHeader className="p-5 border-b border-gray-200">
                <CardTitle className="text-lg font-semibold">3. How accurate are your predictions?</CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                <p className="text-base lg:text-lg text-gray-700 leading-relaxed mb-4">Each plan has its own accuracy rating:</p>
                <ul className="list-disc list-inside space-y-2 text-base lg:text-lg text-gray-700 ml-4">
                  <li>Standard Package: 80–85%</li>
                  <li>Daily 2 Odds Package: 85–90%</li>
                  <li>Profit Multiplier: 80–90% depending on accumulator size</li>
                  <li>Correct Score Premium: Up to 95% accuracy</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2 border-gray-200 shadow-sm">
              <CardHeader className="p-5 border-b border-gray-200">
                <CardTitle className="text-lg font-semibold">4. How do I subscribe to a VIP plan?</CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                <ol className="list-decimal list-inside space-y-2 text-base lg:text-lg text-gray-700 ml-4">
                  <li>Create an account</li>
                  <li>Go to VIP Packages</li>
                  <li>Choose your plan</li>
                  <li>Select duration (1 Week or 1 Month)</li>
                  <li>Make payment</li>
                  <li>Access predictions instantly</li>
                </ol>
              </CardContent>
            </Card>

            <Card className="border-2 border-gray-200 shadow-sm">
              <CardHeader className="p-5 border-b border-gray-200">
                <CardTitle className="text-lg font-semibold">5. When are predictions uploaded?</CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                <ul className="list-disc list-inside space-y-2 text-base lg:text-lg text-gray-700 ml-4">
                  <li>Standard: Daily</li>
                  <li>Daily 2 Odds: Daily</li>
                  <li>Profit Multiplier: Uploaded when high-value opportunities appear</li>
                  <li>Correct Score: Uploaded based on expert verification schedule</li>
                </ul>
                <p className="text-base lg:text-lg text-gray-700 mt-4">You will see updates directly in your dashboard.</p>
              </CardContent>
            </Card>

            <Card className="border-2 border-gray-200 shadow-sm">
              <CardHeader className="p-5 border-b border-gray-200">
                <CardTitle className="text-lg font-semibold">6. What currencies do you support?</CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                <p className="text-base lg:text-lg text-gray-700 leading-relaxed">
                  Your package prices automatically adjust based on your selected country: If local payment methods exist → Display local currency. If not → Default to USD.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-gray-200 shadow-sm">
              <CardHeader className="p-5 border-b border-gray-200">
                <CardTitle className="text-lg font-semibold">7. What payment methods do you accept?</CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                <p className="text-base lg:text-lg text-gray-700 leading-relaxed mb-4">Depends on admin configuration:</p>
                <ul className="list-disc list-inside space-y-2 text-base lg:text-lg text-gray-700 ml-4">
                  <li>Cards</li>
                  <li>Bank Transfer</li>
                  <li>Mobile Money</li>
                  <li>USDT</li>
                  <li>Paystack / Flutterwave</li>
                  <li>More options based on your country</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2 border-gray-200 shadow-sm">
              <CardHeader className="p-5 border-b border-gray-200">
                <CardTitle className="text-lg font-semibold">8. Do you offer free predictions?</CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                <p className="text-base lg:text-lg text-gray-700 leading-relaxed">
                  Yes. We upload free daily predictions available to all users.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-gray-200 shadow-sm">
              <CardHeader className="p-5 border-b border-gray-200">
                <CardTitle className="text-lg font-semibold">9. Can I access predictions immediately after payment?</CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                <p className="text-base lg:text-lg text-gray-700 leading-relaxed">
                  Yes, all predictions unlock automatically except when custom logic is enforced (e.g., Correct Score rules).
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-gray-200 shadow-sm">
              <CardHeader className="p-5 border-b border-gray-200">
                <CardTitle className="text-lg font-semibold">10. Can I share my subscription with others?</CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                <p className="text-base lg:text-lg text-gray-700 leading-relaxed">
                  No. Sharing accounts may result in automatic suspension.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-gray-200 shadow-sm">
              <CardHeader className="p-5 border-b border-gray-200">
                <CardTitle className="text-lg font-semibold">11. Do I get notifications when new predictions drop?</CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                <p className="text-base lg:text-lg text-gray-700 leading-relaxed">
                  Yes. You'll receive in-app notifications or dashboard alerts.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-gray-200 shadow-sm">
              <CardHeader className="p-5 border-b border-gray-200">
                <CardTitle className="text-lg font-semibold">12. Is PredictSafe a betting platform?</CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                <p className="text-base lg:text-lg text-gray-700 leading-relaxed">
                  No. PredictSafe provides prediction and analysis only. We do not place bets or handle betting for users.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-gray-200 shadow-sm">
              <CardHeader className="p-5 border-b border-gray-200">
                <CardTitle className="text-lg font-semibold">13. Do you offer an affiliate program?</CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                <p className="text-base lg:text-lg text-gray-700 leading-relaxed">
                  Yes. Users can earn commissions by referring new subscribers. Affiliate links can be managed inside the user dashboard.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-gray-200 shadow-sm">
              <CardHeader className="p-5 border-b border-gray-200">
                <CardTitle className="text-lg font-semibold">14. Do you guarantee winnings?</CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                <p className="text-base lg:text-lg text-gray-700 leading-relaxed">
                  No. We guarantee high-quality analysis, not fixed outcomes. Betting always involves risk.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-gray-200 shadow-sm">
              <CardHeader className="p-5 border-b border-gray-200">
                <CardTitle className="text-lg font-semibold">15. Is my data secure?</CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                <p className="text-base lg:text-lg text-gray-700 leading-relaxed">
                  Yes. PredictSafe uses strong encryption and never sells user data.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-gray-200 shadow-sm">
              <CardHeader className="p-5 border-b border-gray-200">
                <CardTitle className="text-lg font-semibold">16. What if I have issues with my account?</CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                <p className="text-base lg:text-lg text-gray-700 leading-relaxed">
                  You can contact support via WhatsApp, email, Telegram, or in-app help.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

