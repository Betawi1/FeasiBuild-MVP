import Link from "next/link";

export default function CheckoutCancelPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center text-slate-200">
        <h1 className="text-xl font-semibold text-white">Checkout cancelled.</h1>
        <p className="mt-3 text-sm text-slate-400">
          No charge was made. You can return to the dashboard and try again
          whenever you&apos;re ready.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-block rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
