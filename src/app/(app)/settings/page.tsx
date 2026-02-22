'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { createClient } from '@/lib/supabase';
import type { Profile, Tag } from '@/lib/types';

const PRESET_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', '#64748b', '#a855f7'];

export default function SettingsPage() {
    const router = useRouter();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [profileForm, setProfileForm] = useState({ display_name: '', avatar_url: '' });
    const [profileLoading, setProfileLoading] = useState(true);
    const [profileSaving, setProfileSaving] = useState(false);
    const [profileMsg, setProfileMsg] = useState<string | null>(null);
    const [stats, setStats] = useState({ movies: 0, books: 0, tags: 0 });
    const [tags, setTags] = useState<Tag[]>([]);
    const [tagCounts, setTagCounts] = useState<Record<string, number>>({});
    const [tagLoading, setTagLoading] = useState(true);
    const [showCreateTag, setShowCreateTag] = useState(false);
    const [editTag, setEditTag] = useState<Tag | null>(null);
    const [tagForm, setTagForm] = useState({ name: '', color: '#6366f1' });
    const [exporting, setExporting] = useState(false);
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadProfile();
        loadTags();
    }, []);

    async function loadProfile() {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const [{ data: profileData }, { count: mc }, { count: bc }] = await Promise.all([
            supabase.from('profiles').select('*').eq('id', user.id).single(),
            supabase.from('movies').select('*', { count: 'exact', head: true }),
            supabase.from('books').select('*', { count: 'exact', head: true }),
        ]);

        if (profileData) {
            setProfile(profileData as Profile);
            setProfileForm({
                display_name: profileData.display_name || '',
                avatar_url: profileData.avatar_url || '',
            });
        }
        setStats((prev) => ({ ...prev, movies: mc || 0, books: bc || 0 }));
        setProfileLoading(false);
    }

    async function loadTags() {
        setTagLoading(true);
        const supabase = createClient();
        const { data } = await supabase.from('tags').select('*').order('name');
        const tagList = (data as Tag[]) || [];
        setTags(tagList);

        const counts: Record<string, number> = {};
        for (const tag of tagList) {
            const [{ count: mc }, { count: bc }] = await Promise.all([
                supabase.from('movie_tags').select('*', { count: 'exact', head: true }).eq('tag_id', tag.id),
                supabase.from('book_tags').select('*', { count: 'exact', head: true }).eq('tag_id', tag.id),
            ]);
            counts[tag.id] = (mc || 0) + (bc || 0);
        }

        setTagCounts(counts);
        setStats((prev) => ({ ...prev, tags: tagList.length }));
        setTagLoading(false);
    }

    async function createTag() {
        if (!tagForm.name.trim()) return;
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        await supabase.from('tags').insert({ user_id: user.id, name: tagForm.name.trim(), color: tagForm.color });
        setTagForm({ name: '', color: '#6366f1' });
        setShowCreateTag(false);
        loadTags();
    }

    async function updateTag() {
        if (!editTag || !tagForm.name.trim()) return;
        const supabase = createClient();
        await supabase.from('tags').update({ name: tagForm.name.trim(), color: tagForm.color }).eq('id', editTag.id);
        setEditTag(null);
        setTagForm({ name: '', color: '#6366f1' });
        loadTags();
    }

    async function deleteTag(id: string) {
        if (!confirm('Delete this tag?')) return;
        const supabase = createClient();
        await supabase.from('tags').delete().eq('id', id);
        loadTags();
    }

    async function handleSaveProfile() {
        if (!profile) return;
        setProfileSaving(true);
        setProfileMsg(null);
        const supabase = createClient();
        const { error } = await supabase.from('profiles').update({
            display_name: profileForm.display_name.trim() || null,
            avatar_url: profileForm.avatar_url.trim() || null,
            updated_at: new Date().toISOString(),
        }).eq('id', profile.id);

        setProfileMsg(error ? 'Failed to update profile' : 'Profile updated!');
        setProfileSaving(false);
        if (!error) loadProfile();
    }

    async function handleExport() {
        setExporting(true);
        try {
            const res = await fetch('/api/export');
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `mediavault-export-${new Date().toISOString().substr(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            alert('Export failed');
        }
        setExporting(false);
    }

    async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        setImporting(true);
        setImportResult(null);
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            const res = await fetch('/api/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (res.ok) {
                setImportResult('Import completed successfully!');
                await loadTags();
                await loadProfile();
            } else {
                setImportResult('Import failed');
            }
        } catch {
            setImportResult('Failed to read file');
        }
        setImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }

    async function handleLogout() {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push('/login');
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold" style={{ color: '#e1e3e5' }}>Settings</h1>

            <Card hover={false}>
                <h2 className="text-lg font-semibold mb-4" style={{ color: '#e1e3e5' }}>Profile</h2>
                {profileLoading ? (
                    <div className="space-y-3">
                        <div className="animate-shimmer rounded h-10 w-full" />
                        <div className="animate-shimmer rounded h-10 w-full" />
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-[var(--border)] shrink-0" style={{ background: '#242c34' }}>
                                {profileForm.avatar_url ? (
                                    <img src={profileForm.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-xl font-bold" style={{ color: '#556' }}>
                                        {profileForm.display_name?.charAt(0)?.toUpperCase() || '?'}
                                    </div>
                                )}
                            </div>
                            <div>
                                <p className="text-sm font-medium" style={{ color: '#e1e3e5' }}>{profileForm.display_name || 'No name set'}</p>
                                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                                    {stats.movies} films · {stats.books} books · {stats.tags} tags
                                </p>
                                {profile && (
                                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                                        Joined {new Date(profile.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}
                                    </p>
                                )}
                            </div>
                        </div>

                        <Input
                            label="Display Name"
                            value={profileForm.display_name}
                            onChange={e => setProfileForm(p => ({ ...p, display_name: e.target.value }))}
                            placeholder="Your name"
                        />
                        <Input
                            label="Avatar URL"
                            value={profileForm.avatar_url}
                            onChange={e => setProfileForm(p => ({ ...p, avatar_url: e.target.value }))}
                            placeholder="https://..."
                        />
                        <div className="flex items-center gap-3">
                            <Button onClick={handleSaveProfile} isLoading={profileSaving}>Save</Button>
                            {profileMsg && (
                                <p className={`text-sm ${profileMsg.includes('updated') ? 'text-green-400' : 'text-red-400'}`}>
                                    {profileMsg}
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </Card>

            <Card hover={false}>
                <div className="flex items-center justify-between mb-4 gap-3">
                    <div>
                        <h2 className="text-lg font-semibold" style={{ color: '#e1e3e5' }}>Tag Management</h2>
                        <p className="text-sm text-[var(--text-muted)] mt-1">Create, edit, and delete tags from Settings</p>
                    </div>
                    <Button onClick={() => { setShowCreateTag(true); setTagForm({ name: '', color: '#6366f1' }); }}>+ Create Tag</Button>
                </div>

                {tagLoading ? (
                    <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="animate-shimmer rounded-xl h-14" />)}</div>
                ) : tags.length === 0 ? (
                    <div className="text-center py-10 text-[var(--text-muted)]">
                        <p className="text-sm">No tags yet. Create one to organize your collection.</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {tags.map(tag => (
                            <div key={tag.id} className="flex items-center justify-between rounded-xl px-4 py-3" style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}>
                                <div className="flex items-center gap-3">
                                    <Badge label={tag.name} color={tag.color} size="md" />
                                    <span className="text-xs text-[var(--text-muted)]">{tagCounts[tag.id] || 0} items</span>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => { setEditTag(tag); setTagForm({ name: tag.name, color: tag.color }); }} className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" /></svg>
                                    </button>
                                    <button onClick={() => deleteTag(tag.id)} className="p-1.5 rounded-lg text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            <Card hover={false}>
                <h2 className="text-lg font-semibold mb-2" style={{ color: '#e1e3e5' }}>Data Export</h2>
                <p className="text-sm text-[var(--text-muted)] mb-4">
                    Export all your records as a JSON file
                </p>
                <Button onClick={handleExport} isLoading={exporting} variant="secondary">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    Export JSON
                </Button>
            </Card>

            <Card hover={false}>
                <h2 className="text-lg font-semibold mb-2" style={{ color: '#e1e3e5' }}>Data Import</h2>
                <p className="text-sm text-[var(--text-muted)] mb-4">
                    Restore your data from an exported JSON file
                </p>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleImport}
                    className="hidden"
                />
                <Button
                    onClick={() => fileInputRef.current?.click()}
                    isLoading={importing}
                    variant="secondary"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                    Import JSON
                </Button>
                {importResult && (
                    <p className={`mt-3 text-sm ${importResult.includes('successfully') ? 'text-green-400' : 'text-red-400'}`}>
                        {importResult}
                    </p>
                )}
            </Card>

            <Card hover={false}>
                <h2 className="text-lg font-semibold mb-2" style={{ color: '#e1e3e5' }}>Account</h2>
                <Button onClick={handleLogout} variant="danger">
                    Logout
                </Button>
            </Card>

            <Modal
                isOpen={showCreateTag || !!editTag}
                onClose={() => { setShowCreateTag(false); setEditTag(null); }}
                title={editTag ? 'Edit Tag' : 'Create Tag'}
                size="sm"
            >
                <div className="space-y-4">
                    <Input label="Name" placeholder="e.g. Sci-Fi, Mystery..." value={tagForm.name} onChange={e => setTagForm(p => ({ ...p, name: e.target.value }))} />
                    <div>
                        <label className="block text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2">Color</label>
                        <div className="flex flex-wrap gap-2">
                            {PRESET_COLORS.map(color => (
                                <button
                                    key={color}
                                    type="button"
                                    onClick={() => setTagForm(p => ({ ...p, color }))}
                                    className={`w-8 h-8 rounded-full cursor-pointer transition-transform hover:scale-110 ${tagForm.color === color ? 'ring-2 ring-white ring-offset-2 ring-offset-[var(--bg-secondary)] scale-110' : ''}`}
                                    style={{ backgroundColor: color }}
                                />
                            ))}
                        </div>
                    </div>
                    <div className="flex items-center gap-3 pt-1">
                        <span className="text-sm text-[var(--text-primary)]/50">Preview:</span>
                        <Badge label={tagForm.name || 'Tag Name'} color={tagForm.color} size="md" />
                    </div>
                    <Button onClick={editTag ? updateTag : createTag} className="w-full">{editTag ? 'Update' : 'Create'}</Button>
                </div>
            </Modal>
        </div>
    );
}
