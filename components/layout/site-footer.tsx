import Link from 'next/link';
import { Region36Logo } from './region-36-logo';

export function SiteFooter() {
  return (
    <footer className="border-t border-navy/10 bg-navy text-cream">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-3">
              <Region36Logo size={36} />
              <div>
                <p className="font-serif text-lg font-semibold text-cream">Region 36</p>
                <p className="text-xs text-gold">Quiz Challenge</p>
              </div>
            </div>
            <p className="mt-4 text-sm text-cream/70 max-w-xs">
              The official quiz competition platform for RCCG Region 36 Children&apos;s Ministry.
              Parish to Regional stages across five age categories.
            </p>
          </div>

          <div>
            <h3 className="font-serif text-sm font-semibold text-gold">Quick links</h3>
            <ul className="mt-4 space-y-2 text-sm">
              <li><Link href="/register/child" className="text-cream/70 hover:text-gold transition-colors">Register a child</Link></li>
              <li><Link href="/register/coordinator" className="text-cream/70 hover:text-gold transition-colors">Coordinator sign-up</Link></li>
              <li><Link href="/signin" className="text-cream/70 hover:text-gold transition-colors">Parent login</Link></li>
              <li><Link href="/leaderboard" className="text-cream/70 hover:text-gold transition-colors">Leaderboard</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-serif text-sm font-semibold text-gold">Legal</h3>
            <ul className="mt-4 space-y-2 text-sm">
              <li><Link href="/privacy" className="text-cream/70 hover:text-gold transition-colors">Privacy policy</Link></li>
              <li><Link href="/terms" className="text-cream/70 hover:text-gold transition-colors">Terms of use</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-cream/10 pt-6">
          <p className="text-center text-xs text-cream/50">
            &copy; {new Date().getFullYear()} RCCG Region 36 Children&apos;s Ministry. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
