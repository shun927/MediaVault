'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { createClient } from '@/lib/supabase';
import type { Profile } from '@/lib/types';

export default function SettingsPage() {
    const router = useRouter();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [profileForm, setProfileForm] = useState({ display_name: '', avatar_url: '' });
    const [profileLoading, setProfileLoading] = useState(true);
    const [profileSaving, setProfileSaving] = useState(false);
    const [profileMsg, setProfileMsg] = useState<string | null>(null);
    const [stats, setStats] = useState({ movies: 0, books: 0, tags: 0 });
    const [exporting, setExporting] = useState(false);
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { loadProfile(); }, []);

    async function loadProfile() {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const [{ data: profileData }, { count: mc }, { count: bc }, { count: tc }] = await Promise.all([
            supabase.from('profiles').select('*').eq('id', user.id).single(),
            supabase.from('movies').select('*', { count: 'exact', head: true }),
            supabase.from('books').select('*', { count: 'exact', head: true }),
            supabase.from('tags').select('*', { count: 'exact', head: true }),
        ]);

        if (profileData) {
            setProfile(profileData as Profile);
            setProfileForm({
                display_name: profileData.display_name || '',
                avatar_url: profileData.avatar_url || '',
            });
        }
        setStats({ movies: mc || 0, books: bc || 0, tags: tc || 0 });
        setProfileLoading(false);
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

            {/* Profile */}
            <Card hover={false}>
                <h2 className="text-lg font-semibold mb-4" style={{ color: '#e1e3e5' }}>Profile</h2>
                {profileLoading ? (
                    <div className="space-y-3">
                        <div className="animate-shimmer rounded h-10 w-full" />
                        <div className="animate-shimmer rounded h-10 w-full" />
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Avatar preview */}
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

            {/* Export */}
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

            {/* Import */}
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

            {/* Account */}
            <Card hover={false}>
                <h2 className="text-lg font-semibold mb-2" style={{ color: '#e1e3e5' }}>Account</h2>
                <Button onClick={handleLogout} variant="danger">
                    Logout
                </Button>
            </Card>
        </div>
    );
}
