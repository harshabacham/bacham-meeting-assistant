import Hero from "@/components/sections/Hero";
import NotepadIntro from "@/components/sections/NotepadIntro";
import { EcosystemBar } from "@/components/sections/EcosystemBar";
import WhyItExists from "@/components/sections/WhyItExists";
import FeaturesGrid from "@/components/sections/FeaturesGrid";
import HowItWorks from "@/components/sections/HowItWorks";
import Privacy from "@/components/sections/Privacy";
import DownloadCTA from "@/components/sections/DownloadCTA";
import FAQ from "@/components/sections/FAQ";

export default function Home() {
  return (
    <div className="flex flex-col w-full min-h-screen bg-[#FCFBF9]">
      <Hero />
      <NotepadIntro />
      <WhyItExists />
      <FeaturesGrid />
      <HowItWorks />
      <EcosystemBar />
      <Privacy />
      <DownloadCTA />
      <FAQ />
    </div>
  );
}
