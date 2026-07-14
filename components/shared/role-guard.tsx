'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, UserRole } from '@/components/providers/auth-provider';
import { Loader2 } from 'lucide-react';

interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: ReactNode;
  redirectTo?: string;
}

export function RoleGuard({ allowedRoles, children, redirectTo = '/signin' }: RoleGuardProps) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user || !profile) {
      router.push(redirectTo);
      return;
    }
    if (!allowedRoles.includes(profile.role)) {
      const dashboards: Record<UserRole, string> = {
        region_admin: '/admin',
        coordinator: '/coordinator',
        child: '/child',
        parent: '/parent',
      };
      router.push(dashboards[profile.role] || '/');
      return;
    }
    setChecked(true);
  }, [user, profile, loading, allowedRoles, router, redirectTo]);

  if (loading || !checked) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    );
  }

  return <>{children}</>;
}
