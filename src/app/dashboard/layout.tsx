import Header from "@/components/dashboard/Header";
import Sidebar from "@/components/dashboard/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Sidebar />
      <Header />
      <main className="ml-64 min-h-screen pt-16">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
