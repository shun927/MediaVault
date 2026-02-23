'use client';

import Link from 'next/link';
import Image from 'next/image';
import Card from '@/components/ui/Card';
import StarRating from '@/components/ui/StarRating';

interface UnifiedItemCardProps {
    href: string;
    title: string;
    imageUrl: string | null;
    badgeLabel: string;
    dateLabel: string;
    rating: number | null;
    preserveImage?: boolean;
}

export default function UnifiedItemCard({
    href,
    title,
    imageUrl,
    badgeLabel,
    dateLabel,
    rating,
    preserveImage = false,
}: UnifiedItemCardProps) {
    return (
        <Card className="p-0 overflow-hidden group relative h-full">
            <Link href={href} className="no-underline h-full flex flex-col">
                <div className="aspect-[2/3] bg-transparent relative shrink-0">
                    {imageUrl ? (
                        <Image
                            src={imageUrl}
                            alt={title}
                            fill
                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                            className={`block w-full h-full object-center group-hover:scale-105 transition-transform duration-500 ${preserveImage ? 'object-contain' : 'object-cover'}`}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs font-medium text-[var(--text-muted)] bg-[var(--bg-tertiary)]">NO IMAGE</div>
                    )}
                </div>
                <div className="p-3 flex flex-col gap-1.5 min-h-[108px]">
                    <div className="flex items-start gap-2 h-[44px]">
                        <p className="text-sm font-medium leading-snug text-[var(--text-primary)] line-clamp-2">{title}</p>
                        <span
                            className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                            style={{ backgroundColor: 'var(--media-accent-soft)', color: 'var(--media-accent)' }}
                        >
                            {badgeLabel}
                        </span>
                    </div>
                    <p className="text-xs text-[var(--text-muted)]">{dateLabel}</p>
                    <div className="flex items-center gap-2 mt-auto">
                        <StarRating value={rating || 0} readonly size="sm" />
                    </div>
                </div>
            </Link>
        </Card>
    );
}
