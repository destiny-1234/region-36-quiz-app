'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, FileQuestion, ClipboardCheck, Bell } from 'lucide-react';
import { CoordinatorData } from '@/app/coordinator/page';
import { STAGE_LEVELS, STAGE_LABELS, AGE_CATEGORIES, AGE_CATEGORY_LABELS } from '@/lib/constants';

interface OverviewData {
  totalChildren: number;
  totalQuestions: number;
  pendingGrading: number;
  notifications: number;
  childrenByCategory: Record<string, number>;
  childrenByStatus: Record<string, number>;
}

export function CoordinatorOverview({ coordinator, seasonId }: { coordinator: CoordinatorData; seasonId: string }) {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!seasonId) { setLoading(false); return; }

      // Build the filter for children in this coordinator's unit
      const childFilter = buildChildFilter(coordinator);
      const { count: totalChildren } = await supabase
        .from('children')
        .select('*', { count: 'exact', head: true })
        .eq(childFilter.column, childFilter.value);

      // Questions count
      const questionFilter = buildQuestionFilter(coordinator);
      const { count: totalQuestions } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('season_id', seasonId)
        .eq(questionFilter.column, questionFilter.value);

      // Pending grading
      const { data: attempts } = await supabase
        .from('attempts')
        .select('id, status, child_id, children!inner(parish_id, area_id, zone_id, province_id)')
        .eq('season_id', seasonId)
        .eq('status', 'pending_grading');

      const filteredAttempts = (attempts || []).filter((a: Record<string, unknown>) => {
        const child = a.children as Record<string, string>;
        return matchesCoordinator(child, coordinator);
      });

      // Children by category
      const { data: childrenData } = await supabase
        .from('children')
        .select('age_category')
        .eq(childFilter.column, childFilter.value);

      const byCategory: Record<string, number> = {};
      (childrenData || []).forEach((c: Record<string, unknown>) => {
        const cat = c.age_category as string;
        byCategory[cat] = (byCategory[cat] || 0) + 1;
      });

      setData({
        totalChildren: totalChildren || 0,
        totalQuestions: totalQuestions || 0,
        pendingGrading: filteredAttempts.length,
        notifications: 0,
        childrenByCategory: byCategory,
        childrenByStatus: {},
      });
      setLoading(false);
    })();
  }, [coordinator, seasonId]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
      </div>
    );
  }

  if (!data) return null;

  const stats = [
    { label: 'Children', value: data.totalChildren, icon: Users },
    { label: 'Questions in bank', value: data.totalQuestions, icon: FileQuestion },
    { label: 'Pending grading', value: data.pendingGrading, icon: ClipboardCheck },
    { label: 'Notifications', value: data.notifications, icon: Bell },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-navy/10 bg-cream-light">
            <CardContent className="flex items-center justify-between pt-6">
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="font-serif text-3xl font-bold text-navy">{stat.value}</p>
              </div>
              <stat.icon className="h-8 w-8 text-gold/60" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-navy/10 bg-cream-light">
        <CardHeader>
          <CardTitle className="font-serif text-lg text-navy">Children by age category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {AGE_CATEGORIES.map((cat) => (
              <div key={cat} className="rounded-lg border border-navy/5 bg-cream p-3 text-center">
                <p className="font-serif text-2xl font-bold text-navy">{data.childrenByCategory[cat] || 0}</p>
                <p className="text-xs text-muted-foreground">{AGE_CATEGORY_LABELS[cat]}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function buildChildFilter(coordinator: CoordinatorData): { column: string; value: string } {
  if (coordinator.level === 'parish') return { column: 'parish_id', value: coordinator.parish_id! };
  if (coordinator.level === 'area') return { column: 'area_id', value: coordinator.area_id! };
  if (coordinator.level === 'zone') return { column: 'zone_id', value: coordinator.zone_id! };
  if (coordinator.level === 'province') return { column: 'province_id', value: coordinator.province_id! };
  return { column: 'region_id', value: coordinator.region_id! };
}

function buildQuestionFilter(coordinator: CoordinatorData): { column: string; value: string } {
  if (coordinator.level === 'parish') return { column: 'parish_id', value: coordinator.parish_id! };
  if (coordinator.level === 'area') return { column: 'area_id', value: coordinator.area_id! };
  if (coordinator.level === 'zone') return { column: 'zone_id', value: coordinator.zone_id! };
  if (coordinator.level === 'province') return { column: 'province_id', value: coordinator.province_id! };
  return { column: 'region_id', value: coordinator.region_id! };
}

function matchesCoordinator(child: Record<string, string>, coordinator: CoordinatorData): boolean {
  if (coordinator.level === 'parish') return child.parish_id === coordinator.parish_id;
  if (coordinator.level === 'area') return child.area_id === coordinator.area_id;
  if (coordinator.level === 'zone') return child.zone_id === coordinator.zone_id;
  if (coordinator.level === 'province') return child.province_id === coordinator.province_id;
  return true;
}
