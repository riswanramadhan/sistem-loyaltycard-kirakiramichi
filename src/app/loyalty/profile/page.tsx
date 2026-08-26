import type { Metadata } from "next";
import { PageHeading } from "@/components/loyalty/page-heading";
import { ProfilePanel } from "@/components/loyalty/profile-panel";
import { getMyLoyaltyState } from "@/lib/loyalty/my-loyalty-state";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const state = await getMyLoyaltyState();
  const profile = state.profile;
  const membership = state.member_program;

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
        email={profile.email ?? "Email tidak tersedia"}
        whatsapp={profile.whatsapp}
        marketingConsent={profile.marketing_consent}
        memberSince={membership?.joined_at ?? profile.created_at}
      />
    </div>
  );
}
