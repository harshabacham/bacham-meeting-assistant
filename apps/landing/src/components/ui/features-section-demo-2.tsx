import { cn } from "@/lib/utils";
import { 
  Brain, 
  Code, 
  FileSpreadsheet, 
  Layers, 
  Target, 
  GitGraph, 
  HelpCircle, 
  BookOpen 
} from "lucide-react";

export default function FeaturesSectionDemo() {
  const features = [
    {
      title: "Context Intelligence",
      description: "AI models fine-tuned to extract key decisions, speaker intents, and dense technical topics.",
      icon: <Brain size={22} />,
      color: "#A6FF00",
    },
    {
      title: "Code & Tech Extraction",
      description: "Recognizes syntax, stack traces, and algorithms from screens and auto-formats snippets.",
      icon: <Code size={22} />,
      color: "#3B82F6",
    },
    {
      title: "Equation & LaTeX Parser",
      description: "Converts blackboard or slide math directly into clean, searchable, editable LaTeX equations.",
      icon: <FileSpreadsheet size={22} />,
      color: "#F59E0B",
    },
    {
      title: "Flashcard Decks",
      description: "Creates spaced-repetition Anki-compatible decks instantly from your transcripts.",
      icon: <Layers size={22} />,
      color: "#9B5EFF",
    },
    {
      title: "Automated Quizzes",
      description: "Tests your retention with custom multi-choice and conceptual challenge questions.",
      icon: <Target size={22} />,
      color: "#EC4899",
    },
    {
      title: "Architecture & Diagrams",
      description: "Identifies flowcharts, diagrams, and visual hierarchies and explains their logic.",
      icon: <GitGraph size={22} />,
      color: "#10B981",
    },
    {
      title: "Local AI Wingman",
      description: "Chat privately with your entire lecture archive with zero data leaving your machine.",
      icon: <HelpCircle size={22} />,
      color: "#06B6D4",
    },
    {
      title: "Synchronized Notes",
      description: "Timestamp-anchored markdown notes that jump directly to the exact point in the recording.",
      icon: <BookOpen size={22} />,
      color: "#A6FF00",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 relative z-10 py-6 max-w-7xl mx-auto rounded-3xl border border-white/[0.07] bg-white/[0.01] backdrop-blur-xl overflow-hidden shadow-2xl">
      {features.map((feature, index) => (
        <Feature key={feature.title} {...feature} index={index} />
      ))}
    </div>
  );
}

const Feature = ({
  title,
  description,
  icon,
  color,
  index,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  index: number;
}) => {
  return (
    <div
      className={cn(
        "flex flex-col py-10 px-8 relative group/feature transition-all duration-300",
        "border-b md:border-b-0 border-white/[0.06]",
        (index % 2 === 0) && "md:border-r border-white/[0.06]",
        (index % 4 !== 3) && "lg:border-r border-white/[0.06]",
        index < 4 && "lg:border-b border-white/[0.06]"
      )}
    >
      {/* Background Hover Glow */}
      <div 
        className="opacity-0 group-hover/feature:opacity-100 transition-opacity duration-500 absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle at center, ${color}10 0%, transparent 70%)`
        }}
      />

      {/* Top Left Accent Pill on Hover */}
      <div 
        className="absolute left-0 top-8 h-8 w-1 rounded-r-full opacity-0 group-hover/feature:opacity-100 transition-all duration-300"
        style={{ backgroundColor: color, boxShadow: `0 0 12px ${color}` }}
      />

      <div 
        className="mb-5 relative z-10 w-11 h-11 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover/feature:scale-110 border border-white/[0.08] bg-white/[0.03]"
        style={{ color: color }}
      >
        {icon}
      </div>

      <div className="text-lg font-bold mb-2.5 relative z-10 text-[#F0F0F0] tracking-tight group-hover/feature:text-white transition-colors duration-200">
        {title}
      </div>

      <p className="text-sm text-[#777777] leading-relaxed relative z-10 group-hover/feature:text-[#999999] transition-colors duration-200">
        {description}
      </p>
    </div>
  );
};
