"use client";

import { useState } from "react";
import Hero from "@/components/sections/Hero";
import WhatIsBacham from "@/components/sections/WhatIsBacham";
import AppVsExtension from "@/components/sections/AppVsExtension";
import HowToUse from "@/components/sections/HowToUse";
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
import { SmartScreenModal } from "@/components/ui/SmartScreenModal";

export default function Home() {
  const [smartScreenOpen, setSmartScreenOpen] = useState(false);

  return (
    <div className="flex flex-col w-full min-h-screen bg-[#000000]">
      <Hero onOpenSmartScreen={() => setSmartScreenOpen(true)} />
      <WhatIsBacham />
      <AppVsExtension onOpenSmartScreen={() => setSmartScreenOpen(true)} />
      <HowToUse />
      <NotepadIntro />
      <WhyItExists />
      <FeaturesGrid />
      <HowItWorks />
      <EcosystemBar />
      <QuickStartInstructions />
      <Version2Roadmap />
      <Privacy />
      <Comparison />
      <DownloadCTA onOpenSmartScreen={() => setSmartScreenOpen(true)} />
      <FAQ />

      {/* Windows SmartScreen Installation Helper Modal */}
      <SmartScreenModal
        isOpen={smartScreenOpen}
        onClose={() => setSmartScreenOpen(false)}
        downloadUrl="/downloads/bacham-setup.exe?v=1.0.10"
        msiUrl="/downloads/bacham-setup.msi?v=1.0.10"
        version="1.0.10"
      />
    </div>
  );
}
