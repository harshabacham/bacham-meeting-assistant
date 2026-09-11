"use client";

import { ReactLenis } from "@studio-freight/react-lenis";

export default function LenisProvider({ children }: { children: React.ReactNode }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const LenisComponent = ReactLenis as any;
  return (
    <LenisComponent root options={{ lerp: 0.1, duration: 1.5, smoothWheel: true }}>
      {children}
    </LenisComponent>
  );
}
