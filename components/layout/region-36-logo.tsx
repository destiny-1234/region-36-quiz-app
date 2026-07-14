import Image from 'next/image';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  size?: number;
}

// REGION_36_LOGO — the official crest, at public/images/logos/image.png.
// To swap in a different file later, replace that file and this path stays
// the same, or rename both together.
export function Region36Logo({ className, size = 48 }: LogoProps) {
  return (
    <div
      className={cn(
        'relative flex items-center justify-center overflow-hidden rounded-full border-2 border-gold bg-white',
        className
      )}
      style={{ width: size, height: size }}
    >
      <Image
        src="/images/logos/image.png"
        alt="RCCG Region 36 crest"
        width={size}
        height={size}
        className="h-full w-full object-contain p-0.5"
        priority
      />
    </div>
  );
}

// REGIONAL_COORDINATOR_PHOTO — at public/images/photos/image.png.
// Swap that file for the real coordinator portrait when it's supplied.
export function RegionalCoordinatorPhoto({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg border-2 border-navy bg-cream-dark',
        className
      )}
    >
      <Image
        src="/images/photos/image.png"
        alt="Regional Coordinator"
        fill
        className="object-cover"
      />
    </div>
  );
}
