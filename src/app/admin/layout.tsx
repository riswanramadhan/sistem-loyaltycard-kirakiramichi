import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { AdminNav } from "@/components/admin/admin-nav";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireAdmin();
  const adminName = profile.full_name?.trim() || "Admin";

  return (
    <div className="min-h-screen bg-surface lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] print:block print:bg-white">
      <AdminNav adminName={adminName} />
      <main className="min-w-0 print:bg-white">
        <div className="mx-auto w-full max-w-[100rem] px-4 py-6 sm:px-6 lg:px-8 lg:py-8 print:max-w-none print:p-0">{children}</div>
      </main>
    </div>
  );
}
