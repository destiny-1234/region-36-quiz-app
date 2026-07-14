'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Loader2, Archive } from 'lucide-react';

interface SeasonRecord {
  id: string;
  name: string;
  year: number;
  status: string;
  is_current: boolean;
  created_at: string;
}

export function AdminSeasons() {
  const { toast } = useToast();
  const [seasons, setSeasons] = useState<SeasonRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newYear, setNewYear] = useState(String(new Date().getFullYear() + 1));
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from('seasons').select('*').order('year', { ascending: false });
    setSeasons(data as SeasonRecord[] || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function archiveSeason(season: SeasonRecord) {
    if (!confirm(`Archive ${season.name}? It will remain browsable but no longer editable.`)) return;
    const { error } = await supabase
      .from('seasons')
      .update({ status: 'archived', is_current: false })
      .eq('id', season.id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Season archived', description: `${season.name} is now archived.` });
      load();
    }
  }

  async function setCurrent(season: SeasonRecord) {
    // Unset all others first
    await supabase.from('seasons').update({ is_current: false }).neq('id', season.id);
    const { error } = await supabase
      .from('seasons')
      .update({ is_current: true, status: 'active' })
      .eq('id', season.id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Current season updated', description: `${season.name} is now the active season.` });
      load();
    }
  }

  async function handleAdd() {
    if (!newName.trim() || !newYear) return;
    setAdding(true);

    // Unset current
    await supabase.from('seasons').update({ is_current: false }).eq('is_current', true);

    const { error } = await supabase.from('seasons').insert({
      name: newName.trim(),
      year: parseInt(newYear, 10),
      status: 'active',
      is_current: true,
    });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      // Create stage configs for new season
      const { data: newSeason } = await supabase
        .from('seasons')
        .select('id')
        .eq('name', newName.trim())
        .maybeSingle();

      if (newSeason) {
        const stages = ['parish', 'area', 'zonal', 'provincial', 'regional'];
        for (const stage of stages) {
          await supabase.from('stage_configs').insert({
            season_id: newSeason.id,
            level: stage,
            is_open: false,
            time_limit_minutes: 30,
            pool_size: 10,
            requires_question_approval: false,
            results_published: false,
          });
        }
      }

      toast({ title: 'Season created', description: `${newName} is now the active season.` });
      setShowAdd(false);
      setNewName('');
      load();
    }
    setAdding(false);
  }

  if (loading) {
    return <Skeleton className="h-48 w-full" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-xl font-semibold text-navy">Seasons</h2>
          <p className="text-sm text-muted-foreground">Manage competition seasons — start new, archive old</p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="bg-gold text-navy hover:bg-gold-600">
          <Plus className="mr-2 h-4 w-4" /> New season
        </Button>
      </div>

      <Card className="border-navy/10 bg-cream-light">
        <CardContent className="pt-6">
          {seasons.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">No seasons yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Current</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {seasons.map((season) => (
                  <TableRow key={season.id}>
                    <TableCell className="font-medium">{season.name}</TableCell>
                    <TableCell>{season.year}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        season.status === 'active' ? 'bg-green-100 text-green-700' :
                        season.status === 'archived' ? 'bg-muted text-muted-foreground' :
                        'bg-gold/15 text-gold-700'
                      }>
                        {season.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {season.is_current ? <Badge className="bg-gold/15 text-gold-700">Current</Badge> : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {!season.is_current && season.status !== 'archived' && (
                          <Button size="sm" variant="outline" onClick={() => setCurrent(season)} className="border-navy/20">
                            Set current
                          </Button>
                        )}
                        {season.status !== 'archived' && (
                          <Button size="sm" variant="outline" onClick={() => archiveSeason(season)} className="border-crest/30 text-crest">
                            <Archive className="mr-1 h-3 w-3" /> Archive
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

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-navy">Create new season</DialogTitle>
            <DialogDescription>This will become the current active season.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Season name</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. RCCG Region 36 Quiz 2026" />
            </div>
            <div className="space-y-2">
              <Label>Year</Label>
              <Input type="number" value={newYear} onChange={(e) => setNewYear(e.target.value)} min="2024" max="2030" />
            </div>
            <Button onClick={handleAdd} className="w-full bg-gold text-navy hover:bg-gold-600" disabled={adding || !newName.trim()}>
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create season'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
