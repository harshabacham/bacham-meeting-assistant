import Hero from "@/components/sections/Hero";
import WhyItExists from "@/components/sections/WhyItExists";
import HowItWorks from "@/components/sections/HowItWorks";
import ProductShowcase from "@/components/sections/ProductShowcase";
import LectureIntelligence from "@/components/sections/LectureIntelligence";
import FeaturesGrid from "@/components/sections/FeaturesGrid";
import WorkspaceScroll from "@/components/sections/WorkspaceScroll";
import BuiltForStudents from "@/components/sections/BuiltForStudents";
import Privacy from "@/components/sections/Privacy";
import DownloadCTA from "@/components/sections/DownloadCTA";
import FAQ from "@/components/sections/FAQ";
import { LayeredText } from "@/components/ui/layered-text";

export default function Home() {
  return (
    <div className="flex flex-col w-full">
      <Hero />
      <WhyItExists />
      <HowItWorks />
      <ProductShowcase />
      <LectureIntelligence />
      <FeaturesGrid />
      <WorkspaceScroll />

      <BuiltForStudents />
      <Privacy />
      
      <section className="py-24 border-t border-white/5 bg-transparent overflow-hidden flex justify-center items-center">
        <LayeredText />
      </section>

      <DownloadCTA />
      <FAQ />
    </div>
  );
}
