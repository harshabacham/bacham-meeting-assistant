import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { cn } from '@/shared/utils/cn';
import { Play } from 'lucide-react';
import { useLectureSyncStore } from '@/shared/stores/lectureSyncStore';

interface MarkdownProps {
  children: string;
  className?: string;
}

function timeToMs(timeStr: string): number {
  const parts = timeStr.split(':').map(Number);
  if (parts.length === 2) {
    return (parts[0] * 60 + parts[1]) * 1000;
  }
  if (parts.length === 3) {
    return (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;
  }
  return 0;
}

const TimestampBadge = ({ ms, display }: { ms: number, display: React.ReactNode }) => {
  const seekTo = useLectureSyncStore(state => state.seekTo);
  
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        seekTo(ms);
      }}
      className="inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-pointer text-xs font-mono font-medium border border-primary/20 align-middle no-underline"
      title="Jump to this moment"
    >
      <Play size={10} className="fill-primary/70" />
      {display}
    </button>
  );
};

export function Markdown({ children, className }: MarkdownProps) {
  // Preprocess markdown string to turn [MM:SS] or [HH:MM:SS] into markdown links
  const processedChildren = (children || "").replace(/\[(\d{1,2}:\d{2}(?::\d{2})?)\]/g, (match, time) => {
    const ms = timeToMs(time);
    return `[${match}](#timestamp-${ms})`;
  });

  return (
    <div className={cn("prose prose-invert max-w-none prose-pre:bg-transparent prose-pre:p-0", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          a({ href, children, ...props }) {
            if (href?.startsWith('#timestamp-')) {
              const ms = parseInt(href.replace('#timestamp-', ''), 10);
              return <TimestampBadge ms={ms} display={children} />;
            }
            return <a href={href} {...props} className="text-primary hover:underline">{children}</a>;
          },
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            return !inline && match ? (
              <SyntaxHighlighter
                style={atomDark as any}
                language={match[1]}
                PreTag="div"
                className="rounded-md border border-border/50 bg-surface/50 !m-0 !p-3"
                {...props}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            ) : (
              <code className={cn("bg-muted px-[0.3rem] py-[0.2rem] rounded-sm font-mono text-[0.85em]", className)} {...props}>
                {children}
              </code>
            );
          },
          table({ children }) {
            return (
              <div className="overflow-x-auto my-4 rounded-md border border-border/50">
                <table className="w-full border-collapse text-sm m-0">
                  {children}
                </table>
              </div>
            );
          },
          th({ children }) {
            return <th className="border-b border-border/50 bg-surface/50 p-2 text-left font-medium">{children}</th>;
          },
          td({ children }) {
            return <td className="border-b border-border/50 p-2 border-r-0 last:border-r-0">{children}</td>;
          }
        }}
      >
        {processedChildren}
      </ReactMarkdown>
    </div>
  );
}
