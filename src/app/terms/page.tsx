"use client";

import Link from "next/link";

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-300">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-emerald-400 hover:text-emerald-300"
        >
          ← Back to FeasiBuild
        </Link>

        <h1 className="mb-2 text-4xl font-bold text-white">Terms of Service</h1>
        <p className="mb-10 text-sm text-slate-500">Last Updated: August 24, 2026</p>

        <div className="space-y-8 leading-relaxed">
          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">1. Acceptance of Terms</h2>
            <p>By using FeasiBuild, you agree to these terms.</p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">2. Service Description</h2>
            <p>
              FeasiBuild is a feasibility analysis platform that generates AI-powered
              reports for real estate and development projects.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">3. Account &amp; Access</h2>
            <ul className="list-disc space-y-2 pl-5 text-slate-300">
              <li>Free Explorer accounts receive one (1) watermarked feasibility report.</li>
              <li>
                Professional accounts ($99 one-time) provide lifetime platform access and
                the ability to purchase report credits.
              </li>
              <li>
                Report credits and Unlimited Pack purchases are valid for 12 months from
                the date of purchase.
              </li>
              <li>
                You are responsible for maintaining the security of your account
                credentials.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">4. Payment &amp; Purchases</h2>
            <ul className="list-disc space-y-2 pl-5 text-slate-300">
              <li>All payments are processed securely via PayPal.</li>
              <li>
                Professional ($99): one-time payment for lifetime platform access, with no
                expiration.
              </li>
              <li>
                Credit packs (1, 10, 50, or 100 reports): one-time payment, valid for 12
                months from the purchase date.
              </li>
              <li>
                Unlimited Pack ($2,400): one-time payment, valid for 12 months of
                unlimited reports, and includes white-label logo branding.
              </li>
              <li>
                Only one active credit pack is allowed at a time. New pack purchases
                unlock only when your current credit balance reaches 0, or your current
                pack expires.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">
              5. Data &amp; Privacy (BYO-Infrastructure)
            </h2>
            <ul className="list-disc space-y-2 pl-5 text-slate-300">
              <li>
                FeasiBuild operates strictly on a Bring-Your-Own (BYO) Infrastructure
                model.
              </li>
              <li>
                All project data is encrypted and stored exclusively in your own Puter
                cloud account.
              </li>
              <li>
                FeasiBuild does not store, access, view, or retain your project data on
                our servers.
              </li>
              <li>
                You are solely responsible for the security and access of your Puter
                account.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">6. Acceptable Use</h2>
            <p className="mb-2">You agree not to:</p>
            <ul className="list-disc space-y-2 pl-5 text-slate-300">
              <li>Use the service for illegal activities.</li>
              <li>Attempt to reverse-engineer the platform.</li>
              <li>Share credentials or resell access to third parties.</li>
              <li>
                Use the service to generate reports for others without proper licensing.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">
              7. Limitation of Liability
            </h2>
            <p>
              FeasiBuild provides analysis tools and AI-generated reports &quot;as-is.&quot; We do
              not guarantee investment outcomes, financial returns, or the accuracy of
              third-party market data. Users are strictly responsible for conducting
              their own professional due diligence before making any financial or real
              estate decisions.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">8. Termination</h2>
            <p>
              We reserve the right to suspend or terminate accounts that violate these
              terms.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">9. Changes to Terms</h2>
            <p>
              We may update these terms from time to time. Continued use of the platform
              constitutes acceptance of the revised terms.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">10. Contact</h2>
            <p>
              For any questions regarding these terms, please contact us at{" "}
              <a
                href="mailto:owner@feasibuild.app"
                className="text-emerald-400 hover:text-emerald-300"
              >
                owner@feasibuild.app
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
