import Image from 'next/image';
import Link from 'next/link';

export default function FounderPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-300">
      {/* Navigation */}
      <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold">
            <span className="text-white">Feasi</span>
            <span className="text-emerald-400">Build</span>
          </Link>
          <div className="hidden md:flex items-center gap-6">
            <Link href="/#features" className="hover:text-emerald-400 transition">Features</Link>
            <Link href="/#how-it-works" className="hover:text-emerald-400 transition">How It Works</Link>
            <Link href="/comparison" className="hover:text-emerald-400 transition">Comparison</Link>
            <Link href="/dashboard" className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition">
              Dashboard
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
          {/* Profile Image Placeholder */}
          <div className="lg:col-span-1">
            <div className="aspect-square rounded-2xl bg-gradient-to-br from-emerald-500 to-blue-600 p-1">
              <div className="w-full h-full rounded-2xl bg-slate-900 flex items-center justify-center">
                <div className="text-center p-8">
                  <div className="relative w-48 h-48 mx-auto mb-6 rounded-full border-4 border-slate-700 overflow-hidden shadow-2xl">
                    <Image
                      src="/images/rashdan-profile.jpg"
                      alt="Mohd Rashdan Bin Ibrahim"
                      fill
                      className="object-cover"
                      priority
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bio Content */}
          <div className="lg:col-span-2">
            <h1 className="text-4xl font-bold text-white mb-2">Mohd Rashdan Bin Ibrahim</h1>
            <p className="text-xl text-emerald-400 mb-6">Founder & CEO, FeasiBuild</p>

            <div className="space-y-4 mb-8 text-lg leading-relaxed">
              <p className="text-slate-300">
                With over <strong className="text-white">30 years</strong> of experience structuring billions in real estate 
                transactions across the Middle East and Southeast Asia, I built FeasiBuild to solve a problem I faced 
                throughout my career: <strong className="text-white">feasibility studies took too long, cost too much, 
                and created barriers between great ideas and bankable projects.</strong>
              </p>
              <p className="text-slate-300">
                From structuring a <strong className="text-emerald-400">USD 100 million Shari'ah-compliant construction 
                finance fund in Saudi Arabia</strong> to securing <strong className="text-emerald-400">AED 150 million 
                in financing for Dubai developments</strong>, I've navigated the complexities of institutional real 
                estate finance across Dubai, Abu Dhabi, Saudi Arabia, Kuwait, Oman, Malaysia, and beyond.
              </p>
              <p className="text-slate-300">
                FeasiBuild combines this deep institutional expertise with cutting-edge AI to make professional-grade 
                feasibility studies accessible to developers, investors, and consultants worldwide—delivering in 
                minutes what used to take weeks.
              </p>
            </div>

            {/* Key Achievements */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                { val: '30+', label: 'Years Experience' },
                { val: '$2B+', label: 'Deals Structured' },
                { val: '7+', label: 'Countries' },
                { val: '50+', label: 'Major Projects' }
              ].map((stat, i) => (
                <div key={i} className="bg-slate-900 rounded-lg p-4 border border-slate-800 text-center">
                  <div className="text-2xl font-bold text-emerald-400 mb-1">{stat.val}</div>
                  <div className="text-xs text-slate-400 uppercase tracking-wide">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-4">
              <a 
                href="https://www.linkedin.com/in/morib" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#0077b5] text-white rounded-lg hover:bg-[#006396] transition font-semibold"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
                View Full LinkedIn Profile
              </a>
              <Link href="/waitlist" className="px-6 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition font-semibold">
                Try FeasiBuild
              </Link>
            </div>
          </div>
        </div>

        {/* Notable Transactions */}
        <div className="mt-20">
          <h2 className="text-3xl font-bold text-white mb-12 text-center">Notable Transactions & Projects</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto">
            {[
              { amount: 'AED 670M', project: 'The Lagoon Master Development (Dubai)', desc: 'Directed overall development management for a massive mixed-use man-made island project comprising three hotels, an office tower, and a residential tower. Led a complex AED 670M investment recovery and property swap exercise following the 2008 financial crisis.' },
              { amount: 'USD 100M', project: 'Shari\'ah Construction Fund', desc: 'Structured a construction finance fund for middle-income housing development in Saudi Arabia.' },
              { amount: 'AED 500M', project: 'Abu Dhabi REIT', desc: 'Structured a Real Estate Investment Trust for a major healthcare company in Abu Dhabi.' },
              { amount: 'AED 150M', project: 'UAE Bank Financing', desc: 'Secured end-financing facilities for a major development project in Ras Al Khaimah.' },
              { amount: 'USD 50M', project: 'Oman Shopping Mall', desc: 'Led project financing for a 33,000 sqm retail development in Sohar, Oman.' },
              { amount: 'SGD 1B', project: 'Singapore Business Trust', desc: 'Advised on the business trust listing for an Austrian developer on the Singapore Exchange.' },
            ].map((deal, i) => (
              <div key={i} className="bg-slate-900 rounded-xl p-6 border border-slate-800 hover:border-emerald-500/50 transition">
                <div className="text-2xl font-bold text-emerald-400 mb-2">{deal.amount}</div>
                <h3 className="text-lg font-semibold text-white mb-2">{deal.project}</h3>
                <p className="text-slate-400 text-sm">{deal.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Experience Timeline */}
        <div className="mt-20">
          <h2 className="text-3xl font-bold text-white mb-12 text-center">Professional Experience</h2>
          <div className="space-y-6 max-w-5xl mx-auto">
            <div className="bg-slate-900 rounded-xl p-8 border border-slate-800">
              <div className="flex flex-col md:flex-row md:items-start justify-between mb-4 gap-2">
                <div>
                  <h3 className="text-xl font-bold text-white">Real Estate Finance & Investment Banking</h3>
                  <p className="text-emerald-400">Multiple Institutions Across MENA & Southeast Asia</p>
                </div>
                <span className="text-slate-500 text-sm whitespace-nowrap">1995 - Present</span>
              </div>
              <p className="text-slate-400 mb-4">
                Held senior positions including CFO, EVP, and Director at leading real estate development companies, 
                investment banks, and advisory firms.
              </p>
              <ul className="text-slate-400 space-y-2 text-sm list-disc list-inside">
                <li>Structured sukuk, project finance facilities, and development loans for hotels, residential towers, retail malls, and mixed-use developments.</li>
                <li>Secured over <strong className="text-white">USD 2 billion</strong> in financing and investment mandates.</li>
                <li>Led teams across multiple countries, managing relationships with institutional investors, sovereign wealth funds, banks, and regulatory authorities.</li>
              </ul>
            </div>

            <div className="bg-slate-900 rounded-xl p-8 border border-slate-800">
              <div className="flex flex-col md:flex-row md:items-start justify-between mb-4 gap-2">
                <div>
                  <h3 className="text-xl font-bold text-white">Blockchain & Fintech Innovation</h3>
                  <p className="text-emerald-400">Co-Founder & Executive Director, IP2P Global Ltd</p>
                </div>
                <span className="text-slate-500 text-sm whitespace-nowrap">2018 - Present</span>
              </div>
              <p className="text-slate-400 mb-4">
                Pioneered blockchain solutions for real estate fractionalization, tokenized carbon credits, and 
                Shari'ah-compliant P2P lending platforms.
              </p>
              <ul className="text-slate-400 space-y-2 text-sm list-disc list-inside">
                <li>Launched a crypto/fiat exchange with escrow features across 11 countries.</li>
                <li>Structured blockchain applications for decentralized exchange, supply chain tracking, and NFT marketplaces.</li>
                <li>Successfully raised capital through early token offerings for manufacturing and tech ventures.</li>
              </ul>
            </div>

            <div className="bg-slate-900 rounded-xl p-8 border border-slate-800">
              <div className="flex flex-col md:flex-row md:items-start justify-between mb-4 gap-2">
                <div>
                  <h3 className="text-xl font-bold text-white">FeasiBuild</h3>
                  <p className="text-emerald-400">Founder & CEO</p>
                </div>
                <span className="text-slate-500 text-sm whitespace-nowrap">2024 - Present</span>
              </div>
              <p className="text-slate-400">
                Built FeasiBuild to democratize access to institutional-grade feasibility studies. Combining 
                30 years of hands-on real estate finance experience with AI automation to make professional 
                feasibility analysis accessible to developers, investors, and consultants worldwide.
              </p>
            </div>
          </div>
        </div>

        {/* Education */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">Education</h2>
          <div className="bg-slate-900 rounded-xl p-8 border border-slate-800">
            <div className="flex flex-col md:flex-row md:items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white mb-1">University of Exeter</h3>
                <p className="text-emerald-400">Bachelor of Arts (Honours) in Accountancy Studies</p>
              </div>
              <span className="text-slate-500 text-sm mt-2 md:mt-0">1992-1995</span>
            </div>
          </div>
        </div>

        {/* Why I Built FeasiBuild */}
        <div className="mt-20 bg-gradient-to-br from-emerald-500/10 to-blue-600/10 rounded-2xl p-12 border border-emerald-500/20 max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">Why I Built FeasiBuild</h2>
          <div className="space-y-6 text-lg leading-relaxed">
            <p className="text-slate-300">
              "Throughout my 30-year career in real estate finance across the Middle East and Southeast Asia, I've witnessed firsthand how the industry operates. I've structured billion-dollar deals, led complex development projects, and built countless financial models for boards, investors, and lenders.
            </p>
            <p className="text-slate-300">
              What became clear to me was this: the tools and methods we use for feasibility analysis haven't kept pace with the technology available today. Too often, I found myself rebuilding complex financial models to accommodate scenario changes—whether it was adjusting sales prices, testing different absorption rates, or stress-testing returns. This manual process was time-consuming and took away from higher-value strategic work.
            </p>
            <p className="text-slate-300">
              I envisioned a solution: an AI-powered platform that could deliver institutional-grade feasibility studies instantly, while giving users the flexibility to run their own scenarios without compromising the integrity of the original analysis. I described it to colleagues as 'having an experienced finance professional available to run scenarios with you—anytime, anywhere.'
            </p>
            <p className="text-slate-300">
              However, I quickly realized that generic AI solutions couldn't handle the precision and rigor required for institutional real estate finance. That challenge became the catalyst for FeasiBuild.
            </p>
            <p className="text-slate-300">
              Having worked with major consultancy firms, valuation companies, and financial institutions across seven countries, I understood the market dynamics: smaller developers often faced prohibitive costs for professional feasibility studies, while larger players had the resources to commission multiple iterations. Meanwhile, the entire industry relied on manual processes that hadn't fundamentally changed in decades.
            </p>
            <p className="text-slate-300">
              FeasiBuild changes that. It combines 30 years of institutional real estate finance expertise with cutting-edge AI to deliver professional-grade feasibility studies in minutes—not weeks. It's the tool I wish I'd had throughout my career, now available to developers, investors, and consultants worldwide."
            </p>
            <p className="text-emerald-400 font-semibold text-center text-lg mt-8">
              — Mohd Rashdan Bin Ibrahim
            </p>
          </div>
        </div>

        {/* Bottom LinkedIn CTA */}
        <div className="mt-16 text-center">
          <p className="text-slate-400 mb-4">Connect with me on LinkedIn for more insights on real estate finance and AI innovation.</p>
          <a 
            href="https://www.linkedin.com/in/morib" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-4 bg-[#0077b5] text-white rounded-lg hover:bg-[#006396] transition font-semibold text-lg"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
            View My Full LinkedIn Profile
          </a>
        </div>
      </div>
    </div>
  );
}
