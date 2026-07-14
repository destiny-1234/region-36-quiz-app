'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase-client';
import { RoleGuard } from '@/components/shared/role-guard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CoordinatorOverview } from '@/components/coordinator/coordinator-overview';
import { CoordinatorChildren } from '@/components/coordinator/coordinator-children';
import { CoordinatorQuestions } from '@/components/coordinator/coordinator-questions';
import { CoordinatorGrading } from '@/components/coordinator/coordinator-grading';
import { CoordinatorStageControls } from '@/components/coordinator/coordinator-stage-controls';
import { CoordinatorLevel, COORDINATOR_LEVEL_LABELS } from '@/lib/constants';
import { Loader2 } from 'lucide-react';

export interface CoordinatorData {
  id: string;
  full_name: string;
  email: string;
  level: CoordinatorLevel;
  is_approved: boolean;
  parish_id: string | null;
  area_id: string | null;
  zone_id: string | null;
  province_id: string | null;
  region_id: string | null;
}

export default function CoordinatorDashboardPage() {
  return (
    <RoleGuard allowedRoles={['coordinator']}>
      <CoordinatorDashboardContent />
    </RoleGuard>
  );
}

function CoordinatorDashboardContent() {
  const [coordinator, setCoordinator] = useState<CoordinatorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [seasonId, setSeasonId] = useState<string>('');

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: coord } = await supabase
        .from('coordinators')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (coord) setCoordinator(coord as CoordinatorData);

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
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    );
  }

  if (!coordinator) {
    return (
      <div className="mx-auto max-w-md px-4 py-12">
        <Card className="border-navy/10 bg-cream-light">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">No coordinator profile found for your account.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!coordinator.is_approved) {
    return (
      <div className="mx-auto max-w-md px-4 py-12">
        <Card className="border-gold/30 bg-cream-light">
          <CardHeader>
            <CardTitle className="font-serif text-xl text-navy">Pending approval</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Your coordinator account is awaiting approval from the Region Admin.
              You will receive a notification once approved. Please check back later.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-bold text-navy">Coordinator dashboard</h1>
        <p className="mt-1 text-muted-foreground">
          {coordinator.full_name} — {COORDINATOR_LEVEL_LABELS[coordinator.level]} level
        </p>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 bg-cream-dark">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="children">Children</TabsTrigger>
          <TabsTrigger value="questions">Questions</TabsTrigger>
          <TabsTrigger value="grading">Grading</TabsTrigger>
          <TabsTrigger value="stage">Stage</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <CoordinatorOverview coordinator={coordinator} seasonId={seasonId} />
        </TabsContent>
        <TabsContent value="children" className="mt-6">
          <CoordinatorChildren coordinator={coordinator} seasonId={seasonId} />
        </TabsContent>
        <TabsContent value="questions" className="mt-6">
          <CoordinatorQuestions coordinator={coordinator} seasonId={seasonId} />
        </TabsContent>
        <TabsContent value="grading" className="mt-6">
          <CoordinatorGrading coordinator={coordinator} seasonId={seasonId} />
        </TabsContent>
        <TabsContent value="stage" className="mt-6">
          <CoordinatorStageControls coordinator={coordinator} seasonId={seasonId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
