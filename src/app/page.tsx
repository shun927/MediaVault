import { redirect } from 'next/navigation';

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const code = typeof params.code === 'string' ? params.code : undefined;
  const next = typeof params.next === 'string' ? params.next : undefined;

  if (code) {
    const url = new URL('/auth/callback', 'http://localhost');
    url.searchParams.set('code', code);
    if (next) url.searchParams.set('next', next);
    redirect(url.pathname + url.search);
  }

  redirect('/dashboard');
}
