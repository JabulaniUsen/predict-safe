import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'

export default function RefundPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 bg-gray-50">
      <div className="container mx-auto px-4 py-8 lg:py-16 max-w-4xl">
        <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">Refund Policy — PredictSafe</h1>
        <p className="text-sm text-gray-600 mb-8">Last Updated: {new Date().toLocaleDateString()}</p>

        <div className="prose prose-lg max-w-none space-y-6 text-gray-700">
          <section>
            <p className="text-base lg:text-lg leading-relaxed">
              At PredictSafe, we are committed to delivering high-quality, data-driven football predictions and premium betting intelligence. Because our services provide instant digital access to valuable information, our refund policy is structured to ensure fairness, transparency, and user protection.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#1e40af] mt-8 mb-4">1. No Refund on Delivered Digital Services</h2>
            <p className="text-base lg:text-lg leading-relaxed mb-4">
              All PredictSafe plans (VIP Packages, Predictions, Subscriptions, and Digital Features) become non-refundable once:
            </p>
            <ul className="list-disc list-inside space-y-2 text-base lg:text-lg ml-4">
              <li>Access to predictions has been granted, or</li>
              <li>A subscription has been activated on a user's account.</li>
            </ul>
            <p className="text-base lg:text-lg leading-relaxed mt-4">
              This is because digital content cannot be returned once accessed.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#1e40af] mt-8 mb-4">2. Duplicate Payments / Accidental Overcharge</h2>
            <p className="text-base lg:text-lg leading-relaxed mb-4">If you are charged twice for the same plan or payment method error occurs:</p>
            <ul className="list-none space-y-2 text-base lg:text-lg">
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✔</span>
                <span>We will review the transaction.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✔</span>
                <span>Once confirmed, a refund will be issued within 3–7 business days.</span>
              </li>
            </ul>
            <p className="text-base lg:text-lg leading-relaxed mt-4">
              Proof of payment may be required.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#1e40af] mt-8 mb-4">3. Failed Subscription Activation</h2>
            <p className="text-base lg:text-lg leading-relaxed mb-4">If a user pays but the system fails to activate their plan:</p>
            <ul className="list-none space-y-2 text-base lg:text-lg">
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✔</span>
                <span>The PredictSafe support team will manually verify the payment.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✔</span>
                <span>The plan will be activated immediately after confirmation.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✔</span>
                <span>If activation is not possible, a full refund may be granted.</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#1e40af] mt-8 mb-4">4. Unauthorized Transactions</h2>
            <p className="text-base lg:text-lg leading-relaxed mb-4">If you notice a payment on your account that you did not authorize:</p>
            <ul className="list-none space-y-2 text-base lg:text-lg">
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✔</span>
                <span>Report it within 24 hours.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✔</span>
                <span>We will investigate and take appropriate action.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✔</span>
                <span>If confirmed, a refund will be issued.</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#1e40af] mt-8 mb-4">5. Network or Local Payment Issues</h2>
            <p className="text-base lg:text-lg leading-relaxed mb-4">PredictSafe is not responsible for:</p>
            <ul className="list-disc list-inside space-y-2 text-base lg:text-lg ml-4">
              <li>Network failures</li>
              <li>Bank delays</li>
              <li>Payment gateway downtime</li>
              <li>User mistakes caused by poor connectivity</li>
              <li>Incorrect payment details entered by the user</li>
            </ul>
            <p className="text-base lg:text-lg leading-relaxed mt-4">
              However, our team will assist you in resolving the issue with the payment provider.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#1e40af] mt-8 mb-4">6. Non-Performance-Based Complaints</h2>
            <p className="text-base lg:text-lg leading-relaxed mb-4">Refunds will not be granted for reasons such as:</p>
            <ul className="list-disc list-inside space-y-2 text-base lg:text-lg ml-4">
              <li>Losses from betting slips</li>
              <li>Wrong personal predictions</li>
              <li>User disagreement with match outcomes</li>
              <li>Perceived value or "dislike" of results</li>
              <li>Change of mind after access has been granted</li>
            </ul>
            <p className="text-base lg:text-lg leading-relaxed mt-4">
              Predictions are based on data and analysis, not guaranteed outcomes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#1e40af] mt-8 mb-4">7. Subscription Duration</h2>
            <p className="text-base lg:text-lg leading-relaxed">
              All subscription periods begin counting from the moment the plan is activated — either automatically or manually after verification. Users are responsible for monitoring their subscription timeline.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#1e40af] mt-8 mb-4">8. Contact for Refund or Payment Issues</h2>
            <p className="text-base lg:text-lg leading-relaxed mb-4">If you have questions or need assistance, contact our support team:</p>
            <ul className="list-none space-y-2 text-base lg:text-lg">
              <li>📧 Support Email: <a href="mailto:predictsafe@gmail.com" className="text-[#1e40af] hover:underline">predictsafe@gmail.com</a></li>
            </ul>
            <p className="text-base lg:text-lg leading-relaxed mt-4">
              Our team responds within 24 hours.
            </p>
          </section>

          <section className="mt-8 p-4 bg-gray-50 rounded-lg border-l-4 border-[#1e40af]">
            <h2 className="text-xl font-bold text-[#1e40af] mb-2">Final Note</h2>
            <p className="text-base lg:text-lg leading-relaxed">
              By subscribing to any PredictSafe service, you agree to this Refund Policy. We are dedicated to providing value, clarity, and a trustworthy experience throughout your time with us.
            </p>
          </section>
        </div>
      </div>
      </main>
      <Footer />
    </div>
  )
}

