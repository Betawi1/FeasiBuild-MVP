"use client";

import Link from "next/link";

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-300">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-emerald-400 hover:text-emerald-300"
        >
          ← Back to FeasiBuild
        </Link>

        <h1 className="mb-2 text-4xl font-bold text-white">Refund Policy</h1>
        <p className="mb-10 text-sm text-slate-500">Last Updated: August 24, 2026</p>

        <div className="space-y-8 leading-relaxed">
          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">
              Digital Products &amp; Limited Refunds
            </h2>
            <p>
              FeasiBuild provides digital services, platform access, and report credits.
              Due to the instant-delivery nature of digital goods, our refund policy is
              strictly limited.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">
              Professional Lifetime Access ($99)
            </h2>
            <ul className="list-disc space-y-2 pl-5 text-slate-300">
              <li>
                Refundable within 7 days of purchase ONLY IF no clean feasibility
                reports have been generated using the platform.
              </li>
              <li>
                After 7 days, or after generating your first clean report, the purchase
                is strictly non-refundable.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">
              Report Credits &amp; Unlimited Pack
            </h2>
            <ul className="list-disc space-y-2 pl-5 text-slate-300">
              <li>
                Report credits and the Unlimited Pack are non-refundable once purchased.
              </li>
              <li>
                If credits remain unused after their 12-month validity period, they
                expire. No partial refunds are issued for expired credits.
              </li>
              <li>
                Unused credits cannot be transferred, exchanged, or converted to cash.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">Exceptions</h2>
            <p className="mb-2">We may consider refunds only in cases of:</p>
            <ul className="list-disc space-y-2 pl-5 text-slate-300">
              <li>Proven duplicate charges (contact support immediately).</li>
              <li>
                Verifiable technical failures on our end that completely prevent report
                generation.
              </li>
              <li>
                Unauthorized charges (please report directly to PayPal).
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">
              How to Request a Refund
            </h2>
            <p className="mb-2">
              Email{" "}
              <a
                href="mailto:owner@feasibuild.app"
                className="text-emerald-400 hover:text-emerald-300"
              >
                owner@feasibuild.app
              </a>{" "}
              with:
            </p>
            <ul className="list-disc space-y-2 pl-5 text-slate-300">
              <li>The email address associated with your FeasiBuild account</li>
              <li>The PayPal Transaction ID (from your payment receipt)</li>
              <li>A clear reason for the refund request</li>
            </ul>
            <p className="mt-3">
              We aim to respond to all inquiries within 3 business days.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">PayPal Disputes</h2>
            <p>
              If you open a dispute or chargeback through PayPal before contacting us,
              your FeasiBuild account will be immediately suspended pending the
              resolution of the dispute.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
