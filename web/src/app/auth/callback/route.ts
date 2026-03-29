import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Only allow same-origin relative paths (avoid open redirects). */
function safeNextPath(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/";
  }
  return next;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const oauthError = url.searchParams.get("error");
  const oauthDescription = url.searchParams.get("error_description");

  if (oauthError) {
    const login = new URL("/login", url.origin);
    login.searchParams.set("error", "oauth");
    if (oauthDescription) {
      login.searchParams.set("details", oauthDescription.slice(0, 200));
    }
    return NextResponse.redirect(login);
  }

  const nextPath = safeNextPath(url.searchParams.get("next"));
  const redirectTo = new URL(nextPath, url.origin);

  if (code) {
    // Session cookies must be set on THIS response — using cookies() + redirect often drops them.
    const response = NextResponse.redirect(redirectTo);

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      },
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return response;
    }
  }

  const fail = new URL("/login", url.origin);
  fail.searchParams.set("error", "auth");
  return NextResponse.redirect(fail);
}
