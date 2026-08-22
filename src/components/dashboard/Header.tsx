"use client";

import { UserButton } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import AIModelSelector from "@/components/settings/AIModelSelector";
import { UpgradeNavControl } from "@/components/ui/UpgradeModal";

export default function Header() {
  const pathname = usePathname();
  const title = pathname.startsWith("/dashboard/settings")
    ? "Settings"
    : "Dashboard";

  return (
    <header className="fixed right-0 top-0 z-30 flex h-16 w-[calc(100%-16rem)] items-center justify-between border-b border-slate-800 bg-slate-950/80 px-8 backdrop-blur-md">
      <div>
        <h2 className="text-lg font-semibold text-white">{title}</h2>
      </div>

      <div className="flex items-center gap-4">
        <UpgradeNavControl compact />
        <AIModelSelector variant="inline" />
        <UserButton />
      </div>
    </header>
  );
}
