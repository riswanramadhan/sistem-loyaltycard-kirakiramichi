import { type NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/env";
import { copyResponseCookies, updateSession } from "@/lib/supabase/proxy";

const protectedPrefixes = ["/loyalty", "/admin"];
const authPrefixes = ["/auth/login", "/auth/register", "/auth/admin-login"];

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isProtected = protectedPrefixes.some((prefix) =>
    path.startsWith(prefix),
  );

  if (!isSupabaseConfigured()) {
    if (isProtected || path === "/join") {
      return NextResponse.redirect(new URL("/configuration", request.url));
    }
    return NextResponse.next();
  }

  const { response, user } = await updateSession(request);

  if (isProtected && !user) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("next", `${path}${request.nextUrl.search}`);
    return copyResponseCookies(response, NextResponse.redirect(loginUrl));
  }

  if (user && authPrefixes.some((prefix) => path.startsWith(prefix))) {
    return copyResponseCookies(
      response,
      NextResponse.redirect(new URL("/loyalty", request.url)),
    );
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
