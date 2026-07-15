'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { REGION_ID } from '@/lib/constants';
import { Plus, Trash2, Edit, ChevronRight, Loader2, Building2 } from 'lucide-react';

type Level = 'province' | 'zone' | 'area' | 'parish';

export function AdminStructure() {
  const [provinces, setProvinces] = useState<{ id: string; name: string }[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [children, setChildren] = useState<Record<string, { id: string; name: string }[]>>({});
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [addLevel, setAddLevel] = useState<Level>('province');
  const [addParentId, setAddParentId] = useState<string>('');
  const [addName, setAddName] = useState('');
  const [adding, setAdding] = useState(false);

  const { toast } = useToast();

  const loadProvinces = useCallback(async () => {
    const { data } = await supabase.from('provinces').select('id, name').order('name');
    setProvinces(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadProvinces(); }, [loadProvinces]);

  async function loadChildren(level: Level, parentId: string) {
    let table = '';
    let col = '';
    if (level === 'zone') { table = 'zones'; col = 'province_id'; }
    else if (level === 'area') { table = 'areas'; col = 'zone_id'; }
    else if (level === 'parish') { table = 'parishes'; col = 'area_id'; }
    else return;

    const { data } = await supabase.from(table).select('id, name').eq(col, parentId).order('name');
    setChildren((prev) => ({ ...prev, [`${level}-${parentId}`]: data || [] }));
  }

  function toggleExpand(key: string, level: Level, parentId: string) {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
    if (!expanded[key]) loadChildren(level === 'province' ? 'zone' : level === 'zone' ? 'area' : 'parish', parentId);
  }

  async function handleAdd() {
    if (!addName.trim()) return;
    setAdding(true);

    const slug = addName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    let table = '';
    let data: Record<string, string> = { name: addName.trim(), slug };

    if (addLevel === 'province') {
      table = 'provinces';
      data.region_id = REGION_ID;
    } else if (addLevel === 'zone') {
      table = 'zones';
      data.province_id = addParentId;
    } else if (addLevel === 'area') {
      table = 'areas';
      data.zone_id = addParentId;
    } else if (addLevel === 'parish') {
      table = 'parishes';
      data.area_id = addParentId;
    }

    const { error } = await supabase.from(table).insert(data);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Added', description: `${addName} has been added.` });
      setShowAdd(false);
      setAddName('');
      loadProvinces();
    }
    setAdding(false);
  }

  async function handleDelete(level: Level, id: string, name: string) {
    if (!confirm(`Delete ${name}? This will also delete all units under it.`)) return;

    const table = level === 'province' ? 'provinces' : level === 'zone' ? 'zones' : level === 'area' ? 'areas' : 'parishes';
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Deleted', description: `${name} has been deleted.` });
      loadProvinces();
    }
  }

  if (loading) {
    return <div className="h-48 animate-pulse rounded-lg bg-muted" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-xl font-semibold text-navy">Church structure</h2>
          <p className="text-sm text-muted-foreground">Manage the hierarchy: Province → Zone → Area → Parish</p>
        </div>
        <Button onClick={() => { setAddLevel('province'); setAddParentId(''); setShowAdd(true); }} className="bg-gold text-navy hover:bg-gold-600">
          <Plus className="mr-2 h-4 w-4" /> Add province
        </Button>
      </div>

      <Card className="border-navy/10 bg-cream-light">
        <CardContent className="pt-6">
          {provinces.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">No provinces yet. Add one to get started.</p>
          ) : (
            <div className="space-y-2">
              {provinces.map((province) => {
                const provKey = `province-${province.id}`;
                return (
                  <div key={province.id} className="rounded-lg border border-navy/10 bg-cream">
                    <div className="flex items-center justify-between p-3">
                      <button
                        onClick={() => toggleExpand(provKey, 'province', province.id)}
                        className="flex items-center gap-2 font-medium text-navy"
                      >
                        <ChevronRight className={`h-4 w-4 transition-transform ${expanded[provKey] ? 'rotate-90' : ''}`} />
                        <Building2 className="h-4 w-4 text-gold" />
                        {province.name}
                      </button>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => { setAddLevel('zone'); setAddParentId(province.id); setShowAdd(true); }}>
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete('province', province.id, province.name)} className="text-crest">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    {expanded[provKey] && (
                      <div className="ml-6 border-l border-navy/10 pl-3">
                        {(children[`zone-${province.id}`] || []).map((zone) => {
                          const zoneKey = `zone-${zone.id}`;
                          return (
                            <div key={zone.id} className="border-b border-navy/5 last:border-0">
                              <div className="flex items-center justify-between py-2">
                                <button onClick={() => toggleExpand(zoneKey, 'zone', zone.id)} className="flex items-center gap-2 text-sm font-medium text-navy">
                                  <ChevronRight className={`h-3 w-3 transition-transform ${expanded[zoneKey] ? 'rotate-90' : ''}`} />
                                  {zone.name}
                                </button>
                                <div className="flex gap-1">
                                  <Button size="sm" variant="ghost" onClick={() => { setAddLevel('area'); setAddParentId(zone.id); setShowAdd(true); }}>
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => handleDelete('zone', zone.id, zone.name)} className="text-crest">
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>

                              {expanded[zoneKey] && (
                                <div className="ml-4 border-l border-navy/10 pl-3">
                                  {(children[`area-${zone.id}`] || []).map((area) => {
                                    const areaKey = `area-${area.id}`;
                                    return (
                                      <div key={area.id} className="border-b border-navy/5 last:border-0">
                                        <div className="flex items-center justify-between py-2">
                                          <button onClick={() => toggleExpand(areaKey, 'area', area.id)} className="flex items-center gap-2 text-sm text-navy">
                                            <ChevronRight className={`h-3 w-3 transition-transform ${expanded[areaKey] ? 'rotate-90' : ''}`} />
                                            {area.name}
                                          </button>
                                          <div className="flex gap-1">
                                            <Button size="sm" variant="ghost" onClick={() => { setAddLevel('parish'); setAddParentId(area.id); setShowAdd(true); }}>
                                              <Plus className="h-3 w-3" />
                                            </Button>
                                            <Button size="sm" variant="ghost" onClick={() => handleDelete('area', area.id, area.name)} className="text-crest">
                                              <Trash2 className="h-3 w-3" />
                                            </Button>
                                          </div>
                                        </div>

                                        {expanded[areaKey] && (
                                          <div className="ml-4 border-l border-navy/10 pl-3">
                                            {(children[`parish-${area.id}`] || []).map((parish) => (
                                              <div key={parish.id} className="flex items-center justify-between py-2">
                                                <span className="text-sm text-muted-foreground">{parish.name}</span>
                                                <Button size="sm" variant="ghost" onClick={() => handleDelete('parish', parish.id, parish.name)} className="text-crest">
                                                  <Trash2 className="h-3 w-3" />
                                                </Button>
                                              </div>
                                            ))}
                                            {(children[`parish-${area.id}`] || []).length === 0 && (
                                              <p className="py-2 text-xs text-muted-foreground">No parishes under this area.</p>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                  {(children[`area-${zone.id}`] || []).length === 0 && (
                                    <p className="py-2 text-xs text-muted-foreground">No areas under this zone.</p>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {(children[`zone-${province.id}`] || []).length === 0 && (
                          <p className="py-2 text-xs text-muted-foreground">No zones under this province.</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-navy">Add {addLevel}</DialogTitle>
            <DialogDescription>Create a new unit in the church hierarchy.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={addName} onChange={(e) => setAddName(e.target.value)} placeholder={`e.g. ${addLevel === 'province' ? 'Province 95' : addLevel === 'zone' ? 'Zone C' : addLevel === 'area' ? 'Area 5' : 'RCCG New Parish'}`} />
            </div>
            <Button onClick={handleAdd} className="w-full bg-gold text-navy hover:bg-gold-600" disabled={adding || !addName.trim()}>
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : `Add ${addLevel}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
