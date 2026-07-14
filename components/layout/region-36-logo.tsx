import Image from 'next/image';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  size?: number;
}

/**
 * REGION_36_LOGO placeholder.
 * Replace the placeholder below with the official RCCG Region 36 crest image.
 * The image file should be placed at public/images/logos/rccg-region-36-crest.png
 * Then uncomment the Image import below and swap the placeholder JSX.
 */
export function Region36Logo({ className, size = 48 }: LogoProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full border-2 border-gold bg-navy',
        className
      )}
      style={{ width: size, height: size }}
      aria-label="RCCG Region 36 crest placeholder"
    >
      <span
        className="font-serif font-bold text-gold"
        style={{ fontSize: size * 0.28 }}
      >
        R36
      </span>
    </div>
  );
}

/**
 * REGIONAL_COORDINATOR_PHOTO placeholder.
 * Replace with the official coordinator photo at public/images/photos/regional-coordinator.jpg
 */
export function RegionalCoordinatorPhoto({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-lg border-2 border-navy bg-cream-dark',
        className
      )}
      aria-label="Regional Coordinator photo placeholder"
    >
      <span className="font-serif text-navy/40">Photo</span>
    </div>
  );
}
