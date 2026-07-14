'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase-client';
import { RoleGuard } from '@/components/shared/role-guard';
import { StageJourney } from '@/components/layout/stage-journey';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AGE_CATEGORY_LABELS, AgeCategory, STAGE_LABELS, StageLevel, ATTEMPT_STATUS_LABELS, STAGE_ORDER } from '@/lib/constants';
import { Eye, Award } from 'lucide-react';

interface ChildSummary {
  id: string;
  full_name: string;
  age_category: string;
  attempts: {
    id: string;
    stage_level: string;
    status: string;
    percentage: number | null;
    qualification_status: string | null;
    is_practice: boolean;
  }[];
}

export default function ParentDashboardPage() {
  return (
    <RoleGuard allowedRoles={['parent']}>
      <ParentDashboardContent />
    </RoleGuard>
  );
}

function ParentDashboardContent() {
  const [children, setChildren] = useState<ChildSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [parentName, setParentName] = useState('');

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: parent } = await supabase
        .from('parents')
        .select('id, full_name')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!parent) {
        setLoading(false);
        return;
      }
      setParentName(parent.full_name);

      const { data: links } = await supabase
        .from('parent_children')
        .select('child_id')
        .eq('parent_id', parent.id);

      if (!links || links.length === 0) {
        setLoading(false);
        return;
      }

      const childIds = links.map((l) => l.child_id);

      const { data: childrenData } = await supabase
        .from('children')
        .select('id, full_name, age_category')
        .in('id', childIds);

      if (!childrenData) {
        setLoading(false);
        return;
      }

      // Load season
      const { data: season } = await supabase
        .from('seasons')
        .select('id')
        .eq('is_current', true)
        .maybeSingle();

      // Load attempts for each child
      const childrenWithAttempts: ChildSummary[] = [];
      for (const child of childrenData) {
        let attempts: ChildSummary['attempts'] = [];
        if (season) {
          const { data: attemptData } = await supabase
            .from('attempts')
            .select('id, stage_level, status, percentage, qualification_status, is_practice')
            .eq('child_id', child.id)
            .eq('season_id', season.id)
            .order('created_at', { ascending: false });
          attempts = (attemptData || []).filter((a: Record<string, unknown>) => !a.is_practice) as ChildSummary['attempts'];
        }
        childrenWithAttempts.push({
          id: child.id,
          full_name: child.full_name,
          age_category: child.age_category,
          attempts,
        });
      }

      setChildren(childrenWithAttempts);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center gap-3">
        <Eye className="h-8 w-8 text-gold" />
        <div>
          <h1 className="font-serif text-3xl font-bold text-navy">Parent portal</h1>
          <p className="text-sm text-muted-foreground">Read-only view of your child&apos;s progress, {parentName}</p>
        </div>
      </div>

      {children.length === 0 ? (
        <Card className="border-navy/10 bg-cream-light">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No children are linked to your account yet.</p>
            <p className="mt-1 text-sm text-muted-foreground/60">
              If you have registered a child, please make sure you used the same email address when creating your parent account.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {children.map((child) => {
            const currentStage = child.attempts.length > 0
              ? child.attempts[0].stage_level
              : 'parish';
            return (
              <Card key={child.id} className="border-navy/10 bg-cream-light">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-serif text-xl text-navy">{child.full_name}</CardTitle>
                    <Badge variant="outline" className="text-gold-600">
                      {AGE_CATEGORY_LABELS[child.age_category as AgeCategory]}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Stage journey */}
                  <div className="rounded-lg border border-navy/5 bg-cream p-4">
                    <p className="mb-3 text-xs font-medium text-muted-foreground">Progress</p>
                    <StageJourney
                      variant="horizontal"
                      currentStage={STAGE_ORDER[currentStage as StageLevel]}
                    />
                  </div>

                  {/* Results */}
                  {child.attempts.length === 0 ? (
                    <div className="rounded-lg border border-navy/10 bg-cream p-4 text-center">
                      <p className="text-sm text-muted-foreground">No quiz attempts yet.</p>
                      <p className="mt-1 text-xs text-muted-foreground/60">Results will appear here once your child takes a quiz and the coordinator publishes results.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Results</p>
                      {child.attempts.map((attempt) => (
                        <div key={attempt.id} className="flex items-center justify-between rounded-lg border border-navy/10 bg-cream p-3">
                          <div>
                            <p className="font-medium text-navy">{STAGE_LABELS[attempt.stage_level as StageLevel]}</p>
                            <p className="text-xs text-muted-foreground">
                              {ATTEMPT_STATUS_LABELS[attempt.status as keyof typeof ATTEMPT_STATUS_LABELS] || attempt.status}
                            </p>
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
                                <Link href={`/child/certificate?attempt=${attempt.id}`}>
                                  <Award className="mr-1 h-3 w-3" /> Certificate
                                </Link>
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
