'use client';

import Link from 'next/link';
import Image from 'next/image';
import Card from '@/components/ui/Card';
import StarRating from '@/components/ui/StarRating';
import QuickLogButton from '@/components/media/QuickLogButton';

type LibraryKind = 'movies' | 'books' | 'music';

interface UnifiedItemCardProps {
    href: string;
    title: string;
    imageUrl: string | null;
    badgeLabel: string;
    dateLabel: string;
    rating: number | null;
    preserveImage?: boolean;
    compact?: boolean;
    quickLog?: { kind: LibraryKind; itemId: string; onLogged?: (occurredAt: string) => void };
}

export default function UnifiedItemCard({ href, title, imageUrl, badgeLabel, dateLabel, rating, preserveImage = false, compact = false, quickLog }: UnifiedItemCardProps) {
    return <Card className="p-0 overflow-hidden group relative h-full flex flex-col">
        <Link href={href} className="no-underline block">
            <div className={`${compact ? 'aspect-[3/4]' : 'aspect-[2/3]'} bg-transparent relative shrink-0`}>
                {imageUrl ? <Image src={imageUrl} alt="" fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw" className={`block w-full h-full object-center group-hover:scale-105 transition-transform duration-500 ${preserveImage ? 'object-contain' : 'object-cover'}`} /> : <div className="w-full h-full flex items-center justify-center text-xs font-medium text-[var(--text-muted)] bg-[var(--bg-tertiary)]">画像なし</div>}
            </div>
        </Link>
        <div className={`${compact ? 'p-2 min-h-0 gap-1' : 'p-3 min-h-[132px] gap-1.5'} flex flex-col grow`}>
            <Link href={href} className={`${compact ? 'text-xs line-clamp-1' : 'text-sm line-clamp-2 min-h-[44px]'} font-medium leading-snug text-[var(--text-primary)] no-underline`}>{title}</Link>
            <span className="w-fit inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider" style={{ backgroundColor: 'var(--media-accent-soft)', color: 'var(--media-accent)' }}>{badgeLabel}</span>
            {!compact && <>
                <p className="text-xs text-[var(--text-muted)]">{dateLabel}</p>
                <div className="flex items-end justify-between gap-2 mt-auto">
                    <StarRating value={rating || 0} readonly size="sm" />
                    {quickLog && <QuickLogButton kind={quickLog.kind} itemId={quickLog.itemId} onLogged={quickLog.onLogged} />}
                </div>
            </>}
        </div>
    </Card>;
}
