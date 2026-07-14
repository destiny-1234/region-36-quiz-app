'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { AGE_CATEGORIES, AGE_CATEGORY_LABELS, AgeCategory, STAGE_LEVELS, STAGE_LABELS } from '@/lib/constants';
import { Users, FileQuestion, ClipboardCheck, Trophy } from 'lucide-react';

interface Stats {
  totalChildren: number;
  totalCoordinators: number;
  totalQuestions: number;
  pendingGrading: number;
  childrenByStage: { stage: string; count: number }[];
  childrenByCategory: { category: string; count: number }[];
  completionRate: number;
}

export function AdminOverview({ seasonId }: { seasonId: string }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!seasonId) { setLoading(false); return; }

      const { count: totalChildren } = await supabase
        .from('children').select('*', { count: 'exact', head: true });

      const { count: totalCoordinators } = await supabase
        .from('coordinators').select('*', { count: 'exact', head: true });

      const { count: totalQuestions } = await supabase
        .from('questions').select('*', { count: 'exact', head: true }).eq('season_id', seasonId);

      const { count: pendingGrading } = await supabase
        .from('attempts').select('*', { count: 'exact', head: true })
        .eq('season_id', seasonId).eq('status', 'pending_grading');

      // Children by stage (based on attempts)
      const childrenByStage: { stage: string; count: number }[] = [];
      for (const stage of STAGE_LEVELS) {
        const { count } = await supabase
          .from('attempts').select('*', { count: 'exact', head: true })
          .eq('season_id', seasonId).eq('stage_level', stage).eq('is_practice', false);
        childrenByStage.push({ stage: STAGE_LABELS[stage], count: count || 0 });
      }

      // Children by age category
      const { data: childrenData } = await supabase
        .from('children').select('age_category');

      const catMap: Record<string, number> = {};
      (childrenData || []).forEach((c: Record<string, unknown>) => {
        const cat = c.age_category as string;
        catMap[cat] = (catMap[cat] || 0) + 1;
      });

      const childrenByCategory = AGE_CATEGORIES.map((c) => ({
        category: AGE_CATEGORY_LABELS[c],
        count: catMap[c] || 0,
      }));

      const { count: published } = await supabase
        .from('attempts').select('*', { count: 'exact', head: true })
        .eq('season_id', seasonId).eq('status', 'published');

      const completionRate = totalChildren && totalChildren > 0
        ? Math.round(((published || 0) / totalChildren) * 100)
        : 0;

      setStats({
        totalChildren: totalChildren || 0,
        totalCoordinators: totalCoordinators || 0,
        totalQuestions: totalQuestions || 0,
        pendingGrading: pendingGrading || 0,
        childrenByStage,
        childrenByCategory,
        completionRate,
      });
      setLoading(false);
    })();
  }, [seasonId]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    { label: 'Total children', value: stats.totalChildren, icon: Users },
    { label: 'Coordinators', value: stats.totalCoordinators, icon: Trophy },
    { label: 'Questions', value: stats.totalQuestions, icon: FileQuestion },
    { label: 'Pending grading', value: stats.pendingGrading, icon: ClipboardCheck },
  ];

  const PIE_COLORS = ['#16213E', '#C9A227', '#8C2F24', '#475583', '#A88A21'];

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
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

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="border-navy/10 bg-cream-light">
          <CardHeader>
            <CardTitle className="font-serif text-lg text-navy">Participation by stage</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stats.childrenByStage}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8EAF0" />
                <XAxis dataKey="stage" tick={{ fontSize: 12, fill: '#1F2430' }} />
                <YAxis tick={{ fontSize: 12, fill: '#1F2430' }} />
                <Tooltip contentStyle={{ backgroundColor: '#FBF7EF', border: '1px solid #16213E20', borderRadius: '8px' }} />
                <Bar dataKey="count" fill="#16213E" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-navy/10 bg-cream-light">
          <CardHeader>
            <CardTitle className="font-serif text-lg text-navy">Children by age category</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={stats.childrenByCategory}
                  dataKey="count"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={(entry) => `${entry.count}`}
                >
                  {stats.childrenByCategory.map((_, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#FBF7EF', border: '1px solid #16213E20', borderRadius: '8px' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-2 flex flex-wrap justify-center gap-3 text-xs">
              {stats.childrenByCategory.map((c, idx) => (
                <span key={c.category} className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                  {c.category}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Completion rate */}
      <Card className="border-navy/10 bg-cream-light">
        <CardHeader>
          <CardTitle className="font-serif text-lg text-navy">Completion rate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="font-serif text-4xl font-bold text-gold-600">{stats.completionRate}%</div>
            <p className="text-sm text-muted-foreground">
              of registered children have published results this season
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
