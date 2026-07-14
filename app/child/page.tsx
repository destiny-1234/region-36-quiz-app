'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/components/providers/auth-provider';
import { RoleGuard } from '@/components/shared/role-guard';
import { StageJourney } from '@/components/layout/stage-journey';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AGE_CATEGORY_LABELS, AgeCategory, STAGE_LABELS, StageLevel, ATTEMPT_STATUS_LABELS, STAGE_ORDER } from '@/lib/constants';
import { BookOpen, Trophy, Loader2, Play, GraduationCap } from 'lucide-react';

interface ChildData {
  id: string;
  full_name: string;
  age_category: string;
  parish_id: string;
  area_id: string;
  zone_id: string;
  province_id: string;
}

interface AttemptSummary {
  id: string;
  stage_level: string;
  status: string;
  percentage: number | null;
  is_practice: boolean;
  qualification_status: string | null;
}

export default function ChildDashboardPage() {
  return (
    <RoleGuard allowedRoles={['child']}>
      <ChildDashboardContent />
    </RoleGuard>
  );
}

function ChildDashboardContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [child, setChild] = useState<ChildData | null>(null);
  const [attempts, setAttempts] = useState<AttemptSummary[]>([]);
  const [stageStatuses, setStageStatuses] = useState<Record<string, { is_open: boolean; results_published: boolean }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!user) return;

      const { data: childData } = await supabase
        .from('children')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!childData) {
        setLoading(false);
        return;
      }
      setChild(childData as ChildData);

      // Load current season
      const { data: season } = await supabase
        .from('seasons')
        .select('id')
        .eq('is_current', true)
        .maybeSingle();

      if (season) {
        // Load attempts
        const { data: attemptData } = await supabase
          .from('attempts')
          .select('id, stage_level, status, percentage, is_practice, qualification_status')
          .eq('child_id', childData.id)
          .eq('season_id', season.id)
          .order('created_at', { ascending: false });
        setAttempts(attemptData as AttemptSummary[] || []);

        // Load stage configs
        const { data: stages } = await supabase
          .from('stage_configs')
          .select('level, is_open, results_published')
          .eq('season_id', season.id);
        const statusMap: Record<string, { is_open: boolean; results_published: boolean }> = {};
        (stages || []).forEach((s: Record<string, unknown>) => {
          statusMap[s.level as string] = { is_open: s.is_open as boolean, results_published: s.results_published as boolean };
        });
        setStageStatuses(statusMap);
      }

      setLoading(false);
    })();
  }, [user]);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!child) {
    return (
      <div className="mx-auto max-w-md px-4 py-12">
        <Card className="border-navy/10 bg-cream-light">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">No child profile found for your account.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentStage = determineCurrentStage(attempts);
  const completedStages = attempts.filter((a) => !a.is_practice && (a.status === 'graded' || a.status === 'published')).length;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-bold text-navy">Welcome, {child.full_name.split(' ')[0]}</h1>
        <p className="mt-1 text-muted-foreground">
          Age category: {AGE_CATEGORY_LABELS[child.age_category as AgeCategory]}
        </p>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-navy/10 bg-cream-light">
          <CardContent className="flex items-center justify-between pt-6">
            <div>
              <p className="text-sm text-muted-foreground">Stages completed</p>
              <p className="font-serif text-3xl font-bold text-navy">{completedStages}</p>
            </div>
            <Trophy className="h-8 w-8 text-gold/60" />
          </CardContent>
        </Card>
        <Card className="border-navy/10 bg-cream-light">
          <CardContent className="flex items-center justify-between pt-6">
            <div>
              <p className="text-sm text-muted-foreground">Current stage</p>
              <p className="font-serif text-3xl font-bold text-navy">{currentStage ? STAGE_LABELS[currentStage as StageLevel] : '—'}</p>
            </div>
            <BookOpen className="h-8 w-8 text-gold/60" />
          </CardContent>
        </Card>
        <Card className="border-navy/10 bg-cream-light">
          <CardContent className="flex items-center justify-between pt-6">
            <div>
              <p className="text-sm text-muted-foreground">Qualification</p>
              <p className="font-serif text-3xl font-bold text-navy">
                {attempts.find((a) => !a.is_practice && a.qualification_status === 'qualified') ? 'Qualified' : 'Pending'}
              </p>
            </div>
            <GraduationCap className="h-8 w-8 text-gold/60" />
          </CardContent>
        </Card>
      </div>

      {/* Stage journey */}
      <Card className="mb-8 border-navy/10 bg-cream-light">
        <CardHeader>
          <CardTitle className="font-serif text-xl text-navy">Your journey</CardTitle>
          <CardDescription>Track your progress through the five competition stages.</CardDescription>
        </CardHeader>
        <CardContent>
          <StageJourney
            variant="horizontal"
            currentStage={currentStage ? STAGE_ORDER[currentStage as StageLevel] : 1}
          />
        </CardContent>
      </Card>

      {/* Available quizzes */}
      <Card className="mb-8 border-navy/10 bg-cream-light">
        <CardHeader>
          <CardTitle className="font-serif text-xl text-navy">Available quizzes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {currentStage && stageStatuses[currentStage]?.is_open && (
            <div className="flex items-center justify-between rounded-lg border border-gold/30 bg-gold/5 p-4">
              <div>
                <p className="font-medium text-navy">{STAGE_LABELS[currentStage as StageLevel]} stage quiz</p>
                <p className="text-sm text-muted-foreground">Your current competition stage is open.</p>
              </div>
              <Button onClick={() => router.push(`/child/quiz?stage=${currentStage}`)} className="bg-gold text-navy hover:bg-gold-600">
                <Play className="mr-2 h-4 w-4" /> Start quiz
              </Button>
            </div>
          )}

          {/* Practice mode */}
          <div className="flex items-center justify-between rounded-lg border border-navy/10 bg-cream p-4">
            <div>
              <p className="font-medium text-navy">Practice mode</p>
              <p className="text-sm text-muted-foreground">Try practice questions anytime. No scoring, no pressure.</p>
            </div>
            <Button variant="outline" onClick={() => router.push('/child/quiz?practice=true')} className="border-navy/20">
              Practice
            </Button>
          </div>

          {(!currentStage || !stageStatuses[currentStage]?.is_open) && (
            <div className="rounded-lg border border-navy/10 bg-cream p-4 text-center">
              <p className="text-sm text-muted-foreground">
                Your next stage quiz is not open yet. Your coordinator will open it when ready.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results history */}
      <Card className="border-navy/10 bg-cream-light">
        <CardHeader>
          <CardTitle className="font-serif text-xl text-navy">Results history</CardTitle>
        </CardHeader>
        <CardContent>
          {attempts.filter((a) => !a.is_practice).length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">You have not taken any quizzes yet.</p>
          ) : (
            <div className="space-y-3">
              {attempts.filter((a) => !a.is_practice).map((attempt) => (
                <div key={attempt.id} className="flex items-center justify-between rounded-lg border border-navy/10 bg-cream p-3">
                  <div>
                    <p className="font-medium text-navy">{STAGE_LABELS[attempt.stage_level as StageLevel]}</p>
                    <p className="text-xs text-muted-foreground">{ATTEMPT_STATUS_LABELS[attempt.status as keyof typeof ATTEMPT_STATUS_LABELS] || attempt.status}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {attempt.percentage !== null && (
                      <span className="font-serif text-lg font-bold text-navy">{attempt.percentage.toFixed(1)}%</span>
                    )}
                    {attempt.qualification_status === 'qualified' && (
                      <Badge className="bg-gold/15 text-gold-700">Qualified</Badge>
                    )}
                    {attempt.status === 'published' && (
                      <Button size="sm" variant="outline" asChild className="border-navy/20">
                        <Link href={`/child/certificate?attempt=${attempt.id}`}>Certificate</Link>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function determineCurrentStage(attempts: AttemptSummary[]): string | null {
  const realAttempts = attempts.filter((a) => !a.is_practice);
  if (realAttempts.length === 0) return 'parish';

  // Find the highest completed/qualified stage
  const stages = ['parish', 'area', 'zonal', 'provincial', 'regional'];
  for (let i = stages.length - 1; i >= 0; i--) {
    const stage = stages[i];
    const att = realAttempts.find((a) => a.stage_level === stage);
    if (att && (att.status === 'graded' || att.status === 'published') && att.qualification_status === 'qualified') {
      // Next stage
      if (i < stages.length - 1) return stages[i + 1];
      return 'regional';
    }
  }
  // Return the first in-progress or not-started stage
  for (const stage of stages) {
    const att = realAttempts.find((a) => a.stage_level === stage);
    if (!att || att.status === 'in_progress') return stage;
  }
  return 'parish';
}
