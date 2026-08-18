import Image from "next/image";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  priority?: boolean;
};

export function BrandLogo({ className, priority = false }: BrandLogoProps) {
  return (
    <span className={cn("relative block h-12 w-40 overflow-hidden", className)}>
      <Image
        src="/kira-kira-michi-logo.png"
        alt="Kira Kira Michi"
        fill
        priority={priority}
        sizes="160px"
        className="object-contain"
      />
    </span>
  );
}
