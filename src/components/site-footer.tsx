import { Camera, ExternalLink, MessageCircleHeart, Origami } from "lucide-react";

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
            <a href={whatsappHref} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-bold hover:text-brand hover:underline">
              <MessageCircleHeart className="size-3.5" aria-hidden="true" /> WA 089529974959
            </a>
            <a href={instagramHref} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-bold hover:text-brand hover:underline">
              <Camera className="size-3.5" aria-hidden="true" /> @kirakiramichi.merchandise
            </a>
          </div>
        </div>
        <a href="https://www.dekatlokal.com" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-semibold hover:text-brand hover:underline">
          Powered by DekatLokal <ExternalLink className="size-3" aria-hidden="true" />
        </a>
      </div>
    </footer>
  );
}
