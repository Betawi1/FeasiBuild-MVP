import Link from 'next/link';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 py-12 px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link href="/" className="text-emerald-400 hover:text-emerald-300 text-sm font-medium inline-flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to FeasiBuild
          </Link>
        </div>

        <h1 className="text-4xl font-bold text-white mb-8">Terms of Service</h1>
        <p className="text-slate-400 mb-8">Last updated: June 21, 2026</p>

        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-bold text-emerald-400 mb-4">1. Agreement to Terms</h2>
            <p className="text-slate-300 leading-relaxed">
              By accessing or using FeasiBuild&apos;s AI-powered feasibility study platform (the &quot;Service&quot;), you agree to be bound
              by these Terms of Service. If you disagree with any part of the terms, you may not access the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-emerald-400 mb-4">2. Description of Service</h2>
            <p className="text-slate-300 leading-relaxed mb-4">
              FeasiBuild provides an AI-powered platform for creating institutional-grade feasibility studies for real estate
              development projects. The Service includes:
            </p>
            <ul className="text-sm text-slate-400 space-y-1 ml-4 list-disc">
              <li>Financial modeling tools for operational and sale-stream developments</li>
              <li>AI-powered market research and analysis</li>
              <li>Automated feasibility study generation</li>
              <li>Scenario analysis and sensitivity testing</li>
              <li>Export capabilities (PDF, PowerPoint, Excel)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-emerald-400 mb-4">3. Accounts and Registration</h2>
            <p className="text-slate-300 leading-relaxed mb-4">
              To access certain features of the Service, you must register for an account. You agree to:
            </p>
            <ul className="text-sm text-slate-400 space-y-1 ml-4 list-disc">
              <li>Provide accurate, current, and complete account information</li>
              <li>Maintain and promptly update your account information</li>
              <li>Maintain the security of your password and accept all risks of unauthorized access</li>
              <li>Immediately notify us if you discover or otherwise suspect any security breaches</li>
              <li>You are responsible for all activities that occur under your account</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-emerald-400 mb-4">4. Subscription and Payment</h2>
            <p className="text-slate-300 leading-relaxed mb-4">
              FeasiBuild offers subscription plans with varying features and limitations:
            </p>
            <ul className="text-sm text-slate-400 space-y-1 ml-4 list-disc">
              <li>Fees are billed in advance on a monthly or annual basis</li>
              <li>Subscriptions automatically renew unless cancelled before the renewal date</li>
              <li>You can cancel your subscription at any time through your account settings</li>
              <li>Refunds are provided in accordance with our refund policy</li>
              <li>We reserve the right to modify pricing with 30 days&apos; notice</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-emerald-400 mb-4">5. Acceptable Use</h2>
            <p className="text-slate-300 leading-relaxed mb-4">
              You agree not to:
            </p>
            <ul className="text-sm text-slate-400 space-y-1 ml-4 list-disc">
              <li>Use the Service for any illegal purpose or in violation of any local, state, national, or international law</li>
              <li>Share your account credentials or allow others to access your account</li>
              <li>Attempt to gain unauthorized access to any part of the Service</li>
              <li>Use the Service to transmit malware, viruses, or any code of a destructive nature</li>
              <li>Interfere with or disrupt the integrity or performance of the Service</li>
              <li>Reverse engineer, decompile, or disassemble the Service</li>
              <li>Resell or commercially exploit access to the Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-emerald-400 mb-4">6. Intellectual Property</h2>
            <p className="text-slate-300 leading-relaxed mb-4">
              The Service and its original content, features, and functionality are owned by FeasiBuild and are protected
              by international copyright, trademark, patent, trade secret, and other intellectual property laws.
            </p>
            <p className="text-slate-300 leading-relaxed">
              You retain ownership of all data and content you submit to the Service. By using the Service, you grant
              FeasiBuild a license to use, store, and process your data solely for the purpose of providing the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-emerald-400 mb-4">7. Disclaimer of Warranties</h2>
            <p className="text-slate-300 leading-relaxed mb-4">
              THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED,
              INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR
              NON-INFRINGEMENT.
            </p>
            <p className="text-slate-300 leading-relaxed">
              WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR COMPLETELY SECURE, OR THAT THE
              FEASIBILITY STUDIES GENERATED WILL BE ACCURATE OR SUITABLE FOR YOUR SPECIFIC PURPOSES. YOU ARE RESPONSIBLE
              FOR VERIFYING ALL FINANCIAL PROJECTIONS AND SEEKING PROFESSIONAL ADVICE BEFORE MAKING INVESTMENT DECISIONS.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-emerald-400 mb-4">8. Limitation of Liability</h2>
            <p className="text-slate-300 leading-relaxed mb-4">
              IN NO EVENT SHALL FEASIBUILD, ITS DIRECTORS, EMPLOYEES, PARTNERS, AGENTS, SUPPLIERS, OR AFFILIATES BE LIABLE
              FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING WITHOUT LIMITATION, LOSS
              OF PROFITS, DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, RESULTING FROM YOUR ACCESS TO OR USE OF OR
              INABILITY TO ACCESS OR USE THE SERVICE.
            </p>
            <p className="text-slate-300 leading-relaxed">
              OUR TOTAL LIABILITY TO YOU FOR ANY CLAIM ARISING OUT OF OR RELATING TO THESE TERMS OR YOUR USE OF THE SERVICE
              SHALL NOT EXCEED THE AMOUNT YOU PAID TO FEASIBUILD IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-emerald-400 mb-4">9. Indemnification</h2>
            <p className="text-slate-300 leading-relaxed">
              You agree to defend, indemnify, and hold harmless FeasiBuild and its licensees and licensors from and against
              any claims, damages, obligations, losses, liabilities, costs or debt, and expenses arising from your use of
              and access to the Service, your violation of these Terms, or your violation of any third party&apos;s rights.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-emerald-400 mb-4">10. Termination</h2>
            <p className="text-slate-300 leading-relaxed mb-4">
              We may terminate or suspend your account and bar access to the Service immediately, without prior notice or
              liability, under our sole discretion, for any reason whatsoever, including without limitation if you breach
              these Terms.
            </p>
            <p className="text-slate-300 leading-relaxed">
              Upon termination, your right to use the Service will immediately cease. All provisions of these Terms which
              by their nature should survive termination shall survive termination, including ownership provisions, warranty
              disclaimers, and limitations of liability.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-emerald-400 mb-4">11. Changes to Terms</h2>
            <p className="text-slate-300 leading-relaxed">
              We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is
              material, we will provide at least 30 days&apos; notice prior to any new terms taking effect. What constitutes a
              material change will be determined at our sole discretion.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-emerald-400 mb-4">12. Governing Law</h2>
            <p className="text-slate-300 leading-relaxed">
              These Terms shall be governed and construed in accordance with the laws of [Your Jurisdiction], without regard
              to its conflict of law provisions. Any disputes relating to these Terms or the Service shall be subject to the
              exclusive jurisdiction of the courts located in [Your Location].
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-emerald-400 mb-4">13. Contact Information</h2>
            <p className="text-slate-300 leading-relaxed">
              If you have any questions about these Terms, please contact us at:{' '}
              <a href="mailto:legal@feasibuild.com" className="text-emerald-400 hover:text-emerald-300">
                legal@feasibuild.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
