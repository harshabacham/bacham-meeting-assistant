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
      title: "Lecture Intelligence",
      description: "AI models trained to understand academic context and parse dense scientific terminology.",
      icon: <Brain />,
    },
    {
      title: "Code Explanation",
      description: "Parses programming tutorials and automatically explains complex snippets.",
      icon: <Code />,
    },
    {
      title: "Formula Sheet",
      description: "Extracts math equations from videos into clean, formatted LaTeX.",
      icon: <FileSpreadsheet />,
    },
    {
      title: "Flashcards",
      description: "Creates spaced-repetition decks instantly from your lecture materials.",
      icon: <Layers />,
    },
    {
      title: "Quiz Generation",
      description: "Tests your knowledge with auto-generated questions from the transcript.",
      icon: <Target />,
    },
    {
      title: "Diagram Analysis",
      description: "Identifies and explains flowcharts, architectures, and diagrams.",
      icon: <GitGraph />,
    },
    {
      title: "Ask AI",
      description: "Chat directly with your lecture content to clarify doubts instantly.",
      icon: <HelpCircle />,
    },
    {
      title: "AI Notes",
      description: "Generates comprehensive study notes that sync perfectly with the video timeline.",
      icon: <BookOpen />,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 relative z-10 py-10 max-w-7xl mx-auto">
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
  index,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  index: number;
}) => {
  return (
    <div
      className={cn(
        "flex flex-col lg:border-r py-10 relative group/feature border-white/5",
        (index === 0 || index === 4) && "lg:border-l border-white/5",
        index < 4 && "lg:border-b border-white/5"
      )}
    >
      {index < 4 && (
        <div className="opacity-0 group-hover/feature:opacity-100 transition duration-500 absolute inset-0 h-full w-full bg-gradient-to-t from-white/5 to-transparent pointer-events-none" />
      )}
      {index >= 4 && (
        <div className="opacity-0 group-hover/feature:opacity-100 transition duration-500 absolute inset-0 h-full w-full bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
      )}
      <div className="mb-4 relative z-10 px-10 text-[#A0A0A0] group-hover/feature:text-blue-400 transition-colors duration-300">
        {icon}
      </div>
      <div className="text-lg font-bold mb-2 relative z-10 px-10">
        <div className="absolute left-0 inset-y-0 h-6 group-hover/feature:h-8 w-1 rounded-tr-full rounded-br-full bg-white/10 group-hover/feature:bg-blue-500 transition-all duration-300 origin-center" />
        <span className="group-hover/feature:translate-x-2 transition duration-300 inline-block text-[#F5F5F5]">
          {title}
        </span>
      </div>
      <p className="text-sm text-[#A0A0A0] max-w-xs relative z-10 px-10">
        {description}
      </p>
    </div>
  );
};
