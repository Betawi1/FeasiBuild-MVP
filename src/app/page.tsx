import Navbar from "@/components/navbar";
import HeroSection from "@/components/landing/HeroSection";
import ProblemSolutionSection from "@/components/landing/ProblemSolutionSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import TechnologySection from "@/components/landing/TechnologySection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import FounderEdgeSection from "@/components/landing/FounderEdgeSection";
import CTASection from "@/components/landing/CTASection";
import Footer from "@/components/landing/Footer";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950">
      <Navbar />
      <HeroSection />
      <ProblemSolutionSection />
      <FeaturesSection />
      <TechnologySection />
      <HowItWorksSection />
      <FounderEdgeSection />
      <CTASection />
      <Footer />
    </main>
  );
}
