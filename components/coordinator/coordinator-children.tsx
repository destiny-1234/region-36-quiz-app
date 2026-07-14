'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { CoordinatorData } from '@/app/coordinator/page';
import { AGE_CATEGORIES, AGE_CATEGORY_LABELS, AgeCategory, QUALIFICATION_STATUS_LABELS } from '@/lib/constants';
import { UserPlus, Upload, Loader2, Check, X, Ban, Printer } from 'lucide-react';

interface ChildRecord {
  id: string;
  full_name: string;
  age_category: string;
  date_of_birth: string;
  parent_name: string;
  parent_email: string;
  registration_number: string | null;
  parish_id: string;
  area_id: string;
  zone_id: string;
  province_id: string;
}

interface AttemptRecord {
  stage_level: string;
  status: string;
  qualification_status: string | null;
  percentage: number | null;
}

export function CoordinatorChildren({ coordinator, seasonId }: { coordinator: CoordinatorData; seasonId: string }) {
  const { toast } = useToast();
  const [children, setChildren] = useState<ChildRecord[]>([]);
  const [attempts, setAttempts] = useState<Record<string, AttemptRecord[]>>({});
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<string>('qualified');
  const [acting, setActing] = useState(false);

  const loadChildren = useCallback(async () => {
    setLoading(true);
    const filter = buildFilter(coordinator);
    let query = supabase.from('children').select('*').eq(filter.column, filter.value);
    if (filterCategory !== 'all') query = query.eq('age_category', filterCategory);
    if (search.trim()) query = query.ilike('full_name', `%${search.trim()}%`);
    query = query.order('full_name');

    const { data } = await query;
    setChildren(data as ChildRecord[] || []);

    // Load attempts for these children
    if (data && data.length > 0 && seasonId) {
      const childIds = data.map((c: ChildRecord) => c.id);
      const { data: attemptData } = await supabase
        .from('attempts')
        .select('child_id, stage_level, status, qualification_status, percentage')
        .eq('season_id', seasonId)
        .eq('is_practice', false)
        .in('child_id', childIds);

      const byChild: Record<string, AttemptRecord[]> = {};
      (attemptData || []).forEach((a: Record<string, unknown>) => {
        const cid = a.child_id as string;
        if (!byChild[cid]) byChild[cid] = [];
        byChild[cid].push({
          stage_level: a.stage_level as string,
          status: a.status as string,
          qualification_status: a.qualification_status as string | null,
          percentage: a.percentage as number | null,
        });
      });
      setAttempts(byChild);
    }
    setLoading(false);
  }, [coordinator, filterCategory, search, seasonId]);

  useEffect(() => { loadChildren(); }, [loadChildren]);

  async function markQualification(childIds: string[], status: string) {
    setActing(true);
    let successCount = 0;
    for (const cid of childIds) {
      const childAttempts = attempts[cid] || [];
      for (const att of childAttempts) {
        const { error } = await supabase
          .from('attempts')
          .update({ qualification_status: status })
          .eq('child_id', cid)
          .eq('stage_level', att.stage_level)
          .eq('season_id', seasonId);
        if (!error) successCount++;
      }
    }
    setActing(false);
    setSelected(new Set());
    toast({
      title: 'Qualification updated',
      description: `Marked ${childIds.length} child(ren) as ${QUALIFICATION_STATUS_LABELS[status] || status}.`,
    });
    loadChildren();
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === children.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(children.map((c) => c.id)));
    }
  }

  function getCurrentStage(childId: string): string {
    const atts = attempts[childId];
    if (!atts || atts.length === 0) return 'Not started';
    const latest = atts[atts.length - 1];
    return `${latest.stage_level} — ${latest.status}`;
  }

  function getStatusBadge(childId: string) {
    const atts = attempts[childId];
    if (!atts || atts.length === 0) {
      return <Badge variant="outline" className="text-muted-foreground">Registered</Badge>;
    }
    const latest = atts[atts.length - 1];
    if (latest.qualification_status === 'qualified') {
      return <Badge className="bg-gold/15 text-gold-700 hover:bg-gold/20">Qualified</Badge>;
    }
    if (latest.qualification_status === 'disqualified') {
      return <Badge variant="destructive">Disqualified</Badge>;
    }
    if (latest.qualification_status === 'not_qualified') {
      return <Badge variant="outline" className="text-muted-foreground">Not qualified</Badge>;
    }
    if (latest.qualification_status === 'no_show') {
      return <Badge variant="outline" className="text-crest">No-show</Badge>;
    }
    if (latest.status === 'pending_grading') {
      return <Badge className="bg-navy/10 text-navy">Pending grading</Badge>;
    }
    if (latest.status === 'published') {
      return <Badge className="bg-green-100 text-green-700">Published</Badge>;
    }
    return <Badge variant="outline">In progress</Badge>;
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-48">
          <Input
            placeholder="Search by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {AGE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{AGE_CATEGORY_LABELS[c]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={() => setShowAddDialog(true)} className="bg-gold text-navy hover:bg-gold-600">
          <UserPlus className="mr-2 h-4 w-4" /> Add child
        </Button>
        <Button variant="outline" onClick={() => setShowImportDialog(true)} className="border-navy/20">
          <Upload className="mr-2 h-4 w-4" /> CSV import
        </Button>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <Card className="border-gold/30 bg-gold/5">
          <CardContent className="flex flex-wrap items-center gap-3 pt-4">
            <span className="text-sm font-medium text-navy">{selected.size} selected</span>
            <Select value={bulkStatus} onValueChange={setBulkStatus}>
              <SelectTrigger className="w-40 h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="qualified">Qualified</SelectItem>
                <SelectItem value="not_qualified">Not qualified</SelectItem>
                <SelectItem value="disqualified">Disqualified</SelectItem>
                <SelectItem value="no_show">No-show</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" onClick={() => markQualification(Array.from(selected), bulkStatus)} disabled={acting}>
              {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setSelected(new Set())}>Clear</Button>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card className="border-navy/10 bg-cream-light">
        <CardContent className="pt-6">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : children.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">No children registered yet.</p>
              <p className="mt-1 text-sm text-muted-foreground/60">Add a child individually or import via CSV to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox checked={selected.size === children.length && children.length > 0} onCheckedChange={toggleSelectAll} />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Parent</TableHead>
                  <TableHead>Current stage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {children.map((child) => (
                  <TableRow key={child.id}>
                    <TableCell>
                      <Checkbox
                        checked={selected.has(child.id)}
                        onCheckedChange={() => toggleSelect(child.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{child.full_name}</TableCell>
                    <TableCell>{AGE_CATEGORY_LABELS[child.age_category as AgeCategory] || child.age_category}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{child.parent_name}</TableCell>
                    <TableCell className="text-sm">{getCurrentStage(child.id)}</TableCell>
                    <TableCell>{getStatusBadge(child.id)}</TableCell>
                    <TableCell className="text-right text-sm">
                      {attempts[child.id]?.[0]?.percentage?.toFixed(1) ?? '—'}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add child dialog */}
      <AddChildDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        coordinator={coordinator}
        onAdded={loadChildren}
      />

      {/* CSV import dialog */}
      <CSVImportDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        coordinator={coordinator}
        onImported={loadChildren}
      />
    </div>
  );
}

function buildFilter(coordinator: CoordinatorData): { column: string; value: string } {
  if (coordinator.level === 'parish') return { column: 'parish_id', value: coordinator.parish_id! };
  if (coordinator.level === 'area') return { column: 'area_id', value: coordinator.area_id! };
  if (coordinator.level === 'zone') return { column: 'zone_id', value: coordinator.zone_id! };
  if (coordinator.level === 'province') return { column: 'province_id', value: coordinator.province_id! };
  return { column: 'region_id', value: coordinator.region_id! };
}

function AddChildDialog({ open, onOpenChange, coordinator, onAdded }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  coordinator: CoordinatorData;
  onAdded: () => void;
}) {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [parentName, setParentName] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !dob || !parentName.trim() || !parentEmail.trim() || !consent) {
      setError('All fields are required and consent must be given.');
      return;
    }

    setLoading(true);
    // Fetch hierarchy from coordinator's level
    const hierarchy: Record<string, string | null> = {
      parish_id: coordinator.parish_id,
      area_id: coordinator.area_id,
      zone_id: coordinator.zone_id,
      province_id: coordinator.province_id,
      region_id: coordinator.region_id || 'a0000000-0000-0000-0000-000000000036',
    };

    // If coordinator is at a higher level, we need to resolve the parish
    // For parish coordinators, we have everything. For higher levels, we'd need
    // the cascading dropdown. For now, parish coordinators can add directly.
    if (coordinator.level !== 'parish') {
      setError('Please ask the parish coordinator to register this child, or use CSV import with a parish name.');
      setLoading(false);
      return;
    }

    const age = new Date().getFullYear() - new Date(dob).getFullYear();
    const category = age <= 5 ? '0-5' : age <= 8 ? '6-8' : age <= 12 ? '9-12' : age <= 15 ? '13-15' : '16-19';
    const regNum = `R36-${Date.now().toString().slice(-5)}`;

    const { error: insertError } = await supabase.from('children').insert({
      full_name: name.trim(),
      date_of_birth: dob,
      age_category: category,
      ...hierarchy,
      parent_name: parentName.trim(),
      parent_email: parentEmail.trim().toLowerCase(),
      parent_phone: parentPhone.trim() || null,
      consent_given: true,
      consent_at: new Date().toISOString(),
      registration_number: regNum,
    });

    setLoading(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    toast({ title: 'Child registered', description: `${name} has been added to your unit.` });
    setName(''); setDob(''); setParentName(''); setParentEmail(''); setParentPhone(''); setConsent(false);
    onOpenChange(false);
    onAdded();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl text-navy">Add a child</DialogTitle>
          <DialogDescription>Register a child in your unit.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-crest">{error}</p>}
          <div className="space-y-2">
            <Label>Child&apos;s full name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Date of birth</Label>
            <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} max={new Date().toISOString().split('T')[0]} required />
          </div>
          <div className="space-y-2">
            <Label>Parent / guardian name</Label>
            <Input value={parentName} onChange={(e) => setParentName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Parent email</Label>
            <Input type="email" value={parentEmail} onChange={(e) => setParentEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Parent phone (optional)</Label>
            <Input type="tel" value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} />
          </div>
          <div className="flex items-start gap-2">
            <Checkbox id="consent-add" checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-1" />
            <Label htmlFor="consent-add" className="text-sm cursor-pointer">
              I confirm parental consent has been obtained for this child&apos;s participation.
            </Label>
          </div>
          <Button type="submit" className="w-full bg-gold text-navy hover:bg-gold-600" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Register child'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CSVImportDialog({ open, onOpenChange, coordinator, onImported }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  coordinator: CoordinatorData;
  onImported: () => void;
}) {
  const { toast } = useToast();
  const [csvText, setCsvText] = useState('');
  const [results, setResults] = useState<{ valid: number; invalid: number; errors: string[] } | null>(null);
  const [loading, setLoading] = useState(false);

  function parseCSV(text: string) {
    const lines = text.trim().split('\n');
    if (lines.length < 2) {
      setResults({ valid: 0, invalid: 0, errors: ['CSV must have a header row and at least one data row.'] });
      return;
    }
    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const required = ['full_name', 'date_of_birth', 'parent_name', 'parent_email'];
    const missing = required.filter((r) => !headers.includes(r));
    if (missing.length > 0) {
      setResults({ valid: 0, invalid: 0, errors: [`Missing required columns: ${missing.join(', ')}. Expected: full_name, date_of_birth, parent_name, parent_email`] });
      return;
    }

    const validRows: Record<string, string>[] = [];
    const errors: string[] = [];
    let invalid = 0;

    for (let i = 1; i < lines.length; i++) {
      const cells = lines[i].split(',').map((c) => c.trim());
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => { row[h] = cells[idx] || ''; });

      if (!row.full_name) { errors.push(`Row ${i + 1}: Missing full name`); invalid++; continue; }
      if (!row.date_of_birth) { errors.push(`Row ${i + 1}: Missing date of birth`); invalid++; continue; }
      if (!row.parent_name) { errors.push(`Row ${i + 1}: Missing parent name`); invalid++; continue; }
      if (!row.parent_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.parent_email)) {
        errors.push(`Row ${i + 1}: Invalid or missing parent email`); invalid++; continue;
      }
      const age = new Date().getFullYear() - new Date(row.date_of_birth).getFullYear();
      if (isNaN(age) || age < 0 || age > 19) { errors.push(`Row ${i + 1}: Invalid date of birth (age must be 0-19)`); invalid++; continue; }
      validRows.push(row);
    }

    setResults({ valid: validRows.length, invalid, errors });
  }

  async function handleImport() {
    if (!results || results.valid === 0) return;
    setLoading(true);
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    let imported = 0;
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cells = lines[i].split(',').map((c) => c.trim());
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => { row[h] = cells[idx] || ''; });

      if (!row.full_name || !row.date_of_birth || !row.parent_name || !row.parent_email) continue;
      const age = new Date().getFullYear() - new Date(row.date_of_birth).getFullYear();
      if (isNaN(age) || age < 0 || age > 19) continue;
      const category = age <= 5 ? '0-5' : age <= 8 ? '6-8' : age <= 12 ? '9-12' : age <= 15 ? '13-15' : '16-19';
      const regNum = `R36-${Date.now().toString().slice(-5)}${i}`;

      const { error } = await supabase.from('children').insert({
        full_name: row.full_name,
        date_of_birth: row.date_of_birth,
        age_category: category,
        parish_id: coordinator.parish_id,
        area_id: coordinator.area_id,
        zone_id: coordinator.zone_id,
        province_id: coordinator.province_id,
        region_id: coordinator.region_id || 'a0000000-0000-0000-0000-000000000036',
        parent_name: row.parent_name,
        parent_email: row.parent_email.toLowerCase(),
        parent_phone: row.parent_phone || null,
        consent_given: true,
        consent_at: new Date().toISOString(),
        registration_number: regNum,
      });

      if (error) errors.push(`Row ${i + 1}: ${error.message}`);
      else imported++;
    }

    setLoading(false);
    toast({
      title: 'Import complete',
      description: `${imported} child(ren) imported.${errors.length > 0 ? ` ${errors.length} error(s).` : ''}`,
    });
    setCsvText('');
    setResults(null);
    onOpenChange(false);
    onImported();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl text-navy">CSV bulk import</DialogTitle>
          <DialogDescription>
            Upload a CSV with columns: full_name, date_of_birth, parent_name, parent_email, parent_phone (optional)
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Paste CSV content</Label>
            <textarea
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
              rows={6}
              value={csvText}
              onChange={(e) => { setCsvText(e.target.value); setResults(null); }}
              placeholder="full_name,date_of_birth,parent_name,parent_email,parent_phone&#10;John Doe,2015-05-10,Jane Doe,jane@example.com,+2348000000000"
            />
          </div>
          <Button variant="outline" onClick={() => parseCSV(csvText)} disabled={!csvText.trim()}>
            Validate rows
          </Button>
          {results && (
            <div className="rounded-lg border border-navy/10 bg-cream p-4 text-sm">
              <p className="font-medium text-navy">{results.valid} valid, {results.invalid} invalid</p>
              {results.errors.length > 0 && (
                <ul className="mt-2 space-y-1 text-xs text-crest">
                  {results.errors.slice(0, 10).map((err, i) => <li key={i}>{err}</li>)}
                </ul>
              )}
              {results.valid > 0 && (
                <Button onClick={handleImport} className="mt-3 w-full bg-gold text-navy hover:bg-gold-600" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : `Import ${results.valid} valid row(s)`}
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
