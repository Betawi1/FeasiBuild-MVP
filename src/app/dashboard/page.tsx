import { currentUser } from "@clerk/nextjs/server";
import PuterAuthNotice from "@/components/dashboard/PuterAuthNotice";
import DashboardProjects from "@/components/dashboard/DashboardProjects";
import DashboardNewStudyButtons from "@/components/dashboard/DashboardNewStudyButtons";

export default async function DashboardPage() {
  const user = await currentUser();
  const firstName = user?.firstName || "User";

  return (
    <div className="space-y-8">
      <PuterAuthNotice />
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">
            Welcome back, {firstName}
          </h1>
          <p className="mt-1 text-slate-400">
            Here&apos;s what&apos;s happening with your feasibility studies.
          </p>
        </div>
        <DashboardNewStudyButtons />
      </div>

      <DashboardProjects userId={user?.id} />
    </div>
  );
}
