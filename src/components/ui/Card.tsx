'use client';

import { ReactNode } from 'react';

interface CardProps {
    children: ReactNode;
    className?: string;
    hover?: boolean;
    onClick?: () => void;
}

export default function Card({ children, className = '', hover = true, onClick }: CardProps) {
    return (
        <div
            className={`bg-[var(--bg-secondary)] border border-[var(--border)] rounded-[4px] p-5 transition-all duration-150 ${hover ? 'hover:border-[var(--border-hover)] hover:bg-[var(--bg-tertiary)]' : ''
                } ${onClick ? 'cursor-pointer' : ''} ${className}`}
            onClick={onClick}
        >
            {children}
        </div>
    );
}
