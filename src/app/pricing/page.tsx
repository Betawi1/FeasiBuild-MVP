import type { Metadata } from "next";
import Navbar from "@/components/navbar";
import PricingSection from "@/components/landing/PricingSection";
import Footer from "@/components/landing/Footer";

export const metadata: Metadata = {
  title: "Pricing | FeasiBuild",
  description:
    "FeasiBuild pricing for AI-powered real estate feasibility studies, platform access, and report credits.",
};

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-slate-950">
      <Navbar />
      <div className="pt-16">
        <PricingSection />
      </div>
      <Footer />
    </main>
  );
}
