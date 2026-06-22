import { Waitlist } from "@clerk/nextjs";
import Link from "next/link";

export default function WaitlistPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="text-2xl font-bold tracking-tight text-white"
          >
            Feasi<span className="text-emerald-500">Build</span>
          </Link>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8">
          <h1 className="mb-2 text-center text-2xl font-bold text-white">
            Join the Waitlist
          </h1>
          <p className="mb-6 text-center text-slate-400">
            Be among the first to access FeasiBuild for your next project.
          </p>

          <Waitlist
            appearance={{
              variables: {
                colorPrimary: "#10b981",
                colorBackground: "#0f172a",
              },
              elements: {
                formButton:
                  "bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold",
                formFieldInput: "bg-slate-800 border-slate-700 text-white",
              },
            }}
          />

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-500">
              Already have access?{" "}
              <Link
                href="/sign-in"
                className="font-medium text-emerald-500 hover:text-emerald-400"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-600">
          Free for beta testers • No credit card required
        </p>
      </div>
    </div>
  );
}
