import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const email = (process.env.BOOTSTRAP_ADMIN_EMAIL || "kirakiramichi@admin.com")
  .trim()
  .toLowerCase();
const password = process.env.BOOTSTRAP_ADMIN_PASSWORD || "kirakiramichi0110";

if (!url || !serviceRoleKey) {
  throw new Error(
    "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before bootstrapping the admin.",
  );
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let user = null;
for (let page = 1; page <= 10 && !user; page += 1) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 });
  if (error) throw error;
  user = data.users.find((candidate) => candidate.email?.toLowerCase() === email) ?? null;
  if (data.users.length < 100) break;
}

if (user) {
  const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
    password,
    email_confirm: true,
    user_metadata: { ...user.user_metadata, full_name: "Kira Kira Michi Admin" },
  });
  if (error) throw error;
  user = data.user;
} else {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "Kira Kira Michi Admin" },
  });
  if (error) throw error;
  user = data.user;
}

const { error: profileError } = await supabase
  .from("profiles")
  .update({ role: "admin" })
  .eq("id", user.id);

if (profileError) throw profileError;

console.log(`Admin ${email} is ready. Change the bootstrap password after the first login.`);
