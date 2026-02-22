'use client';

export default function Skeleton({ className = '' }: { className?: string }) {
    return <div className={`animate-shimmer rounded ${className}`} />;
}
