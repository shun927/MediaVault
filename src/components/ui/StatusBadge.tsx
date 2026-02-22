'use client';

interface StatusBadgeProps {
    status: string;
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
    watched: { label: 'Watched', color: 'var(--media-accent)', bg: 'var(--media-accent-soft)' },
    watching: { label: 'Watching', color: 'var(--text-secondary)', bg: 'rgba(127, 137, 149, 0.16)' },
    read: { label: 'Read', color: 'var(--media-accent)', bg: 'var(--media-accent-soft)' },
    reading: { label: 'Reading', color: 'var(--text-secondary)', bg: 'rgba(127, 137, 149, 0.16)' },
    wishlist: { label: 'Wishlist', color: 'var(--text-muted)', bg: 'rgba(111, 122, 136, 0.14)' },
    listened: { label: 'Listened', color: 'var(--media-accent)', bg: 'var(--media-accent-soft)' },
    listening: { label: 'Listening', color: 'var(--text-secondary)', bg: 'rgba(127, 137, 149, 0.16)' },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
    const config = statusConfig[status] || { label: status, color: 'var(--text-muted)', bg: 'rgba(111, 122, 136, 0.14)' };

    return (
        <span
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium"
            style={{ color: config.color, backgroundColor: config.bg }}
        >
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: config.color }} />
            {config.label}
        </span>
    );
}
