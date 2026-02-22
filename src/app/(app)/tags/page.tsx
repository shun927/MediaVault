'use client';

import { useEffect, useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { createClient } from '@/lib/supabase';
import type { Tag } from '@/lib/types';

const PRESET_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', '#64748b', '#a855f7'];

export default function TagsPage() {
    const [tags, setTags] = useState<Tag[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [editTag, setEditTag] = useState<Tag | null>(null);
    const [form, setForm] = useState({ name: '', color: '#6366f1' });
    const [tagCounts, setTagCounts] = useState<Record<string, number>>({});

    useEffect(() => { loadTags(); }, []);

    async function loadTags() {
        const supabase = createClient();
        const { data } = await supabase.from('tags').select('*').order('name');
        const tagList = (data as Tag[]) || [];
        setTags(tagList);

        // 各タグの使用数を取得
        const counts: Record<string, number> = {};
        for (const tag of tagList) {
            const [{ count: mc }, { count: bc }] = await Promise.all([
                supabase.from('movie_tags').select('*', { count: 'exact', head: true }).eq('tag_id', tag.id),
                supabase.from('book_tags').select('*', { count: 'exact', head: true }).eq('tag_id', tag.id),
            ]);
            counts[tag.id] = (mc || 0) + (bc || 0);
        }
        setTagCounts(counts);
        setLoading(false);
    }

    async function createTag() {
        if (!form.name.trim()) return;
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        await supabase.from('tags').insert({ user_id: user.id, name: form.name.trim(), color: form.color });
        setForm({ name: '', color: '#6366f1' });
        setShowCreate(false);
        loadTags();
    }

    async function updateTag() {
        if (!editTag || !form.name.trim()) return;
        const supabase = createClient();
        await supabase.from('tags').update({ name: form.name.trim(), color: form.color }).eq('id', editTag.id);
        setEditTag(null);
        setForm({ name: '', color: '#6366f1' });
        loadTags();
    }

    async function deleteTag(id: string) {
        if (!confirm('Delete this tag?')) return;
        const supabase = createClient();
        await supabase.from('tags').delete().eq('id', id);
        loadTags();
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold" style={{ color: '#e1e3e5' }}>Tags</h1>
                    <p className="text-sm text-[var(--text-muted)] mt-1">{tags.length} tags</p>
                </div>
                <Button onClick={() => { setShowCreate(true); setForm({ name: '', color: '#6366f1' }); }}>+ Create Tag</Button>
            </div>

            {loading ? (
                <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="animate-shimmer rounded-xl h-16" />)}</div>
            ) : tags.length === 0 ? (
                <Card hover={false}>
                    <div className="text-center py-12 text-[var(--text-muted)]">
                        <p className="text-lg mb-2 font-medium" style={{ color: '#556' }}>No Tags</p>
                        <p className="text-sm">Create tags to organize your collection</p>
                    </div>
                </Card>
            ) : (
                <div className="space-y-2">
                    {tags.map(tag => (
                        <Card key={tag.id} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Badge label={tag.name} color={tag.color} size="md" />
                                <span className="text-xs text-[var(--text-muted)]">{tagCounts[tag.id] || 0} items</span>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => { setEditTag(tag); setForm({ name: tag.name, color: tag.color }); }} className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" /></svg>
                                </button>
                                <button onClick={() => deleteTag(tag.id)} className="p-1.5 rounded-lg text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                                </button>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* 作成 / 編集モーダル */}
            <Modal isOpen={showCreate || !!editTag} onClose={() => { setShowCreate(false); setEditTag(null); }} title={editTag ? 'Edit Tag' : 'Create Tag'} size="sm">
                <div className="space-y-4">
                    <Input label="Name" placeholder="e.g. Sci-Fi, Mystery..." value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
                    <div>
                        <label className="block text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2">Color</label>
                        <div className="flex flex-wrap gap-2">
                            {PRESET_COLORS.map(color => (
                                <button key={color} onClick={() => setForm(p => ({ ...p, color }))} className={`w-8 h-8 rounded-full cursor-pointer transition-transform hover:scale-110 ${form.color === color ? 'ring-2 ring-white ring-offset-2 ring-offset-[var(--bg-secondary)] scale-110' : ''}`} style={{ backgroundColor: color }} />
                            ))}
                        </div>
                    </div>
                    <div className="flex items-center gap-3 pt-1">
                        <span className="text-sm text-[var(--text-primary)]/50">Preview:</span>
                        <Badge label={form.name || 'Tag Name'} color={form.color} size="md" />
                    </div>
                    <Button onClick={editTag ? updateTag : createTag} className="w-full">{editTag ? 'Update' : 'Create'}</Button>
                </div>
            </Modal>
        </div>
    );
}
