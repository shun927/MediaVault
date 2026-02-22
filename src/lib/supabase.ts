import { createBrowserClient } from '@supabase/ssr';

// ダミー Supabase URL/Key（環境変数未設定時の開発用フォールバック）
const FALLBACK_URL = 'https://placeholder.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2MDAwMDAwMDAsImV4cCI6MTkwMDAwMDAwMH0.placeholder';

export function createClient() {
    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_KEY
    );
}
