'use client';

import { useState } from 'react';

interface StarRatingProps {
    value: number;
    onChange?: (value: number) => void;
    readonly?: boolean;
    size?: 'sm' | 'md' | 'lg';
}

const stars = [1, 2, 3, 4, 5];

function Star({ active, className }: { active: boolean; className: string }) {
    return <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill={active ? 'var(--media-accent)' : 'none'} stroke={active ? 'var(--media-accent)' : 'var(--border)'} strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
    </svg>;
}

export default function StarRating({ value, onChange, readonly = false, size = 'md' }: StarRatingProps) {
    const [hovered, setHovered] = useState(0);
    const sizes = { sm: 'w-4 h-4', md: 'w-5 h-5', lg: 'w-6 h-6' };
    const label = `5段階中${value || 0}`;

    if (readonly) return <div className="flex gap-0.5" role="img" aria-label={label} title={label}>
        {stars.map((star) => <Star key={star} active={star <= value} className={sizes[size]} />)}
    </div>;

    return <div className="inline-flex gap-0.5" role="radiogroup" aria-label="評価">
        {stars.map((star) => <button
            key={star}
            type="button"
            role="radio"
            aria-checked={star === value}
            aria-label={`${star}つ星`}
            onClick={() => onChange?.(star === value ? 0 : star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            onKeyDown={(event) => {
                if (event.key === 'ArrowRight' || event.key === 'ArrowUp') { event.preventDefault(); onChange?.(Math.min(5, star + 1)); }
                if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') { event.preventDefault(); onChange?.(Math.max(0, star - 1)); }
            }}
            className="touch-target inline-flex items-center justify-center cursor-pointer hover:scale-110 transition-transform duration-100"
        ><Star active={star <= (hovered || value)} className={sizes[size]} /></button>)}
    </div>;
}
