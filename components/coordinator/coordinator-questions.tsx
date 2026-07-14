'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { CoordinatorData } from '@/app/coordinator/page';
import { AGE_CATEGORIES, AGE_CATEGORY_LABELS, AgeCategory, STAGE_LEVELS, STAGE_LABELS, STAGE_ORDER, StageLevel, QuestionType } from '@/lib/constants';
import { Plus, Trash2, Edit, Loader2 } from 'lucide-react';

interface QuestionRecord {
  id: string;
  question_text: string;
  question_type: string;
  points: number;
  age_category: string;
  stage_level: string;
  correct_answer: string | null;
  is_approved: boolean;
  question_options: { id: string; option_text: string; is_correct: boolean; display_order: number }[];
}

export function CoordinatorQuestions({ coordinator, seasonId }: { coordinator: CoordinatorData; seasonId: string }) {
  const { toast } = useToast();
  const [questions, setQuestions] = useState<QuestionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [showDialog, setShowDialog] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuestionRecord | null>(null);

  const stageLevel = coordinatorLevelToStage(coordinator.level);

  const loadQuestions = useCallback(async () => {
    if (!seasonId) { setLoading(false); return; }
    setLoading(true);
    const filter = buildQuestionFilter(coordinator);
    let query = supabase
      .from('questions')
      .select(`
        id, question_text, question_type, points, age_category, stage_level, correct_answer, is_approved,
        question_options (id, option_text, is_correct, display_order)
      `)
      .eq('season_id', seasonId)
      .eq(filter.column, filter.value)
      .order('created_at', { ascending: false });

    if (filterCategory !== 'all') query = query.eq('age_category', filterCategory);

    const { data } = await query;
    setQuestions(data as QuestionRecord[] || []);
    setLoading(false);
  }, [coordinator, seasonId, filterCategory]);

  useEffect(() => { loadQuestions(); }, [loadQuestions]);

  async function deleteQuestion(id: string) {
    const { error } = await supabase.from('questions').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Question deleted' });
      loadQuestions();
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-xl font-semibold text-navy">Question bank</h2>
          <p className="text-sm text-muted-foreground">
            Questions for {STAGE_LABELS[stageLevel]} stage in your unit. Each child receives a randomized subset.
          </p>
        </div>
        <Button onClick={() => { setEditingQuestion(null); setShowDialog(true); }} className="bg-gold text-navy hover:bg-gold-600">
          <Plus className="mr-2 h-4 w-4" /> Add question
        </Button>
      </div>

      <Select value={filterCategory} onValueChange={setFilterCategory}>
        <SelectTrigger className="w-48"><SelectValue placeholder="All categories" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All categories</SelectItem>
          {AGE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{AGE_CATEGORY_LABELS[c]}</SelectItem>)}
        </SelectContent>
      </Select>

      <Card className="border-navy/10 bg-cream-light">
        <CardContent className="pt-6">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : questions.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">No questions yet for this stage.</p>
              <p className="mt-1 text-sm text-muted-foreground/60">Add questions to your bank so children can take the quiz.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-2/3">Question</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-center">Points</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {questions.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell>
                      <p className="font-medium text-sm text-navy line-clamp-2">{q.question_text}</p>
                      {!q.is_approved && <Badge variant="outline" className="mt-1 text-gold-600">Pending approval</Badge>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {q.question_type === 'multiple_choice' ? 'MCQ' : q.question_type === 'true_false' ? 'T/F' : 'Fill'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{AGE_CATEGORY_LABELS[q.age_category as AgeCategory] || q.age_category}</TableCell>
                    <TableCell className="text-center text-sm font-medium">{q.points}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => { setEditingQuestion(q); setShowDialog(true); }}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => deleteQuestion(q.id)} className="text-crest">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <QuestionDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        coordinator={coordinator}
        seasonId={seasonId}
        stageLevel={stageLevel}
        editing={editingQuestion}
        onSaved={loadQuestions}
      />
    </div>
  );
}

function QuestionDialog({ open, onOpenChange, coordinator, seasonId, stageLevel, editing, onSaved }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  coordinator: CoordinatorData;
  seasonId: string;
  stageLevel: StageLevel;
  editing: QuestionRecord | null;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [questionText, setQuestionText] = useState('');
  const [questionType, setQuestionType] = useState<QuestionType>('multiple_choice');
  const [ageCategory, setAgeCategory] = useState<AgeCategory>('9-12');
  const [points, setPoints] = useState('1');
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [options, setOptions] = useState<{ text: string; isCorrect: boolean }[]>([
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editing) {
      setQuestionText(editing.question_text);
      setQuestionType(editing.question_type as QuestionType);
      setAgeCategory(editing.age_category as AgeCategory);
      setPoints(String(editing.points));
      setCorrectAnswer(editing.correct_answer || '');
      if (editing.question_type === 'multiple_choice') {
        setOptions(
          editing.question_options.length > 0
            ? editing.question_options.map((o) => ({ text: o.option_text, isCorrect: o.is_correct }))
            : [{ text: '', isCorrect: false }, { text: '', isCorrect: false }]
        );
      }
    } else {
      setQuestionText('');
      setQuestionType('multiple_choice');
      setAgeCategory('9-12');
      setPoints('1');
      setCorrectAnswer('');
      setOptions([{ text: '', isCorrect: false }, { text: '', isCorrect: false }]);
    }
    setError(null);
  }, [editing, open]);

  function addOption() {
    if (options.length >= 5) return;
    setOptions([...options, { text: '', isCorrect: false }]);
  }

  function removeOption(idx: number) {
    if (options.length <= 2) return;
    setOptions(options.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!questionText.trim()) { setError('Question text is required.'); return; }
    if (!seasonId) { setError('No active season found.'); return; }

    const pts = parseInt(points, 10);
    if (isNaN(pts) || pts <= 0) { setError('Points must be a positive number.'); return; }

    if (questionType === 'multiple_choice') {
      const filled = options.filter((o) => o.text.trim());
      if (filled.length < 2) { setError('Multiple choice needs at least 2 options.'); return; }
      if (!filled.some((o) => o.isCorrect)) { setError('Select at least one correct option.'); return; }
    }
    if (questionType === 'true_false' && !correctAnswer) { setError('Select the correct answer (true or false).'); return; }
    if (questionType === 'fill_blank' && !correctAnswer.trim()) { setError('Enter the correct answer for reference.'); return; }

    setLoading(true);
    const filter = buildQuestionFilter(coordinator);
    const questionData: Record<string, unknown> = {
      season_id: seasonId,
      stage_level: stageLevel,
      age_category: ageCategory,
      question_type: questionType,
      question_text: questionText.trim(),
      points: pts,
      correct_answer: questionType === 'multiple_choice' ? null : correctAnswer.trim(),
      [filter.column]: filter.value,
      is_approved: true,
    };

    let questionId = editing?.id;

    if (editing) {
      const { error: updateError } = await supabase.from('questions').update(questionData).eq('id', editing.id);
      if (updateError) { setError(updateError.message); setLoading(false); return; }
      // Delete old options
      await supabase.from('question_options').delete().eq('question_id', editing.id);
    } else {
      const { data: newQ, error: insertError } = await supabase.from('questions').insert(questionData).select('id').single();
      if (insertError) { setError(insertError.message); setLoading(false); return; }
      questionId = newQ.id;
    }

    if (questionType === 'multiple_choice' && questionId) {
      const optData = options
        .filter((o) => o.text.trim())
        .map((o, idx) => ({
          question_id: questionId,
          option_text: o.text.trim(),
          is_correct: o.isCorrect,
          display_order: idx,
        }));
      const { error: optError } = await supabase.from('question_options').insert(optData);
      if (optError) { setError(optError.message); setLoading(false); return; }
    }

    setLoading(false);
    toast({ title: editing ? 'Question updated' : 'Question added' });
    onOpenChange(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl text-navy">{editing ? 'Edit question' : 'Add a question'}</DialogTitle>
          <DialogDescription>Stage: {STAGE_LABELS[stageLevel]}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-crest">{error}</p>}

          <div className="space-y-2">
            <Label>Question text</Label>
            <Textarea value={questionText} onChange={(e) => setQuestionText(e.target.value)} rows={3} required />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Question type</Label>
              <Select value={questionType} onValueChange={(v) => { setQuestionType(v as QuestionType); setCorrectAnswer(''); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="multiple_choice">Multiple choice</SelectItem>
                  <SelectItem value="true_false">True / False</SelectItem>
                  <SelectItem value="fill_blank">Fill in the blank</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Age category</Label>
              <Select value={ageCategory} onValueChange={(v) => setAgeCategory(v as AgeCategory)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AGE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{AGE_CATEGORY_LABELS[c]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Points</Label>
              <Input type="number" min="1" max="10" value={points} onChange={(e) => setPoints(e.target.value)} />
            </div>
          </div>

          {questionType === 'multiple_choice' && (
            <div className="space-y-3">
              <Label>Options (2–5)</Label>
              {options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={opt.isCorrect}
                    onChange={(e) => setOptions(options.map((o, i) => i === idx ? { ...o, isCorrect: e.target.checked } : o))}
                    className="h-4 w-4 accent-gold"
                    title="Mark as correct"
                  />
                  <Input
                    value={opt.text}
                    onChange={(e) => setOptions(options.map((o, i) => i === idx ? { ...o, text: e.target.value } : o))}
                    placeholder={`Option ${idx + 1}`}
                  />
                  {options.length > 2 && (
                    <Button type="button" size="sm" variant="ghost" onClick={() => removeOption(idx)} className="text-crest">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              {options.length < 5 && (
                <Button type="button" size="sm" variant="outline" onClick={addOption}>
                  <Plus className="mr-1 h-3 w-3" /> Add option
                </Button>
              )}
            </div>
          )}

          {questionType === 'true_false' && (
            <div className="space-y-2">
              <Label>Correct answer</Label>
              <Select value={correctAnswer} onValueChange={setCorrectAnswer}>
                <SelectTrigger><SelectValue placeholder="Select answer" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">True</SelectItem>
                  <SelectItem value="false">False</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {questionType === 'fill_blank' && (
            <div className="space-y-2">
              <Label>Reference answer (for manual grading)</Label>
              <Input value={correctAnswer} onChange={(e) => setCorrectAnswer(e.target.value)} placeholder="The expected answer" />
              <p className="text-xs text-muted-foreground">Fill-in-the-blank answers are manually graded by you. This reference helps you evaluate responses.</p>
            </div>
          )}

          <Button type="submit" className="w-full bg-gold text-navy hover:bg-gold-600" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? 'Save changes' : 'Add question'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function buildQuestionFilter(coordinator: CoordinatorData): { column: string; value: string } {
  if (coordinator.level === 'parish') return { column: 'parish_id', value: coordinator.parish_id! };
  if (coordinator.level === 'area') return { column: 'area_id', value: coordinator.area_id! };
  if (coordinator.level === 'zone') return { column: 'zone_id', value: coordinator.zone_id! };
  if (coordinator.level === 'province') return { column: 'province_id', value: coordinator.province_id! };
  return { column: 'region_id', value: coordinator.region_id! };
}

function coordinatorLevelToStage(level: string): StageLevel {
  if (level === 'parish') return 'parish';
  if (level === 'area') return 'area';
  if (level === 'zone') return 'zonal';
  if (level === 'province') return 'provincial';
  return 'regional';
}
