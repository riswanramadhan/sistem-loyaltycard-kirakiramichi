import QRCode from "qrcode";
import { QrTools } from "@/components/admin/qr-tools";
import { AdminPageHeader } from "@/components/admin/admin-ui";
import { Card } from "@/components/ui/card";
import { getAuthRedirectOrigin } from "@/lib/request-url";

export default async function AdminQrPage() {
  const joinUrl = `${await getAuthRedirectOrigin()}/join`;
  const qrDataUrl = await QRCode.toDataURL(joinUrl, {
    width: 800,
    margin: 2,
    errorCorrectionLevel: "H",
    color: { dark: "#2b2728", light: "#ffffff" },
  });

  return (
    <div className="space-y-6 print:space-y-0">
      <div className="print:hidden">
        <AdminPageHeader
          eyebrow="Acquisition"
          title="QR join program"
          description="Preview, salin, download, atau cetak QR yang membawa customer langsung ke alur join loyalty."
        />
      </div>
      <Card className="p-4 sm:p-6 print:border-0 print:p-0 print:shadow-none">
        <QrTools joinUrl={joinUrl} qrDataUrl={qrDataUrl} />
      </Card>
    </div>
  );
}
