import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { cn } from '@/shared/utils/cn';

interface MarkdownProps {
  children: string;
  className?: string;
}

export function Markdown({ children, className }: MarkdownProps) {
  return (
    <div className={cn("prose prose-invert max-w-none prose-pre:bg-transparent prose-pre:p-0", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
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
        {children}
      </ReactMarkdown>
    </div>
  );
}
