'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, X, Bell, ChevronDown } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { useNotifications } from '@/components/providers/notification-provider';
import { Region36Logo } from './region-36-logo';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

export function SiteHeader() {
  const pathname = usePathname();
  const { user, profile, signOut, loading } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/about', label: 'About' },
    { href: '/leaderboard', label: 'Leaderboard' },
  ];

  const dashboardLink = (() => {
    if (!user || !profile) return null;
    switch (profile.role) {
      case 'region_admin':
        return { href: '/admin', label: 'Admin dashboard' };
      case 'coordinator':
        return { href: '/coordinator', label: 'Coordinator dashboard' };
      case 'child':
        return { href: '/child', label: 'My dashboard' };
      case 'parent':
        return { href: '/parent', label: 'Parent portal' };
      default:
        return null;
    }
  })();

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50 border-b border-navy/10 bg-navy text-cream">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo + name */}
        <Link href="/" className="flex items-center gap-3">
          <Region36Logo size={40} />
          <div className="hidden sm:block">
            <p className="font-serif text-lg font-semibold leading-tight text-cream">
              Region 36
            </p>
            <p className="text-xs text-gold">Quiz Challenge</p>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'rounded-md px-3 py-2 text-sm font-medium transition-colors hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-navy',
                pathname === link.href ? 'text-gold' : 'text-cream'
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          {/* Notifications bell */}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="relative rounded-md p-2 text-cream transition-colors hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-navy"
                  aria-label="Notifications"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-crest px-1 text-[10px] font-bold text-cream">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <div className="flex items-center justify-between border-b px-3 py-2">
                  <span className="font-serif text-sm font-semibold text-navy">Notifications</span>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-xs text-gold-600 hover:text-gold-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                      No notifications yet
                    </div>
                  ) : (
                    notifications.slice(0, 10).map((n) => (
                      <DropdownMenuItem
                        key={n.id}
                        className="flex flex-col items-start gap-1 py-3"
                        onClick={() => markAsRead(n.id)}
                      >
                        <div className="flex w-full items-start justify-between gap-2">
                          <span className={cn('text-sm font-medium', n.is_read ? 'text-muted-foreground' : 'text-navy')}>
                            {n.title}
                          </span>
                          {!n.is_read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold" />}
                        </div>
                        <span className="text-xs text-muted-foreground">{n.body}</span>
                        <span className="text-[10px] text-muted-foreground/60">
                          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                        </span>
                      </DropdownMenuItem>
                    ))
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Auth buttons / user menu */}
          {loading ? (
            <div className="h-8 w-20 animate-pulse rounded bg-navy-400" />
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-cream transition-colors hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-navy">
                  <span className="hidden max-w-32 truncate sm:inline">{profile?.full_name}</span>
                  <ChevronDown className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {dashboardLink && (
                  <DropdownMenuItem asChild>
                    <Link href={dashboardLink.href}>{dashboardLink.label}</Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()} className="text-crest">
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <Button asChild variant="ghost" className="text-cream hover:bg-navy-500 hover:text-gold">
                <Link href="/signin">Sign in</Link>
              </Button>
              <Button asChild className="bg-gold text-navy hover:bg-gold-600">
                <Link href="/register/child">Register a child</Link>
              </Button>
            </div>
          )}

          {/* Mobile menu */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <button
                className="rounded-md p-2 text-cream md:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                aria-label="Open menu"
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 bg-cream">
              <SheetTitle className="font-serif text-navy">Menu</SheetTitle>
              <nav className="mt-6 flex flex-col gap-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      'rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted',
                      pathname === link.href ? 'text-gold-600' : 'text-navy'
                    )}
                  >
                    {link.label}
                  </Link>
                ))}
                {dashboardLink && (
                  <Link
                    href={dashboardLink.href}
                    className="rounded-md px-3 py-2 text-sm font-medium text-navy hover:bg-muted"
                  >
                    {dashboardLink.label}
                  </Link>
                )}
                {!user && (
                  <>
                    <Link href="/signin" className="rounded-md px-3 py-2 text-sm font-medium text-navy hover:bg-muted">
                      Sign in
                    </Link>
                    <Link
                      href="/register/child"
                      className="mt-2 rounded-md bg-gold px-3 py-2 text-center text-sm font-medium text-navy"
                    >
                      Register a child
                    </Link>
                  </>
                )}
                {user && (
                  <button
                    onClick={() => signOut()}
                    className="mt-2 rounded-md border border-crest px-3 py-2 text-left text-sm font-medium text-crest"
                  >
                    Sign out
                  </button>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
