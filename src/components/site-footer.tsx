import Image from "next/image";
import { Origami } from "lucide-react";
import { SiInstagram, SiWhatsapp } from "react-icons/si";

const whatsappHref = "https://wa.me/6289529974959";
const instagramHref = "https://www.instagram.com/kirakiramichi.merchandise";

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-white px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-6 text-xs text-ink-muted lg:pb-7">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-2 font-extrabold text-ink">
            <Origami className="size-4 text-brand" aria-hidden="true" /> Need help, tomodachi?
          </p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
            <a href={whatsappHref} target="_blank" rel="noreferrer" aria-label="Hubungi Kira Kira Michi melalui WhatsApp di 089529974959" className="inline-flex items-center gap-1.5 font-bold hover:text-brand hover:underline">
              <SiWhatsapp className="size-4 text-[#25d366]" aria-hidden="true" /> 089529974959
            </a>
            <a href={instagramHref} target="_blank" rel="noreferrer" aria-label="Buka Instagram kirakiramichi.merchandise" className="inline-flex items-center gap-1.5 font-bold hover:text-brand hover:underline">
              <SiInstagram className="size-4 text-[#e4405f]" aria-hidden="true" /> kirakiramichi.merchandise
            </a>
          </div>
        </div>
        <a href="https://www.dekatlokal.com" target="_blank" rel="noreferrer" aria-label="Powered by DekatLokal" className="inline-flex items-center gap-2 font-semibold transition-opacity hover:opacity-75">
          <span>Powered by</span>
          <Image src="/dekat-lokal.png" alt="DekatLokal" width={116} height={36} className="h-7 w-auto object-contain" />
        </a>
      </div>
    </footer>
  );
}
