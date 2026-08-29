import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Origin": "*",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authorization = request.headers.get("Authorization");

  if (!supabaseUrl || !anonKey || !serviceRoleKey) return json({ error: "service_not_configured" }, 500);
  if (!authorization) return json({ error: "authentication_required" }, 401);

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const { data: callerData, error: callerError } = await callerClient.auth.getUser();
  if (callerError || !callerData.user) return json({ error: "authentication_required" }, 401);

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: callerProfile, error: profileError } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", callerData.user.id)
    .maybeSingle();

  if (profileError || callerProfile?.role !== "admin") return json({ error: "admin_access_required" }, 403);

  let input: { fullName?: unknown; email?: unknown };
  try {
    input = await request.json();
  } catch {
    return json({ error: "invalid_payload" }, 400);
  }

  const fullName = typeof input.fullName === "string" ? input.fullName.trim() : "";
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  if (fullName.length < 2 || fullName.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: "invalid_payload" }, 400);
  }

  const siteUrl = (Deno.env.get("SITE_URL") || "https://kirakiraloyaltycard.web.id").replace(/\/$/, "");
  const { data: invited, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName, account_type: "admin_invite" },
    redirectTo: `${siteUrl}/auth/callback?next=/admin`,
  });

  if (inviteError || !invited.user) {
    const duplicate = /already|registered|exists/i.test(inviteError?.message ?? "");
    return json({ error: duplicate ? "email_already_registered" : "invite_failed" }, duplicate ? 409 : 502);
  }

  const { error: promoteError } = await adminClient
    .from("profiles")
    .update({ role: "admin", full_name: fullName })
    .eq("id", invited.user.id);

  if (promoteError) {
    const { error: rollbackError } = await adminClient.auth.admin.deleteUser(invited.user.id);
    if (rollbackError) console.error("invite rollback failed", rollbackError.message);
    return json({ error: "promotion_failed" }, 500);
  }

  return json({ ok: true, email });
});
