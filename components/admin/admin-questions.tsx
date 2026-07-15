'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { AGE_CATEGORIES, AGE_CATEGORY_LABELS, AgeCategory, STAGE_LEVELS, STAGE_LABELS, StageLevel, QuestionType, REGION_ID } from '@/lib/constants';
import { Plus, Trash2, Edit, Loader2, Eye } from 'lucide-react';

interface QuestionRecord {
  id: string;
  question_text: string;
  question_type: string;
  points: number;
  age_category: string;
  stage_level: string;
  is_approved: boolean;
  parish_id: string | null;
  area_id: string | null;
  zone_id: string | null;
  province_id: string | null;
  question_options: { id: string; option_text: string; is_correct: boolean }[];
}

export function AdminQuestions({ seasonId }: { seasonId: string }) {
  const { toast } = useToast();
  const [questions, setQuestions] = useState<QuestionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStage, setFilterStage] = useState<string>('regional');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<QuestionRecord | null>(null);
  const [readOnly, setReadOnly] = useState(false);

  const load = useCallback(async () => {
    if (!seasonId) return;
    setLoading(true);
    let query = supabase
      .from('questions')
      .select(`
        id, question_text, question_type, points, age_category, stage_level, is_approved,
        parish_id, area_id, zone_id, province_id,
        question_options (id, option_text, is_correct)
      `)
      .eq('season_id', seasonId)
      .eq('stage_level', filterStage)
      .order('created_at', { ascending: false });

    if (filterCategory !== 'all') query = query.eq('age_category', filterCategory);

    const { data } = await query;
    setQuestions(data as QuestionRecord[] || []);
    setLoading(false);
  }, [seasonId, filterStage, filterCategory]);

  useEffect(() => { load(); }, [load]);

  const canEdit = filterStage === 'regional';

  async function deleteQuestion(id: string) {
    const { error } = await supabase.from('questions').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Question deleted' });
      load();
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-serif text-xl font-semibold text-navy">Question bank oversight</h2>
        <p className="text-sm text-muted-foreground">
          {canEdit
            ? 'You have full edit rights on Regional stage questions. Other stages are read-only for oversight.'
            : 'Read-only view of questions at this stage. You can only edit Regional stage questions.'}
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={filterStage} onValueChange={(v) => { setFilterStage(v); setReadOnly(v !== 'regional'); }}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {STAGE_LEVELS.map((s) => <SelectItem key={s} value={s}>{STAGE_LABELS[s]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {AGE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{AGE_CATEGORY_LABELS[c]}</SelectItem>)}
          </SelectContent>
        </Select>
        {canEdit && (
          <Button onClick={() => { setEditing(null); setShowDialog(true); }} className="bg-gold text-navy hover:bg-gold-600">
            <Plus className="mr-2 h-4 w-4" /> Add question
          </Button>
        )}
      </div>

      <Card className="border-navy/10 bg-cream-light">
        <CardContent className="pt-6">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : questions.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">No questions for this stage and category.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-2/3">Question</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-center">Pts</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {questions.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell>
                      <p className="font-medium text-sm text-navy line-clamp-2">{q.question_text}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {q.question_type === 'multiple_choice' ? 'MCQ' : q.question_type === 'true_false' ? 'T/F' : 'Fill'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{AGE_CATEGORY_LABELS[q.age_category as AgeCategory]}</TableCell>
                    <TableCell className="text-center text-sm font-medium">{q.points}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        {canEdit ? (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => { setEditing(q); setShowDialog(true); }}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => deleteQuestion(q.id)} className="text-crest">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <Button size="sm" variant="ghost" disabled>
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {canEdit && (
        <RegionalQuestionDialog
          open={showDialog}
          onOpenChange={setShowDialog}
          seasonId={seasonId}
          editing={editing}
          onSaved={load}
        />
      )}
    </div>
  );
}

function RegionalQuestionDialog({ open, onOpenChange, seasonId, editing, onSaved }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  seasonId: string;
  editing: QuestionRecord | null;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [text, setText] = useState('');
  const [type, setType] = useState<QuestionType>('multiple_choice');
  const [category, setCategory] = useState<AgeCategory>('9-12');
  const [points, setPoints] = useState('1');
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [options, setOptions] = useState<{ text: string; isCorrect: boolean }[]>([
    { text: '', isCorrect: false }, { text: '', isCorrect: false },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editing) {
      setText(editing.question_text);
      setType(editing.question_type as QuestionType);
      setCategory(editing.age_category as AgeCategory);
      setPoints(String(editing.points));
      setCorrectAnswer(editing.question_text || '');
      if (editing.question_type === 'multiple_choice') {
        setOptions(editing.question_options.map((o) => ({ text: o.option_text, isCorrect: o.is_correct })));
      }
    } else {
      setText(''); setType('multiple_choice'); setCategory('9-12'); setPoints('1'); setCorrectAnswer('');
      setOptions([{ text: '', isCorrect: false }, { text: '', isCorrect: false }]);
    }
    setError(null);
  }, [editing, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!text.trim()) { setError('Question text is required.'); return; }

    setLoading(true);
    const regionId = REGION_ID;
    const data: Record<string, unknown> = {
      season_id: seasonId,
      stage_level: 'regional',
      age_category: category,
      question_type: type,
      question_text: text.trim(),
      points: parseInt(points, 10) || 1,
      correct_answer: type === 'multiple_choice' ? null : correctAnswer.trim(),
      region_id: regionId,
      is_approved: true,
    };

    let qId = editing?.id;
    if (editing) {
      await supabase.from('questions').update(data).eq('id', editing.id);
      await supabase.from('question_options').delete().eq('question_id', editing.id);
    } else {
      const { data: newQ } = await supabase.from('questions').insert(data).select('id').single();
      qId = newQ?.id;
    }

    if (type === 'multiple_choice' && qId) {
      const optData = options.filter((o) => o.text.trim()).map((o, idx) => ({
        question_id: qId,
        option_text: o.text.trim(),
        is_correct: o.isCorrect,
        display_order: idx,
      }));
      await supabase.from('question_options').insert(optData);
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
          <DialogTitle className="font-serif text-xl text-navy">{editing ? 'Edit question' : 'Add regional question'}</DialogTitle>
          <DialogDescription>Regional stage — final round questions</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-crest">{error}</p>}
          <div className="space-y-2">
            <Label>Question text</Label>
            <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} required />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as QuestionType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="multiple_choice">MCQ</SelectItem>
                  <SelectItem value="true_false">True/False</SelectItem>
                  <SelectItem value="fill_blank">Fill blank</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as AgeCategory)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AGE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{AGE_CATEGORY_LABELS[c]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Points</Label>
              <Input type="number" min="1" max="10" value={points} onChange={(e) => setPoints(e.target.value)} />
            </div>
          </div>

          {type === 'multiple_choice' && (
            <div className="space-y-2">
              <Label>Options</Label>
              {options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input type="checkbox" checked={opt.isCorrect} onChange={(e) => setOptions(options.map((o, i) => i === idx ? { ...o, isCorrect: e.target.checked } : o))} className="h-4 w-4 accent-gold" />
                  <Input value={opt.text} onChange={(e) => setOptions(options.map((o, i) => i === idx ? { ...o, text: e.target.value } : o))} placeholder={`Option ${idx + 1}`} />
                </div>
              ))}
              {options.length < 5 && (
                <Button type="button" size="sm" variant="outline" onClick={() => setOptions([...options, { text: '', isCorrect: false }])}>
                  <Plus className="mr-1 h-3 w-3" /> Add option
                </Button>
              )}
            </div>
          )}
          {(type === 'true_false' || type === 'fill_blank') && (
            <div className="space-y-2">
              <Label>{type === 'true_false' ? 'Correct answer' : 'Reference answer'}</Label>
              {type === 'true_false' ? (
                <Select value={correctAnswer} onValueChange={setCorrectAnswer}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">True</SelectItem>
                    <SelectItem value="false">False</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Input value={correctAnswer} onChange={(e) => setCorrectAnswer(e.target.value)} />
              )}
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
