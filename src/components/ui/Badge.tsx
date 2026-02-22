'use client';

interface BadgeProps {
    label: string;
    color?: string;
    onRemove?: () => void;
    size?: 'sm' | 'md';
}

export default function Badge({ label, color = '#6366f1', onRemove, size = 'sm' }: BadgeProps) {
    return (
        <span
            className={`inline-flex items-center gap-1 rounded-full font-medium transition-all duration-200 ${size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm'
                }`}
            style={{
                backgroundColor: `${color}20`,
                color: color,
                border: `1px solid ${color}30`,
            }}
        >
            <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: color }}
            />
            {label}
            {onRemove && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove();
                    }}
                    className="ml-0.5 hover:opacity-70 transition-opacity cursor-pointer"
                >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            )}
        </span>
    );
}
