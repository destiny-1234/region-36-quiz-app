'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { CoordinatorData } from '@/app/coordinator/page';
import { AGE_CATEGORY_LABELS, AgeCategory, STAGE_LABELS, StageLevel } from '@/lib/constants';
import { ClipboardCheck, Loader2, Check } from 'lucide-react';

interface GradingItem {
  answer_id: string;
  text_answer: string;
  awarded_points: number | null;
  question_text: string;
  max_points: number;
  correct_answer: string | null;
  child_name: string;
  child_id: string;
  attempt_id: string;
  age_category: string;
  stage_level: string;
}

export function CoordinatorGrading({ coordinator, seasonId }: { coordinator: CoordinatorData; seasonId: string }) {
  const { toast } = useToast();
  const [items, setItems] = useState<GradingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [grading, setGrading] = useState<string | null>(null);
  const [points, setPoints] = useState<Record<string, string>>({});

  const loadItems = useCallback(async () => {
    if (!seasonId) { setLoading(false); return; }
    setLoading(true);

    // Get attempts with pending_grading status for children in this unit
    const childFilter = buildChildFilter(coordinator);
    const { data: children } = await supabase
      .from('children')
      .select('id, full_name')
      .eq(childFilter.column, childFilter.value);

    if (!children || children.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }

    const childIds = children.map((c) => c.id);
    const childMap = new Map(children.map((c) => [c.id, c.full_name]));

    const { data: attempts } = await supabase
      .from('attempts')
      .select('id, child_id, stage_level, age_category, status')
      .eq('season_id', seasonId)
      .in('child_id', childIds)
      .in('status', ['submitted', 'pending_grading']);

    if (!attempts || attempts.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }

    const attemptIds = attempts.map((a) => a.id);
    const { data: answers } = await supabase
      .from('attempt_answers')
      .select(`
        id, text_answer, awarded_points, question_id,
        questions ( id, question_text, points, correct_answer ),
        attempt_id
      `)
      .in('attempt_id', attemptIds)
      .not('text_answer', 'is', null)
      .is('awarded_points', null);

    if (!answers) {
      setItems([]);
      setLoading(false);
      return;
    }

    const mapped: GradingItem[] = [];
    for (const ans of answers) {
      const attempt = attempts.find((a) => a.id === ans.attempt_id);
      if (!attempt) continue;
      const q = (ans.questions as unknown) as { question_text: string; points: number; correct_answer: string | null };
      mapped.push({
        answer_id: ans.id,
        text_answer: ans.text_answer || '',
        awarded_points: ans.awarded_points,
        question_text: q?.question_text || '',
        max_points: q?.points || 1,
        correct_answer: q?.correct_answer || null,
        child_name: childMap.get(attempt.child_id) || 'Unknown',
        child_id: attempt.child_id,
        attempt_id: attempt.id,
        age_category: attempt.age_category,
        stage_level: attempt.stage_level,
      });
    }

    setItems(mapped);
    setLoading(false);
  }, [coordinator, seasonId]);

  useEffect(() => { loadItems(); }, [loadItems]);

  async function gradeAnswer(item: GradingItem, awardedPoints: number) {
    setGrading(item.answer_id);
    const { error } = await supabase
      .from('attempt_answers')
      .update({
        awarded_points: awardedPoints,
        is_correct: awardedPoints >= item.max_points * 0.5,
        graded_at: new Date().toISOString(),
      })
      .eq('id', item.answer_id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Answer graded', description: `Awarded ${awardedPoints} of ${item.max_points} points.` });

      // Check if all answers for this attempt are now graded
      const { data: remaining } = await supabase
        .from('attempt_answers')
        .select('id')
        .eq('attempt_id', item.attempt_id)
        .not('text_answer', 'is', null)
        .is('awarded_points', null);

      if (!remaining || remaining.length === 0) {
        // All fill-blank answers graded — compute total and update attempt status
        const { data: allAnswers } = await supabase
          .from('attempt_answers')
          .select('awarded_points, is_correct, questions (points)')
          .eq('attempt_id', item.attempt_id);

        if (allAnswers) {
          let total = 0;
          let max = 0;
          for (const a of allAnswers) {
            const q = (a.questions as unknown) as { points: number };
            total += a.awarded_points || 0;
            max += q?.points || 0;
          }
          const pct = max > 0 ? (total / max) * 100 : 0;
          await supabase
            .from('attempts')
            .update({
              total_points: total,
              max_points: max,
              percentage: Math.round(pct * 100) / 100,
              status: 'graded',
            })
            .eq('id', item.attempt_id);
        }
      }
      loadItems();
    }
    setGrading(null);
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-serif text-xl font-semibold text-navy">Pending manual grading</h2>
        <p className="text-sm text-muted-foreground">
          Review each fill-in-the-blank answer and award points up to the maximum for that question.
        </p>
      </div>

      {items.length === 0 ? (
        <Card className="border-navy/10 bg-cream-light">
          <CardContent className="py-12 text-center">
            <ClipboardCheck className="mx-auto h-12 w-12 text-gold/40" />
            <p className="mt-4 text-muted-foreground">No answers pending grading.</p>
            <p className="mt-1 text-sm text-muted-foreground/60">All fill-in-the-blank responses have been reviewed.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <Card key={item.answer_id} className="border-navy/10 bg-cream-light">
              <CardContent className="pt-6">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-navy">{item.child_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {STAGE_LABELS[item.stage_level as StageLevel]} — {AGE_CATEGORY_LABELS[item.age_category as AgeCategory]}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-gold-600">{item.max_points} max points</Badge>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="rounded-lg border border-navy/10 bg-cream p-3">
                    <p className="text-xs font-medium text-muted-foreground">Question</p>
                    <p className="mt-1 text-sm text-navy">{item.question_text}</p>
                  </div>

                  <div className="rounded-lg border border-gold/20 bg-gold/5 p-3">
                    <p className="text-xs font-medium text-muted-foreground">Child&apos;s answer</p>
                    <p className="mt-1 text-sm text-navy">{item.text_answer || '(empty)'}</p>
                  </div>

                  {item.correct_answer && (
                    <div className="rounded-lg border border-navy/10 bg-navy/5 p-3">
                      <p className="text-xs font-medium text-muted-foreground">Reference answer</p>
                      <p className="mt-1 text-sm text-navy">{item.correct_answer}</p>
                    </div>
                  )}

                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <Label htmlFor={`points-${item.answer_id}`} className="text-xs">Award points (0–{item.max_points})</Label>
                      <Input
                        id={`points-${item.answer_id}`}
                        type="number"
                        min="0"
                        max={item.max_points}
                        value={points[item.answer_id] ?? ''}
                        onChange={(e) => setPoints({ ...points, [item.answer_id]: e.target.value })}
                        className="max-w-32"
                      />
                    </div>
                    <Button
                      size="sm"
                      onClick={() => gradeAnswer(item, parseInt(points[item.answer_id] || '0', 10))}
                      disabled={grading === item.answer_id}
                      className="bg-gold text-navy hover:bg-gold-600"
                    >
                      {grading === item.answer_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="mr-1 h-4 w-4" /> Grade</>}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
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
