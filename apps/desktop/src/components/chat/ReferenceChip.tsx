import { Clock, Image as ImageIcon } from 'lucide-react';

interface ReferenceChipProps {
    refType: 'timestamp' | 'screenshot' | string;
    value: string;
    onTimestampClick?: (ms: number) => void;
    onScreenshotClick?: (screenshotId: string) => void;
}

export function ReferenceChip({ refType, value, onTimestampClick, onScreenshotClick }: ReferenceChipProps) {
    const handleClick = () => {
        if (refType === 'timestamp' && onTimestampClick) {
            onTimestampClick(parseInt(value, 10));
        } else if (refType === 'screenshot' && onScreenshotClick) {
            onScreenshotClick(value);
        }
    };

    const label = refType === 'timestamp'
        ? formatTime(parseInt(value, 10))
        : 'Screenshot';

    const Icon = refType === 'screenshot' ? ImageIcon : Clock;

    return (
        <button
            onClick={handleClick}
            className="reference-chip"
            title={refType === 'timestamp' ? `Jump to ${label}` : `View screenshot`}
        >
            <Icon size={10} />
            {label}
        </button>
    );
}

function formatTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/** Parse [REF:type:value] markers from AI text and render as chips inline. */
export function ParsedChatContent({
    text,
    onTimestampClick,
    onScreenshotClick,
}: {
    text: string;
    onTimestampClick?: (ms: number) => void;
    onScreenshotClick?: (id: string) => void;
}) {
    // Split on [REF:...] markers
    const parts: Array<{ type: 'text' | 'ref'; content: string; refType?: string; refValue?: string }> = [];
    const regex = /\[REF:([^:]+):([^\]]+)\]/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            parts.push({ type: 'text', content: text.slice(lastIndex, match.index) });
        }
        parts.push({ type: 'ref', content: match[0], refType: match[1], refValue: match[2] });
        lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) {
        parts.push({ type: 'text', content: text.slice(lastIndex) });
    }

    return (
        <>
            {parts.map((part, i) =>
                part.type === 'ref' ? (
                    <ReferenceChip
                        key={i}
                        refType={part.refType!}
                        value={part.refValue!}
                        onTimestampClick={onTimestampClick}
                        onScreenshotClick={onScreenshotClick}
                    />
                ) : (
                    <span key={i}>{part.content}</span>
                )
            )}
        </>
    );
}
