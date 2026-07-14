'use client';

import { useEffect, useState, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/components/providers/auth-provider';
import { RoleGuard } from '@/components/shared/role-guard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { AGE_CATEGORY_LABELS, AgeCategory, STAGE_LABELS, StageLevel, QuestionType } from '@/lib/constants';
import { Loader2, Clock, AlertTriangle, Eye, Type, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface QuizQuestion {
  id: string;
  question_text: string;
  question_type: string;
  points: number;
  display_order: number;
  options: { id: string; option_text: string; is_correct: boolean; display_order: number }[];
}

interface AnswerMap {
  [questionId: string]: {
    selectedOptionId: string | null;
    textAnswer: string;
  };
}

export default function QuizPage() {
  return (
    <RoleGuard allowedRoles={['child']}>
      <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-gold" /></div>}>
        <QuizContent />
      </Suspense>
    </RoleGuard>
  );
}

function QuizContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const isPractice = searchParams.get('practice') === 'true';
  const stageParam = searchParams.get('stage') as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [childId, setChildId] = useState<string>('');
  const [childName, setChildName] = useState<string>('');
  const [ageCategory, setAgeCategory] = useState<string>('');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [attemptId, setAttemptId] = useState<string>('');
  const [timeLimit, setTimeLimit] = useState(30);
  const [timeLeft, setTimeLeft] = useState(30 * 60);
  const [submitting, setSubmitting] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [largeText, setLargeText] = useState(false);
  const [flags, setFlags] = useState<number>(0);
  const [hierarchyIds, setHierarchyIds] = useState<Record<string, string>>({});
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autosaveRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load child data and questions
  useEffect(() => {
    (async () => {
      if (!user) return;

      const { data: child } = await supabase
        .from('children')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!child) {
        setError('No child profile found.');
        setLoading(false);
        return;
      }

      setChildId(child.id);
      setChildName(child.full_name);
      setAgeCategory(child.age_category);
      setHierarchyIds({
        parish_id: child.parish_id,
        area_id: child.area_id,
        zone_id: child.zone_id,
        province_id: child.province_id,
        region_id: child.region_id,
      });

      // Get current season
      const { data: season } = await supabase
        .from('seasons')
        .select('id')
        .eq('is_current', true)
        .maybeSingle();

      if (!season) {
        setError('No active season found.');
        setLoading(false);
        return;
      }

      // Determine stage
      let stage = stageParam;
      if (isPractice) {
        stage = 'parish'; // Practice always uses parish-level questions
      }

      if (!stage) {
        setError('No stage specified.');
        setLoading(false);
        return;
      }

      // Get stage config
      const { data: stageConfig } = await supabase
        .from('stage_configs')
        .select('*')
        .eq('season_id', season.id)
        .eq('level', stage)
        .maybeSingle();

      if (!isPractice) {
        if (!stageConfig) {
          setError('Stage not configured.');
          setLoading(false);
          return;
        }
        if (!stageConfig.is_open) {
          setError('This stage is not open yet. Please wait for your coordinator to open it.');
          setLoading(false);
          return;
        }
        setTimeLimit(stageConfig.time_limit_minutes);
        setTimeLeft(stageConfig.time_limit_minutes * 60);
      } else {
        setTimeLimit(30);
        setTimeLeft(30 * 60);
      }

      // Check for existing attempt
      const { data: existingAttempt } = await supabase
        .from('attempts')
        .select('id, status')
        .eq('child_id', child.id)
        .eq('season_id', season.id)
        .eq('stage_level', stage)
        .eq('is_practice', isPractice)
        .maybeSingle();

      let currentAttemptId = existingAttempt?.id;

      // Create attempt if none exists
      if (!currentAttemptId) {
        const deadline = new Date(Date.now() + (isPractice ? 30 : stageConfig.time_limit_minutes) * 60 * 1000);
        const idempotencyKey = `${child.id}-${season.id}-${stage}-${isPractice}`;

        // Determine the correct unit filter for the question scope
        const unitFilter = determineUnitFilter(stage);

        const attemptData: Record<string, unknown> = {
          child_id: child.id,
          season_id: season.id,
          stage_level: stage,
          age_category: child.age_category,
          is_practice: isPractice,
          status: 'in_progress',
          started_at: new Date().toISOString(),
          server_deadline: deadline.toISOString(),
          idempotency_key: idempotencyKey,
        };

        const { data: newAttempt, error: attemptError } = await supabase
          .from('attempts')
          .insert(attemptData)
          .select('id')
          .single();

        if (attemptError) {
          // Might be a duplicate from idempotency key
          if (attemptError.code === '23505') {
            const { data: retry } = await supabase
              .from('attempts')
              .select('id')
              .eq('child_id', child.id)
              .eq('season_id', season.id)
              .eq('stage_level', stage)
              .eq('is_practice', isPractice)
              .maybeSingle();
            currentAttemptId = retry?.id;
          } else {
            setError(`Could not start quiz: ${attemptError.message}`);
            setLoading(false);
            return;
          }
        } else {
          currentAttemptId = newAttempt.id;
        }
      } else if (existingAttempt?.status === 'submitted' || existingAttempt?.status === 'pending_grading' || existingAttempt?.status === 'graded' || existingAttempt?.status === 'published') {
        setError('You have already submitted this quiz. Check your dashboard for results.');
        setLoading(false);
        return;
      }

      setAttemptId(currentAttemptId!);

      // Fetch questions — randomized subset
      const unitFilter = determineUnitFilter(stage);
      const filterCol = unitFilter.column;
      const filterVal = filterCol === 'parish_id' ? child.parish_id
        : filterCol === 'area_id' ? child.area_id
        : filterCol === 'zone_id' ? child.zone_id
        : filterCol === 'province_id' ? child.province_id
        : child.region_id;

      const { data: allQuestions } = await supabase
        .from('questions')
        .select(`
          id, question_text, question_type, points,
          question_options (id, option_text, is_correct, display_order)
        `)
        .eq('season_id', season.id)
        .eq('stage_level', stage)
        .eq('age_category', child.age_category)
        .eq(filterCol, filterVal)
        .eq('is_approved', true);

      if (!allQuestions || allQuestions.length === 0) {
        setError('No questions available for this stage and age category yet. Please check back later.');
        setLoading(false);
        return;
      }

      // Randomize and take pool_size subset
      const poolSize = isPractice ? Math.min(allQuestions.length, 10) : (stageConfig?.pool_size || 10);
      const shuffled = [...allQuestions].sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, Math.min(poolSize, shuffled.length));

      // Shuffle options within each MCQ question
      const processed = selected.map((q: Record<string, unknown>, idx: number) => {
        const opts = (q.question_options as Array<Record<string, unknown>>).sort(() => Math.random() - 0.5);
        return {
          id: q.id as string,
          question_text: q.question_text as string,
          question_type: q.question_type as string,
          points: q.points as number,
          display_order: idx,
          options: opts.map((o) => ({
            id: o.id as string,
            option_text: o.option_text as string,
            is_correct: o.is_correct as boolean,
            display_order: o.display_order as number,
          })),
        };
      });

      setQuestions(processed);

      // Load existing answers (if resuming)
      const { data: existingAnswers } = await supabase
        .from('attempt_answers')
        .select('question_id, selected_option_id, text_answer, display_order')
        .eq('attempt_id', currentAttemptId);

      if (existingAnswers && existingAnswers.length > 0) {
        const answerMap: AnswerMap = {};
        existingAnswers.forEach((a: Record<string, unknown>) => {
          answerMap[a.question_id as string] = {
            selectedOptionId: a.selected_option_id as string | null,
            textAnswer: (a.text_answer as string) || '',
          };
        });
        setAnswers(answerMap);
      }

      setLoading(false);
    })();
  }, [user, stageParam, isPractice]);

  // Timer
  useEffect(() => {
    if (loading || submitted || showReview) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [loading, submitted, showReview]);

  // Autosave
  const autosave = useCallback(async () => {
    if (!attemptId || Object.keys(answers).length === 0) return;
    for (const [qId, ans] of Object.entries(answers)) {
      await supabase
        .from('attempt_answers')
        .upsert({
          attempt_id: attemptId,
          question_id: qId,
          selected_option_id: ans.selectedOptionId,
          text_answer: ans.textAnswer || null,
          answered_at: new Date().toISOString(),
        }, { onConflict: 'attempt_id,question_id' });
    }
  }, [attemptId, answers]);

  useEffect(() => {
    if (loading || submitted) return;
    autosaveRef.current = setInterval(autosave, 5000);
    return () => { if (autosaveRef.current) clearInterval(autosaveRef.current); };
  }, [loading, submitted, autosave]);

  // Tab switch detection
  useEffect(() => {
    if (loading || submitted) return;
    const handleVisibility = () => {
      if (document.hidden) {
        setFlags((f) => f + 1);
        toast({
          title: 'Tab switch detected',
          description: 'Your coordinator will be notified of this interruption.',
          variant: 'destructive',
        });
        // Save flag to attempt
        if (attemptId) {
          supabase.from('attempts').update({
            flag_count: flags + 1,
            flags_json: [...(flags > 0 ? [{ time: new Date().toISOString(), type: 'tab_switch' }] : [])],
          }).eq('id', attemptId);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [loading, submitted, attemptId, flags, toast]);

  // Prevent copy/paste
  const handleCopyPaste = useCallback((e: ClipboardEvent) => {
    e.preventDefault();
    toast({ title: 'Copy and paste disabled', description: 'During the quiz, copying and pasting is not allowed.' });
  }, [toast]);

  useEffect(() => {
    if (loading || submitted) return;
    document.addEventListener('copy', handleCopyPaste);
    document.addEventListener('paste', handleCopyPaste);
    document.addEventListener('cut', handleCopyPaste);
    return () => {
      document.removeEventListener('copy', handleCopyPaste);
      document.removeEventListener('paste', handleCopyPaste);
      document.removeEventListener('cut', handleCopyPaste);
    };
  }, [loading, submitted, handleCopyPaste]);

  function updateAnswer(qId: string, selectedOptionId: string | null, textAnswer: string) {
    setAnswers((prev) => ({
      ...prev,
      [qId]: { selectedOptionId, textAnswer },
    }));
  }

  async function handleSubmit(auto = false) {
    if (submitting || submitted) return;
    setSubmitting(true);

    // Final autosave
    for (const [qId, ans] of Object.entries(answers)) {
      await supabase
        .from('attempt_answers')
        .upsert({
          attempt_id: attemptId,
          question_id: qId,
          selected_option_id: ans.selectedOptionId,
          text_answer: ans.textAnswer || null,
          answered_at: new Date().toISOString(),
        }, { onConflict: 'attempt_id,question_id' });
    }

    // Auto-grade MCQ and True/False
    let totalPoints = 0;
    let maxPoints = 0;
    let hasFillBlank = false;

    for (const q of questions) {
      maxPoints += q.points;
      const ans = answers[q.id];
      if (!ans) continue;

      if (q.question_type === 'multiple_choice' || q.question_type === 'true_false') {
        const correctOption = q.options.find((o) => o.is_correct);
        const isCorrect = ans.selectedOptionId === correctOption?.id;
        if (isCorrect) totalPoints += q.points;

        await supabase
          .from('attempt_answers')
          .upsert({
            attempt_id: attemptId,
            question_id: q.id,
            selected_option_id: ans.selectedOptionId,
            text_answer: null,
            is_correct: isCorrect,
            awarded_points: isCorrect ? q.points : 0,
            graded_at: new Date().toISOString(),
          }, { onConflict: 'attempt_id,question_id' });
      } else if (q.question_type === 'fill_blank') {
        hasFillBlank = true;
      }
    }

    // Update attempt
    const percentage = maxPoints > 0 ? (totalPoints / maxPoints) * 100 : 0;
    const timeTaken = timeLimit * 60 - timeLeft;

    await supabase
      .from('attempts')
      .update({
        status: hasFillBlank ? 'pending_grading' : 'graded',
        submitted_at: new Date().toISOString(),
        total_points: totalPoints,
        max_points: maxPoints,
        percentage: Math.round(percentage * 100) / 100,
        time_taken_seconds: timeTaken,
        flag_count: flags,
      })
      .eq('id', attemptId);

    setSubmitting(false);
    setSubmitted(true);
    if (timerRef.current) clearInterval(timerRef.current);
    if (autosaveRef.current) clearInterval(autosaveRef.current);

    toast({
      title: auto ? 'Time up — quiz submitted' : 'Quiz submitted',
      description: hasFillBlank
        ? 'Your multiple-choice answers have been graded. Fill-in-the-blank answers are pending manual grading.'
        : `You scored ${percentage.toFixed(1)}%. Results will be visible once your coordinator publishes them.`,
    });
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-md px-4 py-12">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={() => router.push('/child')} className="mt-4 w-full bg-gold text-navy hover:bg-gold-600">
          Back to dashboard
        </Button>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-md px-4 py-12">
        <Card className="border-navy/10 bg-cream-light text-center">
          <CardContent className="pt-12">
            <CheckCircle2 className="mx-auto h-16 w-16 text-gold" />
            <h1 className="mt-4 font-serif text-2xl font-bold text-navy">Quiz submitted</h1>
            <p className="mt-2 text-muted-foreground">
              Your answers have been recorded. Check your dashboard for results once your coordinator publishes them.
            </p>
            <Button onClick={() => router.push('/child')} className="mt-6 bg-gold text-navy hover:bg-gold-600">
              Back to dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Review screen
  if (showReview) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Card className="border-navy/10 bg-cream-light">
          <CardHeader>
            <CardTitle className="font-serif text-2xl text-navy">Review your answers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {questions.map((q, idx) => {
              const ans = answers[q.id];
              const answered = (ans?.selectedOptionId || ans?.textAnswer?.trim());
              return (
                <div key={q.id} className={`rounded-lg border p-4 ${answered ? 'border-navy/10 bg-cream' : 'border-crest/30 bg-crest/5'}`}>
                  <p className="font-medium text-navy">{idx + 1}. {q.question_text}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {answered
                      ? q.question_type === 'multiple_choice'
                        ? `Selected: ${q.options.find((o) => o.id === ans?.selectedOptionId)?.option_text || '—'}`
                        : q.question_type === 'true_false'
                        ? `Selected: ${ans?.selectedOptionId === q.options.find((o) => o.is_correct)?.id ? 'True' : 'False'}`
                        : `Answer: ${ans?.textAnswer}`
                      : 'Not answered'}
                  </p>
                </div>
              );
            })}

            {flags > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  You switched tabs {flags} time(s) during this quiz. Your coordinator has been notified.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowReview(false)} className="border-navy/20">
                <ChevronLeft className="mr-1 h-4 w-4" /> Back to quiz
              </Button>
              <Button onClick={() => handleSubmit(false)} disabled={submitting} className="flex-1 bg-gold text-navy hover:bg-gold-600">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit quiz'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQ = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const lowTime = timeLeft < 60;

  return (
    <div className={`mx-auto max-w-3xl px-4 py-8 ${largeText ? 'large-text-mode' : ''}`}>
      {/* Header bar */}
      <div className="mb-6 flex items-center justify-between rounded-lg border border-navy/10 bg-navy px-4 py-3 text-cream">
        <div className="flex items-center gap-2">
          <Clock className={`h-5 w-5 ${lowTime ? 'text-crest' : 'text-gold'}`} />
          <span className={`font-serif text-lg font-bold ${lowTime ? 'text-crest' : 'text-gold'}`}>
            {minutes}:{seconds.toString().padStart(2, '0')}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {(ageCategory === '0-5' || ageCategory === '6-8') && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setLargeText(!largeText)}
              className="text-cream hover:bg-navy-400 hover:text-gold"
            >
              <Type className="mr-1 h-4 w-4" /> {largeText ? 'Normal text' : 'Large text'}
            </Button>
          )}
          {flags > 0 && (
            <span className="flex items-center gap-1 text-xs text-crest">
              <AlertTriangle className="h-3 w-3" /> {flags} flag{flags > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Progress */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-navy">Question {currentIndex + 1} of {questions.length}</span>
          <span className="text-muted-foreground">{isPractice ? 'Practice mode' : `${STAGE_LABELS[stageParam as StageLevel]} stage`}</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-cream-dark">
          <div className="h-full rounded-full bg-gold transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Question */}
      <Card className="border-navy/10 bg-cream-light">
        <CardContent className="pt-6">
          <div className="mb-4 flex items-center justify-between">
            <Badge variant="outline" className="text-gold-600">{currentQ.points} point{currentQ.points > 1 ? 's' : ''}</Badge>
            <Badge variant="outline">
              {currentQ.question_type === 'multiple_choice' ? 'Multiple choice' : currentQ.question_type === 'true_false' ? 'True / False' : 'Fill in the blank'}
            </Badge>
          </div>

          <h2 className="mb-6 font-serif text-xl font-semibold text-navy">{currentQ.question_text}</h2>

          {currentQ.question_type === 'multiple_choice' && (
            <RadioGroup
              value={answers[currentQ.id]?.selectedOptionId || ''}
              onValueChange={(v) => updateAnswer(currentQ.id, v, '')}
              className="space-y-3"
            >
              {currentQ.options.map((opt) => (
                <div key={opt.id} className="flex items-center gap-3 rounded-lg border border-navy/10 bg-cream p-3 transition-colors hover:bg-cream-dark">
                  <RadioGroupItem value={opt.id} id={`opt-${opt.id}`} className="text-gold" />
                  <Label htmlFor={`opt-${opt.id}`} className="flex-1 cursor-pointer text-navy">{opt.option_text}</Label>
                </div>
              ))}
            </RadioGroup>
          )}

          {currentQ.question_type === 'true_false' && (
            <RadioGroup
              value={answers[currentQ.id]?.selectedOptionId || ''}
              onValueChange={(v) => updateAnswer(currentQ.id, v, '')}
              className="grid grid-cols-2 gap-3"
            >
              {currentQ.options.map((opt) => (
                <div key={opt.id} className="flex items-center gap-3 rounded-lg border border-navy/10 bg-cream p-4 transition-colors hover:bg-cream-dark">
                  <RadioGroupItem value={opt.id} id={`opt-${opt.id}`} className="text-gold" />
                  <Label htmlFor={`opt-${opt.id}`} className="cursor-pointer font-medium text-navy">{opt.option_text}</Label>
                </div>
              ))}
            </RadioGroup>
          )}

          {currentQ.question_type === 'fill_blank' && (
            <Textarea
              value={answers[currentQ.id]?.textAnswer || ''}
              onChange={(e) => updateAnswer(currentQ.id, null, e.target.value)}
              placeholder="Type your answer here..."
              rows={3}
              className="bg-cream"
              onCopy={handleCopyPaste as unknown as React.ClipboardEventHandler}
              onPaste={handleCopyPaste as unknown as React.ClipboardEventHandler}
            />
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="mt-6 flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
          disabled={currentIndex === 0}
          className="border-navy/20"
        >
          <ChevronLeft className="mr-1 h-4 w-4" /> Previous
        </Button>

        {currentIndex < questions.length - 1 ? (
          <Button onClick={() => setCurrentIndex(currentIndex + 1)} className="bg-navy text-cream hover:bg-navy-500">
            Next <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={() => setShowReview(true)} className="bg-gold text-navy hover:bg-gold-600">
            Review answers
          </Button>
        )}
      </div>

      {/* Question dots */}
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {questions.map((q, idx) => (
          <button
            key={q.id}
            onClick={() => setCurrentIndex(idx)}
            className={`h-3 w-3 rounded-full transition-colors ${
              idx === currentIndex ? 'bg-gold' : answers[q.id]?.selectedOptionId || answers[q.id]?.textAnswer?.trim() ? 'bg-navy' : 'bg-navy/20'
            }`}
            aria-label={`Question ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

function determineUnitFilter(stage: string): { column: string; value: string } {
  if (stage === 'parish') return { column: 'parish_id', value: 'parish' };
  if (stage === 'area') return { column: 'area_id', value: 'area' };
  if (stage === 'zonal') return { column: 'zone_id', value: 'zonal' };
  if (stage === 'provincial') return { column: 'province_id', value: 'provincial' };
  return { column: 'region_id', value: 'regional' };
}
