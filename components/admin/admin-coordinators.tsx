'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase-client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { COORDINATOR_LEVEL_LABELS, CoordinatorLevel } from '@/lib/constants';
import { Check, X, Loader2 } from 'lucide-react';

interface CoordinatorRecord {
  id: string;
  full_name: string;
  email: string;
  level: string;
  is_approved: boolean;
  phone: string | null;
  parish_id: string | null;
  area_id: string | null;
  zone_id: string | null;
  province_id: string | null;
  created_at: string;
}

export function AdminCoordinators() {
  const { toast } = useToast();
  const [coordinators, setCoordinators] = useState<CoordinatorRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all');

  const load = useCallback(async () => {
    let query = supabase.from('coordinators').select('*').order('created_at', { ascending: false });
    if (filter === 'pending') query = query.eq('is_approved', false);
    if (filter === 'approved') query = query.eq('is_approved', true);
    const { data } = await query;
    setCoordinators(data as CoordinatorRecord[] || []);
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  async function toggleApproval(coord: CoordinatorRecord) {
    setActing(coord.id);
    const { error } = await supabase
      .from('coordinators')
      .update({ is_approved: !coord.is_approved })
      .eq('id', coord.id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({
        title: coord.is_approved ? 'Coordinator revoked' : 'Coordinator approved',
        description: `${coord.full_name} is now ${coord.is_approved ? 'pending' : 'approved'}.`,
      });
      load();
    }
    setActing(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-xl font-semibold text-navy">Coordinators</h2>
          <p className="text-sm text-muted-foreground">Approve or revoke coordinator access</p>
        </div>
        <div className="flex gap-2">
          {(['all', 'pending', 'approved'] as const).map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? 'default' : 'outline'}
              onClick={() => setFilter(f)}
              className={filter === f ? 'bg-gold text-navy' : 'border-navy/20'}
            >
              {f === 'all' ? 'All' : f === 'pending' ? 'Pending' : 'Approved'}
            </Button>
          ))}
        </div>
      </div>

      <Card className="border-navy/10 bg-cream-light">
        <CardContent className="pt-6">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : coordinators.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">No coordinators found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coordinators.map((coord) => (
                  <TableRow key={coord.id}>
                    <TableCell className="font-medium">{coord.full_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{coord.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{COORDINATOR_LEVEL_LABELS[coord.level as CoordinatorLevel]}</Badge>
                    </TableCell>
                    <TableCell>
                      {coord.is_approved
                        ? <Badge className="bg-green-100 text-green-700">Approved</Badge>
                        : <Badge className="bg-gold/15 text-gold-700">Pending</Badge>}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant={coord.is_approved ? 'outline' : 'default'}
                        onClick={() => toggleApproval(coord)}
                        disabled={acting === coord.id}
                        className={coord.is_approved ? 'border-crest text-crest' : 'bg-gold text-navy hover:bg-gold-600'}
                      >
                        {acting === coord.id ? <Loader2 className="h-4 w-4 animate-spin" /> :
                          coord.is_approved ? <><X className="mr-1 h-4 w-4" /> Revoke</> : <><Check className="mr-1 h-4 w-4" /> Approve</>}
                      </Button>
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
