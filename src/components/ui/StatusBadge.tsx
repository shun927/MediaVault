'use client';

interface StatusBadgeProps {
    status: string;
}

const statusConfig: Record<string, { label: string; color: string }> = {
    watched: { label: 'Watched', color: '#00e054' },
    watching: { label: 'Watching', color: '#40bcf4' },
    read: { label: 'Read', color: '#00e054' },
    reading: { label: 'Reading', color: '#40bcf4' },
    wishlist: { label: 'Wishlist', color: '#ee7b2f' },
    listened: { label: 'Listened', color: '#00e054' },
    listening: { label: 'Listening', color: '#40bcf4' },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
    const config = statusConfig[status] || { label: status, color: '#678' };

    return (
        <span
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium"
            style={{ color: config.color, backgroundColor: `${config.color}15` }}
        >
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: config.color }} />
            {config.label}
        </span>
    );
}
