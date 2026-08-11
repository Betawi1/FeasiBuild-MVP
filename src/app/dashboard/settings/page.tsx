import AIModelSelector from "@/components/settings/AIModelSelector";

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
    </div>
  );
}
