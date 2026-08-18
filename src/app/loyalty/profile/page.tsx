import type { Metadata } from "next";
import { PageHeading } from "@/components/loyalty/page-heading";
import { ProfilePanel } from "@/components/loyalty/profile-panel";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Profile" };

type ProfileRow = {
  full_name: string;
  whatsapp: string | null;
  marketing_consent: boolean;
  created_at: string;
};

type MembershipRow = { joined_at: string };

export default async function ProfilePage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [profileResult, membershipResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, whatsapp, marketing_consent, created_at")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("member_programs")
      .select("joined_at")
      .eq("user_id", user.id)
      .order("joined_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  if (profileResult.error || membershipResult.error) {
    throw new Error("PROFILE_DATA_UNAVAILABLE");
  }

  const profile = profileResult.data as ProfileRow | null;
  const membership = membershipResult.data as MembershipRow | null;

  if (!profile) throw new Error("PROFILE_DATA_UNAVAILABLE");

  return (
    <div className="space-y-7">
      <PageHeading
        eyebrow="Akun kamu"
        title="Profile"
        description="Periksa data membership dan atur preferensi yang aman untuk kamu ubah."
      />
      <ProfilePanel
        fullName={profile.full_name}
        email={user.email ?? "Email tidak tersedia"}
        whatsapp={profile.whatsapp}
        marketingConsent={profile.marketing_consent}
        memberSince={membership?.joined_at ?? profile.created_at}
      />
    </div>
  );
}

