'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import StarRating from '@/components/ui/StarRating';
import Badge from '@/components/ui/Badge';
import { Input, Textarea } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import type { Tag } from '@/lib/types';
import { BOOK_STATUS_OPTIONS, MOVIE_STATUS_OPTIONS, MUSIC_STATUS_OPTIONS } from '@/lib/status';

type LibraryKind = 'movies' | 'books' | 'music';
const kindOptions = [{ value: 'movies', label: '映画・TV' }, { value: 'books', label: '本' }, { value: 'music', label: '音楽' }];

export default function ManualAddModal({ initialKind, tags }: { initialKind: LibraryKind; tags: Tag[] }) {
    const router = useRouter();
    const { showToast } = useToast();
    const [open, setOpen] = useState(false);
    const [kind, setKind] = useState<LibraryKind>(initialKind);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [form, setForm] = useState({ title: '', creator: '', year: '', imageUrl: '', type: 'movie', rating: 0, status: 'wishlist', note: '', tagIds: [] as string[] });

    useEffect(() => { setKind(initialKind); }, [initialKind]);
    const statusOptions = useMemo(() => kind === 'movies' ? MOVIE_STATUS_OPTIONS : kind === 'books' ? BOOK_STATUS_OPTIONS : MUSIC_STATUS_OPTIONS, [kind]);
    const creatorLabel = kind === 'movies' ? '監督（任意）' : kind === 'books' ? '著者（任意）' : 'アーティスト（任意）';

    function changeKind(next: LibraryKind) {
        setKind(next);
        setForm((current) => ({ ...current, type: next === 'movies' ? 'movie' : next === 'music' ? 'track' : current.type, status: 'wishlist' }));
    }

    function close() {
        if (saving) return;
        setOpen(false);
        setError(null);
    }

    async function submit() {
        const title = form.title.trim();
        if (!title) { setError('タイトルを入力してください'); return; }
        if (form.imageUrl && !/^https:\/\//i.test(form.imageUrl)) { setError('画像URLはHTTPSで入力してください'); return; }
        const year = form.year ? Number(form.year) : null;
        if (year !== null && (!Number.isInteger(year) || year < 1000 || year > 2100)) { setError('年は1000〜2100の範囲で入力してください'); return; }
        setSaving(true);
        setError(null);
        const completed = ['watched', 'read', 'listened'].includes(form.status);
        const now = completed ? new Date().toISOString() : null;
        const common = { title, year, rating: form.rating || null, status: form.status, note: form.note.trim() || null };
        const item = kind === 'movies'
            ? { ...common, poster_url: form.imageUrl || null, director: form.creator.trim() || null, overview: null, watched_at: now, media_type: form.type, tmdb_id: null }
            : kind === 'books'
                ? { ...common, cover_url: form.imageUrl || null, author: form.creator.trim() || null, description: null, read_at: now, google_books_id: null }
                : { ...common, artwork_url: form.imageUrl || null, artist: form.creator.trim() || null, listened_at: now, type: form.type, spotify_id: null };
        try {
            const response = await fetch('/api/library', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind, item, tagIds: form.tagIds, addHistory: completed }) });
            const payload = await response.json() as { data?: { id: string }; error?: string };
            if (!response.ok || !payload.data) throw new Error(payload.error && /[ぁ-んァ-ヶ一-龠]/.test(payload.error) ? payload.error : '追加できませんでした');
            showToast('コレクションに追加しました', 'success');
            setOpen(false);
            router.push(`/${kind}/${payload.data.id}`);
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : '追加できませんでした');
        } finally {
            setSaving(false);
        }
    }

    return <>
        <Button variant="secondary" onClick={() => setOpen(true)}>手動で追加</Button>
        <Modal isOpen={open} onClose={close} title="作品を手動で追加" size="md">
            <div className="space-y-4">
                <Select label="種類" value={kind} onChange={(event) => changeKind(event.target.value as LibraryKind)} options={kindOptions} />
                <Input label="タイトル" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} autoFocus required maxLength={200} />
                <Input label={creatorLabel} value={form.creator} onChange={(event) => setForm((current) => ({ ...current, creator: event.target.value }))} maxLength={200} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input label="年（任意）" type="number" min="1000" max="2100" inputMode="numeric" value={form.year} onChange={(event) => setForm((current) => ({ ...current, year: event.target.value }))} />
                    {(kind === 'movies' || kind === 'music') && <Select label={kind === 'movies' ? '映像種別' : '音楽種別'} value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))} options={kind === 'movies' ? [{ value: 'movie', label: '映画' }, { value: 'tv', label: 'TV' }] : [{ value: 'track', label: '曲' }, { value: 'album', label: 'アルバム' }]} />}
                </div>
                <Input label="画像URL（任意・HTTPS）" type="url" inputMode="url" value={form.imageUrl} onChange={(event) => setForm((current) => ({ ...current, imageUrl: event.target.value.trim() }))} placeholder="https://…" />
                <div><p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--input-label)]">評価</p><StarRating value={form.rating} onChange={(rating) => setForm((current) => ({ ...current, rating }))} /></div>
                <Select label="状態" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))} options={statusOptions} />
                <Textarea label="メモ（任意）" value={form.note} maxLength={2000} onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))} />
                {tags.length > 0 && <div><p className="mb-2 text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--input-label)]">タグ</p><div className="flex flex-wrap gap-2">{tags.map((tag) => <button key={tag.id} type="button" aria-pressed={form.tagIds.includes(tag.id)} onClick={() => setForm((current) => ({ ...current, tagIds: current.tagIds.includes(tag.id) ? current.tagIds.filter((id) => id !== tag.id) : [...current.tagIds, tag.id] }))} className={`touch-target rounded-full ${form.tagIds.includes(tag.id) ? 'ring-2 ring-white/40' : ''}`}><Badge label={tag.name} color={tag.color} /></button>)}</div></div>}
                {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
                <div className="flex justify-end gap-2"><Button variant="secondary" onClick={close}>キャンセル</Button><Button onClick={submit} isLoading={saving}>追加する</Button></div>
            </div>
        </Modal>
    </>;
}
