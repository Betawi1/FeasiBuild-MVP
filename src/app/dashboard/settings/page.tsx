import AIModelSelector from "@/components/settings/AIModelSelector";
import { SUPPORT_TELEGRAM_URL } from "@/lib/constants/support";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">App Settings</h1>
        <p className="mt-1 text-slate-400">
          Preferences are stored in your personal Puter vault and sync across
          devices.
        </p>
      </div>
      <AIModelSelector />

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h3 className="text-sm font-semibold text-white">Get help</h3>
        <p className="mt-2 text-sm text-slate-400">
          Talk to a human on Telegram if you need a hand with the app.
        </p>
        <a
          href={SUPPORT_TELEGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex text-sm font-medium text-emerald-400 transition hover:text-emerald-300"
        >
          Support on Telegram
        </a>
      </div>
    </div>
  );
}
