'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-client';
import { RoleGuard } from '@/components/shared/role-guard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminOverview } from '@/components/admin/admin-overview';
import { AdminStructure } from '@/components/admin/admin-structure';
import { AdminCoordinators } from '@/components/admin/admin-coordinators';
import { AdminQuestions } from '@/components/admin/admin-questions';
import { AdminSeasons } from '@/components/admin/admin-seasons';
import { AdminAuditLog } from '@/components/admin/admin-audit-log';

export default function AdminDashboardPage() {
  return (
    <RoleGuard allowedRoles={['region_admin']}>
      <AdminDashboardContent />
    </RoleGuard>
  );
}

function AdminDashboardContent() {
  const [seasonId, setSeasonId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: season } = await supabase
        .from('seasons')
        .select('id')
        .eq('is_current', true)
        .maybeSingle();
      if (season) setSeasonId(season.id);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-bold text-navy">Region Admin dashboard</h1>
        <p className="mt-1 text-muted-foreground">Full oversight of RCCG Region 36 Quiz Challenge</p>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-6 bg-cream-dark">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="structure">Structure</TabsTrigger>
          <TabsTrigger value="coordinators">Coordinators</TabsTrigger>
          <TabsTrigger value="questions">Questions</TabsTrigger>
          <TabsTrigger value="seasons">Seasons</TabsTrigger>
          <TabsTrigger value="audit">Audit log</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <AdminOverview seasonId={seasonId} />
        </TabsContent>
        <TabsContent value="structure" className="mt-6">
          <AdminStructure />
        </TabsContent>
        <TabsContent value="coordinators" className="mt-6">
          <AdminCoordinators />
        </TabsContent>
        <TabsContent value="questions" className="mt-6">
          <AdminQuestions seasonId={seasonId} />
        </TabsContent>
        <TabsContent value="seasons" className="mt-6">
          <AdminSeasons />
        </TabsContent>
        <TabsContent value="audit" className="mt-6">
          <AdminAuditLog />
        </TabsContent>
      </Tabs>
    </div>
  );
}
