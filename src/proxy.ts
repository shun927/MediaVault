import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const hasOAuthCode = request.nextUrl.searchParams.has('code');

    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/api') ||
        pathname.startsWith('/auth') ||
        pathname.startsWith('/share-target') ||
        (pathname === '/' && hasOAuthCode) ||
        pathname === '/favicon.ico' ||
        pathname === '/sw.js' ||
        pathname === '/manifest.json'
    ) {
        return NextResponse.next();
    }

    let supabaseResponse = NextResponse.next({ request });

    try {
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return request.cookies.getAll();
                    },
                    setAll(cookiesToSet) {
                        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
                        supabaseResponse = NextResponse.next({ request });
                        cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
                    },
                },
            }
        );

        const { data: { user } } = await supabase.auth.getUser();

        if (!user && pathname !== '/login') {
            const url = request.nextUrl.clone();
            url.pathname = '/login';
            const next = `${pathname}${request.nextUrl.search}`;
            url.searchParams.set('next', next || '/dashboard');
            return NextResponse.redirect(url);
        }

        if (user && pathname === '/login') {
            const url = request.nextUrl.clone();
            url.pathname = '/dashboard';
            return NextResponse.redirect(url);
        }
    } catch (e) {
        console.error('Proxy auth error:', e);
        if (pathname !== '/login') {
            const url = request.nextUrl.clone();
            url.pathname = '/login';
            return NextResponse.redirect(url);
        }
    }

    return supabaseResponse;
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.json|icons).*)'],
};
