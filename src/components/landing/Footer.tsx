import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950 px-4 py-12">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 grid gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <Link
              href="/"
              className="mb-4 inline-block text-xl font-bold tracking-tight text-white"
            >
              Feasi<span className="text-emerald-500">Build</span>
            </Link>
            <p className="max-w-sm text-slate-400">
              AI-powered feasibility studies for institutional real estate
              professionals.
            </p>
          </div>

          <div>
            <h4 className="mb-4 font-semibold text-white">Product</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="#features"
                  className="text-slate-400 transition hover:text-white"
                >
                  Features
                </Link>
              </li>
              <li>
                <Link
                  href="#how-it-works"
                  className="text-slate-400 transition hover:text-white"
                >
                  How It Works
                </Link>
              </li>
              <li>
                <Link
                  href="/sign-up"
                  className="text-slate-400 transition hover:text-white"
                >
                  Get Started
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Company</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/founder" className="text-slate-400 hover:text-emerald-400 transition">
                  About Founder
                </Link>
              </li>
              <li>
                <Link href="/comparison" className="text-slate-400 hover:text-emerald-400 transition">
                  Comparison
                </Link>
              </li>
              <li>
                <a
                  href="https://t.me/+wdAia077EFUzNTQ9"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-emerald-400 transition"
                >
                  Join Telegram Group
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between border-t border-slate-800 pt-8 md:flex-row">
          <p className="text-sm text-slate-500">
            © 2026 FeasiBuild. All rights reserved.
          </p>
          <div className="mt-4 flex items-center gap-6 text-sm text-slate-400 md:mt-0">
            <Link href="/privacy-policy" className="hover:text-emerald-400 transition">
              Privacy Policy
            </Link>
            <span>•</span>
            <Link href="/terms-of-service" className="hover:text-emerald-400 transition">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

