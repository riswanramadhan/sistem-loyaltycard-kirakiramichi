import { SiInstagram, SiWhatsapp } from "react-icons/si";

export function CustomerSupport() {
  return (
    <aside className="mx-auto w-full max-w-5xl px-4 pb-7 sm:px-6" aria-label="Bantuan dan order Kira Kira Michi">
      <div className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div>
          <p className="font-extrabold text-ink">Mau order atau ada kendala?</p>
          <p className="mt-1 text-xs leading-5 text-ink-muted">Hubungi tim Kira Kira Michi. Kami bantu sampai beres.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="https://wa.me/6289529974959" target="_blank" rel="noreferrer" className="group inline-flex min-h-10 items-center gap-2 rounded-xl bg-brand-soft px-3 text-xs font-extrabold text-brand hover:bg-brand hover:text-white" aria-label="WhatsApp Kira Kira Michi 089529974959">
            <SiWhatsapp className="size-4 text-[#25d366] group-hover:text-white" aria-hidden="true" /> 089529974959
          </a>
          <a href="https://www.instagram.com/kirakiramichi.merchandise" target="_blank" rel="noreferrer" className="group inline-flex min-h-10 items-center gap-2 rounded-xl bg-surface-muted px-3 text-xs font-extrabold text-ink hover:bg-ink hover:text-white" aria-label="Instagram Kira Kira Michi">
            <SiInstagram className="size-4 text-[#e4405f] group-hover:text-white" aria-hidden="true" /> Instagram
          </a>
        </div>
      </div>
    </aside>
  );
}
