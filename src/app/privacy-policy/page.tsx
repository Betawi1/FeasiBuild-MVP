import Link from 'next/link';

export default function PrivacyPolicy() {
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

        <h1 className="text-4xl font-bold text-white mb-8">Privacy Policy</h1>
        <p className="text-slate-400 mb-8">Last updated: June 21, 2026</p>

        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-bold text-emerald-400 mb-4">1. Introduction</h2>
            <p className="text-slate-300 leading-relaxed mb-4">
              FeasiBuild (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect,
              use, disclose, and safeguard your information when you use our AI-powered feasibility study platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-emerald-400 mb-4">2. Information We Collect</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-white font-semibold mb-2">Personal Information</h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                  We collect information you provide directly to us, including:
                </p>
                <ul className="text-sm text-slate-400 space-y-1 ml-4 list-disc mt-2">
                  <li>Name, email address, and contact information</li>
                  <li>Account credentials and authentication data</li>
                  <li>Payment and billing information</li>
                  <li>Project data and feasibility study inputs</li>
                </ul>
              </div>
              <div>
                <h3 className="text-white font-semibold mb-2">Usage Information</h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                  We automatically collect information about how you interact with our platform:
                </p>
                <ul className="text-sm text-slate-400 space-y-1 ml-4 list-disc mt-2">
                  <li>Device information, IP address, and browser type</li>
                  <li>Pages viewed, features used, and time spent</li>
                  <li>Project creation and modification activity</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-emerald-400 mb-4">3. How We Use Your Information</h2>
            <p className="text-slate-300 leading-relaxed mb-4">
              We use the information we collect to:
            </p>
            <ul className="text-sm text-slate-400 space-y-1 ml-4 list-disc">
              <li>Provide, maintain, and improve our feasibility study platform</li>
              <li>Process your transactions and send notifications</li>
              <li>Generate AI-powered feasibility studies and market research</li>
              <li>Respond to your comments, questions, and requests</li>
              <li>Monitor and analyze trends, usage, and activities</li>
              <li>Detect, investigate, and prevent fraudulent transactions and illegal activities</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-emerald-400 mb-4">4. AI and Third-Party Services</h2>
            <p className="text-slate-300 leading-relaxed mb-4">
              FeasiBuild uses AI services including puter.js and Qwen AI to generate feasibility studies and market research.
              When you use these features:
            </p>
            <ul className="text-sm text-slate-400 space-y-1 ml-4 list-disc">
              <li>Your project data may be processed by third-party AI providers</li>
              <li>Data is transmitted securely and in accordance with our security standards</li>
              <li>We require our AI providers to maintain confidentiality and security</li>
              <li>You can review puter.js&apos;s privacy policy at their website</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-emerald-400 mb-4">5. Data Security</h2>
            <p className="text-slate-300 leading-relaxed">
              We implement appropriate technical and organizational measures to protect your personal information, including
              encryption, secure servers, and regular security assessments. However, no method of transmission over the
              Internet is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-emerald-400 mb-4">6. Your Rights and Choices</h2>
            <p className="text-slate-300 leading-relaxed mb-4">
              You have the right to:
            </p>
            <ul className="text-sm text-slate-400 space-y-1 ml-4 list-disc">
              <li>Access, update, or delete your personal information</li>
              <li>Export your project data and feasibility studies</li>
              <li>Opt-out of marketing communications</li>
              <li>Deactivate your account</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-emerald-400 mb-4">7. Contact Us</h2>
            <p className="text-slate-300 leading-relaxed">
              If you have questions about this Privacy Policy, please contact us at:{' '}
              <a href="mailto:privacy@feasibuild.com" className="text-emerald-400 hover:text-emerald-300">
                privacy@feasibuild.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
