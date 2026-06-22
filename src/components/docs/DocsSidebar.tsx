'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navigation = [
  { name: 'Introduction', href: '/docs' },
  { name: 'Getting Started', href: '/docs/getting-started' },
  { name: 'Operational Stream', href: '/docs/operational-stream' },
  { name: 'Sale Stream', href: '/docs/sale-stream' },
  { name: 'AI Research & Automation', href: '/docs/ai-research-automation' },
  { name: 'Generating the Study', href: '/docs/generating-the-study' },
];

export default function DocsSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 shrink-0 border-r border-slate-800 bg-slate-950/50">
      <div className="sticky top-0 h-screen overflow-y-auto p-6">
        <Link href="/" className="mb-8 flex items-center gap-2 px-4">
          <span className="text-2xl font-bold">
            <span className="text-white">Feasi</span>
            <span className="text-emerald-400">Build</span>
          </span>
        </Link>

        <nav className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                }`}
              >
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="mt-8 border-t border-slate-800 pt-6">
          <Link
            href="/dashboard"
            className="flex items-center justify-center rounded-lg bg-emerald-500 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-emerald-400"
          >
            ← Back to App
          </Link>
        </div>
      </div>
    </aside>
  );
}
