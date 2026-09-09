import Hero from "@/components/sections/Hero";
import NotepadIntro from "@/components/sections/NotepadIntro";
import { EcosystemBar } from "@/components/sections/EcosystemBar";
import WhyItExists from "@/components/sections/WhyItExists";
import FeaturesGrid from "@/components/sections/FeaturesGrid";
import HowItWorks from "@/components/sections/HowItWorks";
import QuickStartInstructions from "@/components/sections/QuickStartInstructions";
import Version2Roadmap from "@/components/sections/Version2Roadmap";
import Privacy from "@/components/sections/Privacy";
import Comparison from "@/components/sections/Comparison";
import DownloadCTA from "@/components/sections/DownloadCTA";
import FAQ from "@/components/sections/FAQ";

export default function Home() {
  return (
    <div className="flex flex-col w-full min-h-screen bg-[#000000]">
      <Hero />
      <NotepadIntro />
      <WhyItExists />
      <FeaturesGrid />
      <HowItWorks />
      <EcosystemBar />
      <QuickStartInstructions />
      <Version2Roadmap />
      <Privacy />
      <Comparison />
      <DownloadCTA />
      <FAQ />
    </div>
  );
}
