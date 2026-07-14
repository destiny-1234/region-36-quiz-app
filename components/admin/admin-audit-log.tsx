'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase-client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

interface AuditEntry {
  id: string;
  actor_name: string | null;
  action: string;
  entity_type: string | null;
  details: Record<string, unknown>;
  unit_context: string | null;
  created_at: string;
}

export function AdminAuditLog() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1);
    setEntries(data as AuditEntry[] || []);
    setLoading(false);
  }, [page]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-serif text-xl font-semibold text-navy">Audit log</h2>
        <p className="text-sm text-muted-foreground">
          Every grading override, qualification change, question edit, and stage open/close action.
        </p>
      </div>

      <Card className="border-navy/10 bg-cream-light">
        <CardContent className="pt-6">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : entries.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">No audit entries yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Who</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Unit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {format(new Date(entry.created_at), 'dd MMM yyyy, HH:mm')}
                    </TableCell>
                    <TableCell className="font-medium text-sm">{entry.actor_name || 'System'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{entry.action}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{entry.unit_context || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <div className="mt-4 flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0 || loading}
              className="border-navy/20"
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">Page {page + 1}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={entries.length < pageSize || loading}
              className="border-navy/20"
            >
              Next
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
