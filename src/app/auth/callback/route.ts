import { NextResponse, type NextRequest } from "next/server";
import { safeReturnPath } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const requestedNext = url.searchParams.get("next");
  const next =
    requestedNext === "/auth/update-password"
      ? requestedNext
      : safeReturnPath(requestedNext);

  if (!code) return NextResponse.redirect(new URL("/auth/login?error=callback", url.origin));
  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(new URL("/auth/login?error=callback", url.origin));

  if (next.startsWith("/loyalty")) {
    const { error: joinError } = await supabase.rpc("join_loyalty_program", {
      p_program_slug: "kira-kira-michi-loyalty",
    });
    if (joinError) console.error("Membership initialization failed", joinError.message);
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
