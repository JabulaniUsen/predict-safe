import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'

export default function CookiesPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 bg-gray-50">
      <div className="container mx-auto px-4 py-8 lg:py-16 max-w-4xl">
        <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">Cookie Policy — PredictSafe</h1>
        <p className="text-sm text-gray-600 mb-8">Last Updated: {new Date().toLocaleDateString()}</p>

        <div className="prose prose-lg max-w-none space-y-6 text-gray-700">
          <section>
            <p className="text-base lg:text-lg leading-relaxed">
              This Cookie Policy explains how PredictSafe ("we", "our", "us") uses cookies and similar technologies on our website. By accessing or using PredictSafe.com, you agree to the use of cookies as described below.
            </p>
            <p className="text-base lg:text-lg leading-relaxed mt-4">
              If you do not agree, you may disable cookies through your browser settings (see Section 5).
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#1e40af] mt-8 mb-4">1. What Are Cookies?</h2>
            <p className="text-base lg:text-lg leading-relaxed mb-4">
              Cookies are small text files stored on your device (computer, tablet, mobile) when you visit a website. They help websites function properly, remember user preferences, and improve user experience.
            </p>
            <p className="text-base lg:text-lg leading-relaxed mb-4">Cookies may be:</p>
            <ul className="list-disc list-inside space-y-2 text-base lg:text-lg ml-4">
              <li>Session Cookies (deleted when you close your browser)</li>
              <li>Persistent Cookies (stored for a set period)</li>
              <li>First-Party Cookies (from PredictSafe)</li>
              <li>Third-Party Cookies (from external services we use)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#1e40af] mt-8 mb-4">2. How PredictSafe Uses Cookies</h2>
            <p className="text-base lg:text-lg leading-relaxed mb-4">We use cookies to:</p>
            
            <h3 className="text-xl font-semibold mt-6 mb-3">a. Improve Website Functionality</h3>
            <ul className="list-disc list-inside space-y-2 text-base lg:text-lg ml-4">
              <li>Enable essential features (login, navigation, subscriptions)</li>
              <li>Remember your country or currency preference</li>
              <li>Save your dashboard and account settings</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">b. Enhance User Experience</h3>
            <ul className="list-disc list-inside space-y-2 text-base lg:text-lg ml-4">
              <li>Keep you logged in</li>
              <li>Show relevant content</li>
              <li>Help pages load faster</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">c. Analytics & Performance</h3>
            <p className="text-base lg:text-lg leading-relaxed mb-4">
              We use cookies from analytics tools (such as Google Analytics) to understand how users interact with our website, including:
            </p>
            <ul className="list-disc list-inside space-y-2 text-base lg:text-lg ml-4">
              <li>Pages visited</li>
              <li>Traffic sources</li>
              <li>Time spent</li>
              <li>Device type</li>
            </ul>
            <p className="text-base lg:text-lg leading-relaxed mt-4">
              This helps us improve performance and optimize PredictSafe.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">d. Security & Fraud Prevention</h3>
            <p className="text-base lg:text-lg leading-relaxed mb-4">Cookies help us:</p>
            <ul className="list-disc list-inside space-y-2 text-base lg:text-lg ml-4">
              <li>Detect suspicious or unauthorized activity</li>
              <li>Protect user accounts</li>
              <li>Prevent spam and abuse</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">e. Marketing & Personalization</h3>
            <p className="text-base lg:text-lg leading-relaxed">
              Some cookies may display personalized promotions or reminders based on how you use the site.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#1e40af] mt-8 mb-4">3. Third-Party Cookies We Use</h2>
            <p className="text-base lg:text-lg leading-relaxed mb-4">PredictSafe may use trusted third-party services such as:</p>
            <ul className="list-disc list-inside space-y-2 text-base lg:text-lg ml-4">
              <li>Google Analytics (user behavior insights)</li>
              <li>Payment gateways (for secure transactions)</li>
              <li>Email and messaging providers (notifications, OTPs)</li>
            </ul>
            <p className="text-base lg:text-lg leading-relaxed mt-4">
              These services may place their own cookies. They do not receive sensitive account information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#1e40af] mt-8 mb-4">4. What Data Cookies Collect</h2>
            <p className="text-base lg:text-lg leading-relaxed mb-4">Cookies may collect non-personal data such as:</p>
            <ul className="list-disc list-inside space-y-2 text-base lg:text-lg ml-4">
              <li>IP address</li>
              <li>Device type and browser</li>
              <li>Pages visited</li>
              <li>Session duration</li>
              <li>Website interactions</li>
            </ul>
            <p className="text-base lg:text-lg leading-relaxed mt-4 font-semibold">
              Cookies do NOT collect your passwords, full payment details, or private messages.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#1e40af] mt-8 mb-4">5. How to Manage or Disable Cookies</h2>
            <p className="text-base lg:text-lg leading-relaxed mb-4">You may disable or control cookies through your browser settings.</p>
            <p className="text-base lg:text-lg leading-relaxed mb-4">Common browsers:</p>
            <ul className="list-disc list-inside space-y-2 text-base lg:text-lg ml-4">
              <li>Chrome: Settings → Privacy → Cookies</li>
              <li>Safari: Preferences → Privacy → Manage Website Data</li>
              <li>Firefox: Options → Privacy → Cookies</li>
              <li>Edge: Settings → Site Permissions → Cookies</li>
            </ul>
            <div className="mt-4 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded">
              <p className="text-base lg:text-lg leading-relaxed font-semibold text-yellow-800">
                Important: Disabling cookies may cause parts of PredictSafe to malfunction (e.g., login, subscriptions, dashboard access).
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#1e40af] mt-8 mb-4">6. Changes to This Cookie Policy</h2>
            <p className="text-base lg:text-lg leading-relaxed">
              We may update this policy occasionally to reflect changes in technology or regulations. Your continued use of PredictSafe confirms acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#1e40af] mt-8 mb-4">7. Contact Us</h2>
            <p className="text-base lg:text-lg leading-relaxed mb-4">If you have questions about cookies or data usage:</p>
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

