'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AGE_CATEGORIES, AGE_CATEGORY_LABELS, STAGE_LEVELS, STAGE_LABELS, AgeCategory, StageLevel } from '@/lib/constants';
import { Trophy, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface LeaderboardEntry {
  child_name: string;
  percentage: number;
  total_points: number;
  time_taken_seconds: number;
  qualification_status: string;
  stage_level: string;
  age_category: string;
}

export default function LeaderboardPage() {
  const [seasonId, setSeasonId] = useState<string>('');
  const [seasons, setSeasons] = useState<{ id: string; name: string }[]>([]);
  const [ageCategory, setAgeCategory] = useState<string>('all');
  const [stageLevel, setStageLevel] = useState<string>('all');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSeasons, setLoadingSeasons] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('seasons').select('id, name').order('year', { ascending: false });
      setSeasons(data || []);
      if (data && data.length > 0) setSeasonId(data[0].id);
      setLoadingSeasons(false);
    })();
  }, []);

  const loadLeaderboard = useCallback(async () => {
    if (!seasonId) return;
    setLoading(true);

    let query = supabase
      .from('attempts')
      .select(`
        percentage,
        total_points,
        time_taken_seconds,
        qualification_status,
        stage_level,
        age_category,
        children(full_name)
      `)
      .eq('season_id', seasonId)
      .eq('is_practice', false)
      .in('status', ['graded', 'published'])
      .order('percentage', { ascending: false })
      .order('time_taken_seconds', { ascending: true })
      .limit(100);

    if (ageCategory !== 'all') query = query.eq('age_category', ageCategory);
    if (stageLevel !== 'all') query = query.eq('stage_level', stageLevel);

    const { data } = await query;

    if (data) {
      const mapped = data.map((d: Record<string, unknown>) => ({
        child_name: maskName((d.children as { full_name: string }).full_name),
        percentage: d.percentage as number,
        total_points: d.total_points as number,
        time_taken_seconds: d.time_taken_seconds as number,
        qualification_status: d.qualification_status as string,
        stage_level: d.stage_level as string,
        age_category: d.age_category as string,
      }));
      setEntries(mapped);
    }
    setLoading(false);
  }, [seasonId, ageCategory, stageLevel]);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  function maskName(name: string): string {
    const parts = name.split(' ');
    if (parts.length < 2) return name;
    return `${parts[0]} ${parts[parts.length - 1][0]}.`;
  }

  function formatTime(seconds: number | null): string {
    if (!seconds) return '—';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <div className="text-center">
        <Trophy className="mx-auto h-12 w-12 text-gold" />
        <h1 className="mt-4 font-serif text-4xl font-bold text-navy">Leaderboard</h1>
        <p className="mt-2 text-muted-foreground">Published results across all stages and age categories.</p>
      </div>

      {/* Filters */}
      <Card className="mt-8 border-navy/10 bg-cream-light">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Season</Label>
              <Select value={seasonId} onValueChange={setSeasonId} disabled={loadingSeasons}>
                <SelectTrigger><SelectValue placeholder="Select season" /></SelectTrigger>
                <SelectContent>
                  {seasons.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Age category</Label>
              <Select value={ageCategory} onValueChange={setAgeCategory}>
                <SelectTrigger><SelectValue placeholder="All categories" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {AGE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{AGE_CATEGORY_LABELS[c]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Stage</Label>
              <Select value={stageLevel} onValueChange={setStageLevel}>
                <SelectTrigger><SelectValue placeholder="All stages" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All stages</SelectItem>
                  {STAGE_LEVELS.map((s) => <SelectItem key={s} value={s}>{STAGE_LABELS[s as StageLevel]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="mt-6 border-navy/10 bg-cream-light">
        <CardHeader>
          <CardTitle className="font-serif text-xl text-navy">Rankings</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">No published results yet for these filters.</p>
              <p className="mt-1 text-sm text-muted-foreground/60">Results appear here once coordinators publish them.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Rank</TableHead>
                  <TableHead>Child</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                  <TableHead className="text-right">Time</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-serif font-bold text-navy">{idx + 1}</TableCell>
                    <TableCell className="font-medium">{entry.child_name}</TableCell>
                    <TableCell>{STAGE_LABELS[entry.stage_level as StageLevel] || entry.stage_level}</TableCell>
                    <TableCell>{AGE_CATEGORY_LABELS[entry.age_category as AgeCategory] || entry.age_category}</TableCell>
                    <TableCell className="text-right font-medium">{entry.percentage?.toFixed(1) ?? '—'}%</TableCell>
                    <TableCell className="text-right text-muted-foreground">{formatTime(entry.time_taken_seconds)}</TableCell>
                    <TableCell className="text-right">
                      {entry.qualification_status === 'qualified' && (
                        <span className="inline-flex items-center rounded-full bg-gold/15 px-2 py-0.5 text-xs font-medium text-gold-700">
                          Qualified
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
