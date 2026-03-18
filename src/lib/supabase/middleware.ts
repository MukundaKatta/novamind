import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Protected routes
  const isAuthPage = request.nextUrl.pathname.startsWith("/auth");
  const isDashboard = request.nextUrl.pathname.startsWith("/dashboard");
  const isApiRoute = request.nextUrl.pathname.startsWith("/api");

  if (!user && isDashboard) {
    const redirectUrl = new URL("/auth/login", request.url);
    redirectUrl.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && isAuthPage) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Rate limiting for API routes
  if (isApiRoute && request.nextUrl.pathname.startsWith("/api/v1/")) {
    const apiKey = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing API key. Include Authorization: Bearer <key>" },
        { status: 401 }
      );
    }
  }

  return response;
}
