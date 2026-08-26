import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceRoleKey =
  process.env.SUPABASE_SECRET_KEY?.trim() ||
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const email = (process.env.BOOTSTRAP_ADMIN_EMAIL || "kirakiramichi@dekatlokal.com")
  .trim()
  .toLowerCase();
const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;

if (!url || !serviceRoleKey || !password) {
  throw new Error(
    "Set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY (or legacy SUPABASE_SERVICE_ROLE_KEY), and BOOTSTRAP_ADMIN_PASSWORD before bootstrapping the admin.",
  );
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const authUsers = [];
for (let page = 1; page <= 10; page += 1) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 });
  if (error) throw error;
  authUsers.push(...data.users);
  if (data.users.length < 100) break;
}

let user = authUsers.find((candidate) => candidate.email?.toLowerCase() === email) ?? null;

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

if (user.app_metadata?.initial_admin_cleanup_completed !== true) {
  const { data: adminProfiles, error: adminsError } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "admin")
    .neq("id", user.id);

  if (adminsError) throw adminsError;

  for (const oldAdmin of adminProfiles ?? []) {
    const oldAuthUser = authUsers.find((candidate) => candidate.id === oldAdmin.id);
    if (!oldAuthUser) {
      throw new Error(`Could not resolve previous admin ${oldAdmin.id} in the Auth user list.`);
    }

    const { error: markError } = await supabase.auth.admin.updateUserById(oldAdmin.id, {
      app_metadata: {
        ...oldAuthUser.app_metadata,
        admin_replacement_id: user.id,
      },
    });
    if (markError) throw markError;

    const { error: deleteError } = await supabase.auth.admin.deleteUser(oldAdmin.id);
    if (deleteError) throw deleteError;
    console.log(`Retired previous admin ${oldAuthUser.email ?? oldAdmin.id}.`);
  }

  const { error: cleanupMarkerError } = await supabase.auth.admin.updateUserById(user.id, {
    app_metadata: {
      ...user.app_metadata,
      initial_admin_cleanup_completed: true,
    },
  });
  if (cleanupMarkerError) throw cleanupMarkerError;
} else {
  console.log("Initial admin cleanup was already completed; additional admin accounts were preserved.");
}

console.log(`Admin ${email} is ready and previous admin accounts have been retired.`);
