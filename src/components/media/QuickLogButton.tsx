'use client';

import { useState, type MouseEvent } from 'react';
import { useToast } from '@/components/ui/Toast';

type LibraryKind = 'movies' | 'books' | 'music';

const labels: Record<LibraryKind, string> = {
    movies: '今日観た',
    books: '今日読んだ',
    music: '今日聴いた',
};

export default function QuickLogButton({ kind, itemId, onLogged, className = '' }: { kind: LibraryKind; itemId: string; onLogged?: (occurredAt: string) => void; className?: string }) {
    const [saving, setSaving] = useState(false);
    const { showToast } = useToast();

    async function handleClick(event: MouseEvent<HTMLButtonElement>) {
        event.preventDefault();
        event.stopPropagation();
        if (saving) return;
        setSaving(true);
        try {
            const response = await fetch(`/api/library/${kind}/${itemId}/history`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            });
            const payload = await response.json() as { data?: { occurredAt: string }; error?: string };
            if (!response.ok || !payload.data) throw new Error(payload.error && /[ぁ-んァ-ヶ一-龠]/.test(payload.error) ? payload.error : '記録できませんでした');
            onLogged?.(payload.data.occurredAt);
            showToast(`${labels[kind]}として記録しました`, 'success');
        } catch (error) {
            showToast(error instanceof Error ? error.message : '記録できませんでした', 'error');
        } finally {
            setSaving(false);
        }
    }

    return <button type="button" onClick={handleClick} disabled={saving} aria-busy={saving} className={`touch-target inline-flex items-center justify-center rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] px-2.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-60 ${className}`}>
        {saving ? '記録中…' : labels[kind]}
    </button>;
}
