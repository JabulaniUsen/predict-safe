import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 bg-gray-50">
      <div className="container mx-auto px-4 py-8 lg:py-16 max-w-4xl">
        <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">Privacy Policy — PredictSafe</h1>
        <p className="text-sm text-gray-600 mb-8">Last Updated: {new Date().toLocaleDateString()}</p>

        <div className="prose prose-lg max-w-none space-y-6 text-gray-700">
          <section>
            <p className="text-base lg:text-lg leading-relaxed">
              PredictSafe ("we", "our", "us") is committed to protecting your personal information and ensuring transparency in how we collect, use, store, and safeguard your data. By using our website, mobile app, or services ("Services"), you consent to the practices outlined in this Privacy Policy.
            </p>
            <p className="text-base lg:text-lg leading-relaxed font-semibold mt-4">
              If you do not agree with our Privacy Policy, please discontinue using PredictSafe.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#1e40af] mt-8 mb-4">1. Information We Collect</h2>
            <p className="text-base lg:text-lg leading-relaxed mb-4">We may collect the following categories of information:</p>
            
            <h3 className="text-xl font-semibold mt-6 mb-3">1.1. Personal Information Provided by You</h3>
            <ul className="list-disc list-inside space-y-2 text-base lg:text-lg ml-4">
              <li>Full name</li>
              <li>Email address</li>
              <li>Phone number / WhatsApp number</li>
              <li>Country and currency preference</li>
              <li>Payment details (handled securely by third-party processors)</li>
              <li>Account username and password</li>
              <li>Support or inquiry messages</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">1.2. Automatically Collected Information</h3>
            <p className="text-base lg:text-lg leading-relaxed mb-4">When you access PredictSafe, we automatically collect:</p>
            <ul className="list-disc list-inside space-y-2 text-base lg:text-lg ml-4">
              <li>Device information (mobile, tablet, browser type)</li>
              <li>IP address & approximate location</li>
              <li>Usage analytics (pages visited, features used, time spent)</li>
              <li>Cookies and session data</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">1.3. Payment Information</h3>
            <p className="text-base lg:text-lg leading-relaxed">
              We do not store card details. All payments are processed through secure third-party gateways (e.g., Paystack, Flutterwave, PayPal, Stripe, etc.). These providers may store your payment information according to their own privacy policies.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#1e40af] mt-8 mb-4">2. How We Use Your Information</h2>
            <p className="text-base lg:text-lg leading-relaxed mb-4">PredictSafe uses your information to:</p>
            
            <h3 className="text-xl font-semibold mt-6 mb-3">2.1. Provide and Improve Services</h3>
            <ul className="list-disc list-inside space-y-2 text-base lg:text-lg ml-4">
              <li>Deliver predictions, subscriptions, and premium content</li>
              <li>Personalize the dashboard and user experience</li>
              <li>Improve accuracy, speed, and interface usability</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">2.2. Communication</h3>
            <ul className="list-disc list-inside space-y-2 text-base lg:text-lg ml-4">
              <li>Send account updates</li>
              <li>Send subscription reminders</li>
              <li>Notify you when predictions are updated</li>
              <li>Provide customer support</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">2.3. Payments & Verification</h3>
            <ul className="list-disc list-inside space-y-2 text-base lg:text-lg ml-4">
              <li>Process subscription payments</li>
              <li>Verify successful transactions</li>
              <li>Activate premium plans</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">2.4. Security & Compliance</h3>
            <ul className="list-disc list-inside space-y-2 text-base lg:text-lg ml-4">
              <li>Detect fraud or suspicious activity</li>
              <li>Protect user accounts</li>
              <li>Comply with legal requirements</li>
            </ul>

            <p className="text-base lg:text-lg leading-relaxed mt-4 font-semibold">
              We do not sell, rent, or trade your personal information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#1e40af] mt-8 mb-4">3. Cookies & Tracking Technologies</h2>
            <p className="text-base lg:text-lg leading-relaxed mb-4">PredictSafe uses cookies to:</p>
            <ul className="list-disc list-inside space-y-2 text-base lg:text-lg ml-4">
              <li>Keep you logged in</li>
              <li>Remember your preferences</li>
              <li>Improve speed and performance</li>
              <li>Track analytics to improve the platform</li>
            </ul>
            <p className="text-base lg:text-lg leading-relaxed mt-4">
              You may disable cookies in your browser, but some features may stop functioning correctly.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#1e40af] mt-8 mb-4">4. Sharing of Information</h2>
            <p className="text-base lg:text-lg leading-relaxed mb-4">We only share your information with trusted third parties when necessary:</p>
            
            <h3 className="text-xl font-semibold mt-6 mb-3">4.1. Payment Processors</h3>
            <p className="text-base lg:text-lg leading-relaxed">To handle secure transactions.</p>

            <h3 className="text-xl font-semibold mt-6 mb-3">4.2. Analytics Providers</h3>
            <p className="text-base lg:text-lg leading-relaxed">To track platform performance and improve features.</p>

            <h3 className="text-xl font-semibold mt-6 mb-3">4.3. Customer Support Tools</h3>
            <p className="text-base lg:text-lg leading-relaxed">For WhatsApp, email support, or messaging integration.</p>

            <h3 className="text-xl font-semibold mt-6 mb-3">4.4. Legal Requirements</h3>
            <p className="text-base lg:text-lg leading-relaxed mb-4">We may disclose your data if required by:</p>
            <ul className="list-disc list-inside space-y-2 text-base lg:text-lg ml-4">
              <li>Law enforcement</li>
              <li>Government authorities</li>
              <li>Legal obligations</li>
            </ul>

            <p className="text-base lg:text-lg leading-relaxed mt-4 font-semibold">
              PredictSafe does not sell personal information to marketers or advertisers.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#1e40af] mt-8 mb-4">5. Data Security</h2>
            <p className="text-base lg:text-lg leading-relaxed mb-4">We implement strict security measures to protect your data:</p>
            <ul className="list-disc list-inside space-y-2 text-base lg:text-lg ml-4">
              <li>Encrypted communication (HTTPS & SSL)</li>
              <li>Secure database storage</li>
              <li>Limited internal access</li>
              <li>Two-step verification for admin accounts</li>
              <li>Continuous monitoring for suspicious activity</li>
            </ul>
            <p className="text-base lg:text-lg leading-relaxed mt-4">
              While no system is 100% secure, we take every reasonable step to protect your information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#1e40af] mt-8 mb-4">6. Data Retention</h2>
            <p className="text-base lg:text-lg leading-relaxed mb-4">We retain your information only for as long as needed to:</p>
            <ul className="list-disc list-inside space-y-2 text-base lg:text-lg ml-4">
              <li>Provide services</li>
              <li>Maintain your account</li>
              <li>Meet legal or financial obligations</li>
            </ul>
            <p className="text-base lg:text-lg leading-relaxed mt-4">
              If you delete your account, your data will be permanently removed within 30 days, except for information required by law.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#1e40af] mt-8 mb-4">7. User Rights</h2>
            <p className="text-base lg:text-lg leading-relaxed mb-4">Depending on your country, you may have the right to:</p>
            <ul className="list-none space-y-2 text-base lg:text-lg">
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✔</span>
                <span>Access your personal information</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✔</span>
                <span>Request correction of inaccurate data</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✔</span>
                <span>Request deletion of your account</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✔</span>
                <span>Withdraw consent to marketing messages</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✔</span>
                <span>Request a copy of your data (data portability)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✔</span>
                <span>Object to how your data is being used</span>
              </li>
            </ul>
            <p className="text-base lg:text-lg leading-relaxed mt-4">
              To request any of these rights, contact us using the details at the bottom of this page.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#1e40af] mt-8 mb-4">8. Children's Privacy</h2>
            <p className="text-base lg:text-lg leading-relaxed">
              PredictSafe is not intended for users under 18. We do not knowingly collect information from minors. If a minor registers, the account will be deleted immediately.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#1e40af] mt-8 mb-4">9. Third-Party Links</h2>
            <p className="text-base lg:text-lg leading-relaxed">
              PredictSafe may contain links to third-party websites (Telegram, Facebook, payment gateways, etc.). We are not responsible for the privacy practices of these external sites. We advise users to review third-party policies before sharing any information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#1e40af] mt-8 mb-4">10. Changes to This Privacy Policy</h2>
            <p className="text-base lg:text-lg leading-relaxed">
              We may update this Privacy Policy occasionally. Any changes become effective immediately upon posting. We encourage you to review this page regularly.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#1e40af] mt-8 mb-4">11. Contact Us</h2>
            <p className="text-base lg:text-lg leading-relaxed mb-4">For questions, concerns, or requests regarding your data:</p>
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

