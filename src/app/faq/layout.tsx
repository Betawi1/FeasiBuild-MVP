import Footer from "@/components/landing/Footer";
import Navbar from "@/components/navbar";

export default function FaqLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />
      <div className="pt-16">{children}</div>
      <Footer />
    </div>
  );
}
