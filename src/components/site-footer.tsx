import Image from "next/image";

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-white px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-4 text-xs text-ink-muted lg:pb-7 lg:pt-5">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-center gap-3 text-center md:flex-row md:justify-between md:text-left">
        <p className="font-semibold">&copy; {new Date().getFullYear()} Kira Kira Michi</p>
        <a href="https://www.dekatlokal.com" target="_blank" rel="noreferrer" aria-label="Powered by DekatLokal" className="inline-flex items-center justify-center gap-2 font-semibold transition-opacity hover:opacity-75">
          <span>Powered by</span>
          <Image src="/dekat-lokal.png" alt="DekatLokal" width={116} height={36} className="h-7 w-auto object-contain" />
        </a>
      </div>
    </footer>
  );
}
