import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { safeReturnPath } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";

const allowedEmailTypes = new Set<EmailOtpType>([
  "email",
  "signup",
  "recovery",
  "magiclink",
]);

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const rawType = url.searchParams.get("type") as EmailOtpType | null;
  const requestedNext = url.searchParams.get("next");
  const next =
    requestedNext === "/auth/update-password"
      ? requestedNext
      : safeReturnPath(requestedNext);

  if (!tokenHash || !rawType || !allowedEmailTypes.has(rawType)) {
    return NextResponse.redirect(new URL("/auth/login?error=callback", url.origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: rawType,
  });

  if (error) {
    return NextResponse.redirect(new URL("/auth/login?error=callback", url.origin));
  }

  if (next.startsWith("/admin")) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: profile } = user
      ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
      : { data: null };

    if (!user || profile?.role !== "admin") {
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL("/auth/login?error=admin-access", url.origin));
    }
  }

  if (next.startsWith("/loyalty")) {
    const { error: joinError } = await supabase.rpc("join_loyalty_program", {
      p_program_slug: "kira-kira-michi-loyalty",
    });
    if (joinError) console.error("Membership initialization failed", joinError.message);
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
