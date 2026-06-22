import DocsSidebar from '@/components/docs/DocsSidebar';

export const metadata = {
  title: 'Documentation | FeasiBuild',
  description: 'How to use FeasiBuild to generate institutional-grade feasibility studies.',
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-slate-950">
      <DocsSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-8 py-12">
          {children}
        </div>
      </main>
    </div>
  );
}
