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
            className={`bg-[var(--card-bg)] border border-[var(--card-border)] rounded-[8px] p-5 transition-all duration-150 ${hover ? 'hover:border-[var(--card-hover-border)] hover:bg-[var(--card-hover-bg)]' : ''
                } ${onClick ? 'cursor-pointer' : ''} ${className}`}
            onClick={onClick}
        >
            {children}
        </div>
    );
}
