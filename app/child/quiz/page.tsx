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
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { STAGE_LABELS, StageLevel } from '@/lib/constants';
import { Loader2, Clock, AlertTriangle, Type, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

// NOTE: is_correct is never fetched here. Grading happens server-side in the
// submit_attempt() RPC so a child can never see the answer key or set their
// own score. See supabase/migrations/006_security_hardening.sql.
interface QuizQuestion {
  id: string;
  question_text: string;
  question_type: string;
  points: number;
  display_order: number;
  options: { id: string; option_text: string }[];
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
  const stageParam = (searchParams.get('stage') || 'parish') as StageLevel;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ageCategory, setAgeCategory] = useState<string>('');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [attemptId, setAttemptId] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState(30 * 60);
  const [submitting, setSubmitting] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ pending_grading: boolean } | null>(null);
  const [largeText, setLargeText] = useState(false);
  const [flags, setFlags] = useState<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autosaveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const answersRef = useRef<AnswerMap>({});
  answersRef.current = answers;

  useEffect(() => {
    (async () => {
      if (!user) return;

      const { data: child, error: childErr } = await supabase
        .from('children')
        .select('id, age_category')
        .eq('user_id', user.id)
        .maybeSingle();

      if (childErr || !child) {
        setError('No child profile found.');
        setLoading(false);
        return;
      }
      setAgeCategory(child.age_category);

      const { data: newAttemptId, error: startErr } = await supabase.rpc('start_or_resume_attempt', {
        p_child_id: child.id,
        p_stage: stageParam,
        p_practice: isPractice,
      });

      if (startErr) {
        setError(startErr.message.includes('already been attempted')
          ? 'You have already submitted this quiz. Check your dashboard for results.'
          : startErr.message.includes('not open')
          ? 'This stage is not open yet. Please wait for your coordinator to open it.'
          : startErr.message);
        setLoading(false);
        return;
      }

      setAttemptId(newAttemptId as string);

      const { data: attemptRow } = await supabase
        .from('attempts')
        .select('server_deadline, started_at')
        .eq('id', newAttemptId)
        .maybeSingle();

      if (attemptRow?.server_deadline) {
        const secondsLeft = Math.max(0, Math.floor((new Date(attemptRow.server_deadline).getTime() - Date.now()) / 1000));
        setTimeLeft(secondsLeft);
      }

      const { data: rows, error: qErr } = await supabase.rpc('get_quiz_questions', { p_attempt_id: newAttemptId });

      if (qErr || !rows || rows.length === 0) {
        setError(qErr?.message || 'No questions available for this stage and age category yet. Please check back later.');
        setLoading(false);
        return;
      }

      const grouped = new Map<string, QuizQuestion>();
      for (const row of rows as Array<Record<string, unknown>>) {
        const qId = row.question_id as string;
        if (!grouped.has(qId)) {
          grouped.set(qId, {
            id: qId,
            question_text: row.question_text as string,
            question_type: row.question_type as string,
            points: row.points as number,
            display_order: row.display_order as number,
            options: [],
          });
        }
        if (row.option_id) {
          grouped.get(qId)!.options.push({
            id: row.option_id as string,
            option_text: row.option_text as string,
          });
        }
      }
      const processed = Array.from(grouped.values()).sort((a, b) => a.display_order - b.display_order);
      setQuestions(processed);

      const { data: existingAnswers } = await supabase
        .from('attempt_answers')
        .select('question_id, selected_option_id, text_answer')
        .eq('attempt_id', newAttemptId);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, stageParam, isPractice]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, submitted, showReview]);

  const autosave = useCallback(async () => {
    if (!attemptId) return;
    for (const [qId, ans] of Object.entries(answersRef.current)) {
      if (!ans.selectedOptionId && !ans.textAnswer) continue;
      await supabase.rpc('save_answer', {
        p_attempt_id: attemptId,
        p_question_id: qId,
        p_selected_option_id: ans.selectedOptionId,
        p_text_answer: ans.textAnswer || null,
      });
    }
  }, [attemptId]);

  useEffect(() => {
    if (loading || submitted) return;
    autosaveRef.current = setInterval(autosave, 5000);
    return () => { if (autosaveRef.current) clearInterval(autosaveRef.current); };
  }, [loading, submitted, autosave]);

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
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [loading, submitted, toast]);

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
    setAnswers((prev) => ({ ...prev, [qId]: { selectedOptionId, textAnswer } }));
  }

  async function handleSubmit(auto = false) {
    if (submitting || submitted) return;
    setSubmitting(true);

    await autosave();

    const { data, error: submitErr } = await supabase.rpc('submit_attempt', { p_attempt_id: attemptId });

    if (submitErr) {
      toast({ title: 'Could not submit', description: submitErr.message, variant: 'destructive' });
      setSubmitting(false);
      return;
    }

    setSubmitResult(data as { pending_grading: boolean });
    setSubmitting(false);
    setSubmitted(true);
    if (timerRef.current) clearInterval(timerRef.current);
    if (autosaveRef.current) clearInterval(autosaveRef.current);

    toast({
      title: auto ? 'Time up — quiz submitted' : 'Quiz submitted',
      description: 'Your answers have been recorded. Results will be visible once your coordinator publishes them.',
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
              {submitResult?.pending_grading
                ? 'Your multiple-choice answers have been graded. Fill-in-the-blank answers are pending manual grading.'
                : 'Your answers have been recorded. Check your dashboard for results once your coordinator publishes them.'}
            </p>
            <Button onClick={() => router.push('/child')} className="mt-6 bg-gold text-navy hover:bg-gold-600">
              Back to dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
              const answered = ans?.selectedOptionId || ans?.textAnswer?.trim();
              return (
                <div key={q.id} className={`rounded-lg border p-4 ${answered ? 'border-navy/10 bg-cream' : 'border-crest/30 bg-crest/5'}`}>
                  <p className="font-medium text-navy">{idx + 1}. {q.question_text}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {answered
                      ? q.question_type === 'fill_blank'
                        ? `Answer: ${ans?.textAnswer}`
                        : `Selected: ${q.options.find((o) => o.id === ans?.selectedOptionId)?.option_text || '—'}`
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
      <div className="mb-6 flex items-center justify-between rounded-lg border border-navy/10 bg-navy px-4 py-3 text-cream">
        <div className="flex items-center gap-2">
          <Clock className={`h-5 w-5 ${lowTime ? 'text-crest' : 'text-gold'}`} />
          <span className={`font-serif text-lg font-bold ${lowTime ? 'text-crest' : 'text-gold'}`}>
            {minutes}:{seconds.toString().padStart(2, '0')}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {(ageCategory === '0-5' || ageCategory === '6-8') && (
            <Button size="sm" variant="ghost" onClick={() => setLargeText(!largeText)} className="text-cream hover:bg-navy-400 hover:text-gold">
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

      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-navy">Question {currentIndex + 1} of {questions.length}</span>
          <span className="text-muted-foreground">{isPractice ? 'Practice mode' : `${STAGE_LABELS[stageParam]} stage`}</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-cream-dark">
          <div className="h-full rounded-full bg-gold transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </div>

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
            <RadioGroup value={answers[currentQ.id]?.selectedOptionId || ''} onValueChange={(v) => updateAnswer(currentQ.id, v, '')} className="space-y-3">
              {currentQ.options.map((opt) => (
                <div key={opt.id} className="flex items-center gap-3 rounded-lg border border-navy/10 bg-cream p-3 transition-colors hover:bg-cream-dark">
                  <RadioGroupItem value={opt.id} id={`opt-${opt.id}`} className="text-gold" />
                  <Label htmlFor={`opt-${opt.id}`} className="flex-1 cursor-pointer text-navy">{opt.option_text}</Label>
                </div>
              ))}
            </RadioGroup>
          )}

          {currentQ.question_type === 'true_false' && (
            <RadioGroup value={answers[currentQ.id]?.selectedOptionId || ''} onValueChange={(v) => updateAnswer(currentQ.id, v, '')} className="grid grid-cols-2 gap-3">
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

      <div className="mt-6 flex items-center justify-between">
        <Button variant="outline" onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))} disabled={currentIndex === 0} className="border-navy/20">
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
