
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Link as LinkIcon, Clock, Image as ImageIcon, FileText } from 'lucide-react';
import { cn } from '@/shared/utils/cn';
import { MessageReference } from '@/features/ai_workspace/types';

export function ParsedModelContent({ text, references, onReferenceClick }: {
    text: string;
    references: MessageReference[];
    onReferenceClick: (ref: MessageReference) => void;
}) {
    const parts: Array<{ type: 'text' | 'ref'; content: string; refType?: string; refId?: string }> = [];
    const regex = /\[REF:([^:]+):([^\]]+)\]/g;
    let lastIndex = 0;
    let match;
    while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) parts.push({ type: 'text', content: text.slice(lastIndex, match.index) });
        parts.push({ type: 'ref', content: match[0], refType: match[1], refId: match[2] });
        lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) parts.push({ type: 'text', content: text.slice(lastIndex) });

    return (
        <>
            {parts.map((part, i) => {
                if (part.type === 'ref') {
                    const refObj = references.find(r => r.excerpt === part.refId);
                    let Icon = LinkIcon;
                    if (part.refType === 'transcript') Icon = Clock;
                    else if (part.refType === 'screenshot') Icon = ImageIcon;
                    else if (part.refType === 'note') Icon = FileText;
                    return (
                        <button
                            key={i}
                            onClick={() => refObj && onReferenceClick(refObj)}
                            disabled={!refObj}
                            className={cn(
                                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold transition-all mx-0.5 align-middle',
                                refObj
                                    ? 'bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer border border-primary/20'
                                    : 'bg-border/50 text-muted-foreground cursor-not-allowed'
                            )}
                            title={refObj ? 'View source' : 'Source not found'}
                        >
                            <Icon size={9} />
                            {part.refType}
                        </button>
                    );
                }
                return (
                    <ReactMarkdown
                        key={i}
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                        components={{
                            code({ node, inline, className, children, ...props }: any) {
                                const match = /language-(\w+)/.exec(className || '');
                                return !inline && match ? (
                                    <div className="rounded-xl overflow-hidden border border-border/50 my-3">
                                        <div className="bg-surface px-4 py-1.5 text-[11px] text-muted-foreground flex items-center justify-between border-b border-border/50">
                                            <span className="font-mono font-bold">{match[1]}</span>
                                        </div>
                                        <SyntaxHighlighter
                                            {...props}
                                            style={vscDarkPlus as any}
                                            language={match[1]}
                                            PreTag="div"
                                            customStyle={{ margin: 0, padding: '1rem', background: 'hsl(var(--surface))' }}
                                        >
                                            {String(children).replace(/\n$/, '')}
                                        </SyntaxHighlighter>
                                    </div>
                                ) : (
                                    <code {...props} className={cn('bg-primary/10 text-primary px-1.5 py-0.5 rounded-md font-mono text-[0.85em]', className)}>
                                        {children}
                                    </code>
                                );
                            },
                            table({ children }: any) {
                                return <div className="overflow-x-auto my-3"><table className="min-w-full text-xs border-collapse border border-border rounded-lg overflow-hidden">{children}</table></div>;
                            },
                            th({ children }: any) {
                                return <th className="px-4 py-2 bg-surface font-bold text-foreground border border-border text-left">{children}</th>;
                            },
                            td({ children }: any) {
                                return <td className="px-4 py-2 border border-border text-foreground">{children}</td>;
                            },
                            blockquote({ children }: any) {
                                return <blockquote className="border-l-4 border-primary/40 bg-primary/5 pl-4 py-2 my-3 rounded-r-lg text-muted-foreground italic">{children}</blockquote>;
                            }
                        }}
                    >
                        {part.content}
                    </ReactMarkdown>
                );
            })}
        </>
    );
}
