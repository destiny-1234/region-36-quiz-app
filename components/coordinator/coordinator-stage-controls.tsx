'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { CoordinatorData } from '@/app/coordinator/page';
import { STAGE_LABELS, StageLevel, AGE_CATEGORIES, AGE_CATEGORY_LABELS } from '@/lib/constants';
import { Lock, Unlock, Send, Loader2, AlertTriangle } from 'lucide-react';

interface StageConfig {
  id: string;
  level: string;
  is_open: boolean;
  results_published: boolean;
  time_limit_minutes: number;
  pool_size: number;
  opens_at: string | null;
}

export function CoordinatorStageControls({ coordinator, seasonId }: { coordinator: CoordinatorData; seasonId: string }) {
  const { toast } = useToast();
  const [configs, setConfigs] = useState<StageConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [questionCounts, setQuestionCounts] = useState<Record<string, number>>({});

  const stageLevel = coordinatorLevelToStage(coordinator.level);

  const loadConfigs = useCallback(async () => {
    if (!seasonId) { setLoading(false); return; }
    const { data } = await supabase
      .from('stage_configs')
      .select('*')
      .eq('season_id', seasonId)
      .order('level');
    setConfigs(data as StageConfig[] || []);

    // Count questions per age category for this stage
    const filter = buildQuestionFilter(coordinator);
    const counts: Record<string, number> = {};
    for (const cat of AGE_CATEGORIES) {
      const { count } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('season_id', seasonId)
        .eq('stage_level', stageLevel)
        .eq('age_category', cat)
        .eq(filter.column, filter.value);
      counts[cat] = count || 0;
    }
    setQuestionCounts(counts);
    setLoading(false);
  }, [seasonId, coordinator, stageLevel]);

  useEffect(() => { loadConfigs(); }, [loadConfigs]);

  async function toggleStage() {
    const config = configs.find((c) => c.level === stageLevel);
    if (!config) return;

    // Check if question bank is empty for any age category
    const emptyCategories = AGE_CATEGORIES.filter((cat) => (questionCounts[cat] || 0) === 0);
    if (emptyCategories.length > 0 && !config.is_open) {
      toast({
        title: 'Cannot open stage',
        description: `Question bank is empty for: ${emptyCategories.map((c) => AGE_CATEGORY_LABELS[c]).join(', ')}. Add questions first.`,
        variant: 'destructive',
      });
      return;
    }

    setActing('toggle');
    const { error } = await supabase
      .from('stage_configs')
      .update({ is_open: !config.is_open })
      .eq('id', config.id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: config.is_open ? 'Stage closed' : 'Stage opened', description: `${STAGE_LABELS[stageLevel]} stage is now ${config.is_open ? 'closed' : 'open'} for children.` });
      loadConfigs();
    }
    setActing(null);
  }

  async function publishResults() {
    const config = configs.find((c) => c.level === stageLevel);
    if (!config) return;

    setActing('publish');
    const { error } = await supabase
      .from('stage_configs')
      .update({ results_published: !config.results_published })
      .eq('id', config.id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      // Update all graded attempts to published
      const childFilter = buildChildFilter(coordinator);
      const { data: children } = await supabase
        .from('children')
        .select('id')
        .eq(childFilter.column, childFilter.value);

      if (children && children.length > 0) {
        const childIds = children.map((c) => c.id);
        await supabase
          .from('attempts')
          .update({ status: 'published' })
          .eq('season_id', seasonId)
          .eq('stage_level', stageLevel)
          .in('child_id', childIds)
          .eq('status', 'graded');
      }

      toast({
        title: config.results_published ? 'Results unpublished' : 'Results published',
        description: config.results_published
          ? 'Results are no longer visible to children and parents.'
          : 'Results are now visible to children and parents.',
      });
      loadConfigs();
    }
    setActing(null);
  }

  if (loading) {
    return <Skeleton className="h-48 w-full" />;
  }

  const myConfig = configs.find((c) => c.level === stageLevel);

  if (!myConfig) {
    return (
      <Card className="border-navy/10 bg-cream-light">
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">No stage configuration found for your level.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-xl font-semibold text-navy">Stage controls</h2>
        <p className="text-sm text-muted-foreground">
          Manage the {STAGE_LABELS[stageLevel]} stage for your unit. Opening the stage allows children to take the quiz.
          Publishing results makes scores visible to children and parents.
        </p>
      </div>

      {/* Open/Close */}
      <Card className="border-navy/10 bg-cream-light">
        <CardHeader>
          <CardTitle className="font-serif text-lg text-navy flex items-center gap-2">
            {myConfig.is_open ? <Unlock className="h-5 w-5 text-gold" /> : <Lock className="h-5 w-5 text-muted-foreground" />}
            Stage status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Badge className={myConfig.is_open ? 'bg-gold/15 text-gold-700' : 'bg-muted text-muted-foreground'}>
              {myConfig.is_open ? 'Open' : 'Closed'}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {myConfig.is_open ? 'Children can currently take the quiz.' : 'Children cannot take the quiz yet.'}
            </span>
          </div>

          {/* Question bank status */}
          <div className="rounded-lg border border-navy/10 bg-cream p-4">
            <p className="text-sm font-medium text-navy">Question bank status</p>
            <div className="mt-2 grid grid-cols-5 gap-2">
              {AGE_CATEGORIES.map((cat) => (
                <div key={cat} className="text-center">
                  <p className={`font-serif text-lg font-bold ${(questionCounts[cat] || 0) > 0 ? 'text-navy' : 'text-crest'}`}>
                    {questionCounts[cat] || 0}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{AGE_CATEGORY_LABELS[cat]}</p>
                </div>
              ))}
            </div>
            {AGE_CATEGORIES.some((c) => (questionCounts[c] || 0) === 0) && !myConfig.is_open && (
              <div className="mt-3 flex items-start gap-2 rounded-md bg-crest/5 p-2 text-xs text-crest">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>Some age categories have no questions. You cannot open the stage until all categories have at least one question.</span>
              </div>
            )}
          </div>

          <Button onClick={toggleStage} disabled={acting === 'toggle'} className={myConfig.is_open ? 'border-crest text-crest hover:bg-crest/5' : 'bg-gold text-navy hover:bg-gold-600'} variant={myConfig.is_open ? 'outline' : 'default'}>
            {acting === 'toggle' ? <Loader2 className="h-4 w-4 animate-spin" /> : myConfig.is_open ? 'Close stage' : 'Open stage'}
          </Button>
        </CardContent>
      </Card>

      {/* Publish results */}
      <Card className="border-navy/10 bg-cream-light">
        <CardHeader>
          <CardTitle className="font-serif text-lg text-navy flex items-center gap-2">
            <Send className="h-5 w-5 text-gold" />
            Publish results
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Badge className={myConfig.results_published ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'}>
              {myConfig.results_published ? 'Published' : 'Private'}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {myConfig.results_published
                ? 'Scores are visible to children and parents.'
                : 'Scores are private. Only you can see them until published.'}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Grading happens privately. Results and scores only become visible to children and parents once you publish.
            Make sure all fill-in-the-blank answers are graded before publishing.
          </p>
          <Button onClick={publishResults} disabled={acting === 'publish'} className={myConfig.results_published ? 'border-crest text-crest hover:bg-crest/5' : 'bg-gold text-navy hover:bg-gold-600'} variant={myConfig.results_published ? 'outline' : 'default'}>
            {acting === 'publish' ? <Loader2 className="h-4 w-4 animate-spin" /> : myConfig.results_published ? 'Unpublish results' : 'Publish results'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function buildQuestionFilter(coordinator: CoordinatorData): { column: string; value: string } {
  if (coordinator.level === 'parish') return { column: 'parish_id', value: coordinator.parish_id! };
  if (coordinator.level === 'area') return { column: 'area_id', value: coordinator.area_id! };
  if (coordinator.level === 'zone') return { column: 'zone_id', value: coordinator.zone_id! };
  if (coordinator.level === 'province') return { column: 'province_id', value: coordinator.province_id! };
  return { column: 'region_id', value: coordinator.region_id! };
}

function buildChildFilter(coordinator: CoordinatorData): { column: string; value: string } {
  return buildQuestionFilter(coordinator);
}

function coordinatorLevelToStage(level: string): StageLevel {
  if (level === 'parish') return 'parish';
  if (level === 'area') return 'area';
  if (level === 'zone') return 'zonal';
  if (level === 'province') return 'provincial';
  return 'regional';
}
