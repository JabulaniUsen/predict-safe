import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'

export default function DisclaimerPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 bg-gray-50">
      <div className="container mx-auto px-4 py-8 lg:py-16 max-w-4xl">
        <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">Disclaimer — PredictSafe</h1>
        <p className="text-sm text-gray-600 mb-8">Last Updated: {new Date().toLocaleDateString()}</p>

        <div className="prose prose-lg max-w-none space-y-6 text-gray-700">
          <section>
            <p className="text-base lg:text-lg leading-relaxed">
              The information, predictions, and services provided on PredictSafe ("we", "our", "us") are intended solely for informational and educational purposes. By using our platform, you acknowledge and agree to the terms contained in this Disclaimer.
            </p>
            <p className="text-base lg:text-lg leading-relaxed font-semibold mt-4">
              If you do not agree, please discontinue the use of PredictSafe immediately.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#1e40af] mt-8 mb-4">1. Not Betting Advice</h2>
            <p className="text-base lg:text-lg leading-relaxed mb-4">
              All content on PredictSafe — including predictions, correct scores, VIP tips, profit multiplier picks, analyses, and insights — is NOT gambling advice, financial advice, or a guarantee of outcomes.
            </p>
            <p className="text-base lg:text-lg leading-relaxed mb-4">PredictSafe does not:</p>
            <ul className="list-disc list-inside space-y-2 text-base lg:text-lg ml-4">
              <li>Encourage betting or gambling</li>
              <li>Guarantee 100% accuracy or profit</li>
              <li>Influence how users place bets</li>
              <li>Provide investment recommendations</li>
            </ul>
            <p className="text-base lg:text-lg leading-relaxed mt-4">
              Users choose to act on our information at their own discretion and risk.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#1e40af] mt-8 mb-4">2. No Guarantees of Profit</h2>
            <p className="text-base lg:text-lg leading-relaxed mb-4">
              Sports outcomes are naturally unpredictable. While PredictSafe uses data, research, and expert analysis to enhance accuracy:
            </p>
            <ul className="list-none space-y-2 text-base lg:text-lg">
              <li className="flex items-start gap-2">
                <span className="text-red-600 font-bold">➡️</span>
                <span>No prediction can be guaranteed 100% correct</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-600 font-bold">➡️</span>
                <span>Past performance does not guarantee future success</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-600 font-bold">➡️</span>
                <span>Losses may occur</span>
              </li>
            </ul>
            <p className="text-base lg:text-lg leading-relaxed mt-4 mb-4">PredictSafe is not responsible for:</p>
            <ul className="list-disc list-inside space-y-2 text-base lg:text-lg ml-4">
              <li>Financial loss</li>
              <li>Failed bets</li>
              <li>Misinterpreted information</li>
              <li>Decisions made based on our predictions</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#1e40af] mt-8 mb-4">3. Age Restriction</h2>
            <p className="text-base lg:text-lg leading-relaxed">
              PredictSafe is strictly for users 18+. By using our platform, you confirm that you meet the legal age requirement for accessing football prediction services in your country.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#1e40af] mt-8 mb-4">4. Legal Use & Jurisdiction</h2>
            <p className="text-base lg:text-lg leading-relaxed mb-4">Users are fully responsible for ensuring that:</p>
            <ul className="list-disc list-inside space-y-2 text-base lg:text-lg ml-4">
              <li>Football prediction services are legal in their country or jurisdiction</li>
              <li>They comply with all local laws regarding betting, predictions, or gaming</li>
              <li>They understand and accept all associated risks</li>
            </ul>
            <p className="text-base lg:text-lg leading-relaxed mt-4">
              PredictSafe is not liable for any user accessing the site illegally or against local regulations.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#1e40af] mt-8 mb-4">5. User Responsibility</h2>
            <p className="text-base lg:text-lg leading-relaxed mb-4">By using PredictSafe, you understand and accept that:</p>
            <ul className="list-disc list-inside space-y-2 text-base lg:text-lg ml-4">
              <li>Predictions are for guidance only</li>
              <li>You are solely responsible for all decisions you make</li>
              <li>Subscription fees are not conditional on winning or accuracy</li>
              <li>We are not liable for losses, damages, or emotional distress related to betting activities</li>
            </ul>
            <p className="text-base lg:text-lg leading-relaxed mt-4 font-semibold">
              Use PredictSafe responsibly and within your financial limits.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#1e40af] mt-8 mb-4">6. Accuracy & Availability</h2>
            <p className="text-base lg:text-lg leading-relaxed mb-4">While we strive to offer high-quality, well-researched predictions:</p>
            <p className="text-base lg:text-lg leading-relaxed mb-4">PredictSafe does not guarantee:</p>
            <ul className="list-disc list-inside space-y-2 text-base lg:text-lg ml-4">
              <li>Constant availability of services</li>
              <li>Error-free or uninterrupted access</li>
              <li>Timely updates in rare cases of technical issues</li>
              <li>That predictions will always be correct</li>
            </ul>
            <p className="text-base lg:text-lg leading-relaxed mt-4">
              Technical errors, delays, or server issues may occasionally occur.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#1e40af] mt-8 mb-4">7. External Links</h2>
            <p className="text-base lg:text-lg leading-relaxed mb-4">PredictSafe may contain links to third-party websites, including:</p>
            <ul className="list-disc list-inside space-y-2 text-base lg:text-lg ml-4">
              <li>Payment providers</li>
              <li>Social media</li>
              <li>Partner or affiliate platforms</li>
            </ul>
            <p className="text-base lg:text-lg leading-relaxed mt-4">
              We are not responsible for the content, policies, or actions of third-party sites. Users are encouraged to review those websites' policies before interacting with them.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#1e40af] mt-8 mb-4">8. Limitation of Liability</h2>
            <p className="text-base lg:text-lg leading-relaxed mb-4">To the maximum extent permitted by law:</p>
            <p className="text-base lg:text-lg leading-relaxed mb-4">PredictSafe, its owners, employees, and partners are not liable for:</p>
            <ul className="list-disc list-inside space-y-2 text-base lg:text-lg ml-4">
              <li>Financial loss</li>
              <li>Betting outcomes</li>
              <li>Incorrect predictions</li>
              <li>Technical problems</li>
              <li>User misunderstanding of information</li>
              <li>Reliance on predictions or content</li>
            </ul>
            <p className="text-base lg:text-lg leading-relaxed mt-4 font-semibold">
              Users access PredictSafe at their own sole risk.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#1e40af] mt-8 mb-4">9. Changes to This Disclaimer</h2>
            <p className="text-base lg:text-lg leading-relaxed">
              PredictSafe may update this Disclaimer at any time. Continued use of the platform after changes means you accept the updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#1e40af] mt-8 mb-4">10. Contact Us</h2>
            <p className="text-base lg:text-lg leading-relaxed mb-4">For questions or concerns regarding this Disclaimer:</p>
            <ul className="list-none space-y-2 text-base lg:text-lg">
              <li>📩 Support Email: <a href="mailto:predictsafe@gmail.com" className="text-[#1e40af] hover:underline">predictsafe@gmail.com</a></li>
            </ul>
          </section>
        </div>
      </div>
      </main>
      <Footer />
    </div>
  )
}

