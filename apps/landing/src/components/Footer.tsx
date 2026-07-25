import Image from "next/image";
import Link from "next/link";
import { Code2, MessageCircle } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-white/5 bg-transparent py-12 mt-24">
      <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex flex-col gap-2">
          <Link href="/" className="flex items-center gap-2 text-2xl font-bold tracking-tight text-[#F5F5F5]">
            <Image src="/logo.png" alt="BACHAM Logo" width={32} height={32} className="rounded-lg" />
            BACHAM
          </Link>
          <p className="text-sm text-[#A0A0A0]">
            Your second brain for learning.
          </p>
        </div>
        
        <div className="flex items-center gap-6 text-sm text-[#A0A0A0]">
          <Link href="#privacy" className="hover:text-[#F5F5F5] transition-colors">Privacy</Link>
          <Link href="#terms" className="hover:text-[#F5F5F5] transition-colors">Terms</Link>
          <Link href="#docs" className="hover:text-[#F5F5F5] transition-colors">Documentation</Link>
        </div>
        
        <div className="flex items-center gap-4 text-[#A0A0A0]">
          <a href="#" className="hover:text-[#F5F5F5] transition-colors">
            <Code2 size={20} />
          </a>
          <a href="#" className="hover:text-[#F5F5F5] transition-colors">
            <MessageCircle size={20} />
          </a>
        </div>
      </div>
    </footer>
  );
}
