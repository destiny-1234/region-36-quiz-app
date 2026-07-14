'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase-client';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface LocationSelection {
  provinceId: string | null;
  zoneId: string | null;
  areaId: string | null;
  parishId: string | null;
}

interface CascadingLocationProps {
  value: LocationSelection;
  onChange: (value: LocationSelection) => void;
  stopAt?: 'province' | 'zone' | 'area' | 'parish';
  errors?: Record<string, string>;
}

interface NamedItem {
  id: string;
  name: string;
}

export function CascadingLocationDropdown({
  value,
  onChange,
  stopAt = 'parish',
  errors = {},
}: CascadingLocationProps) {
  const [provinces, setProvinces] = useState<NamedItem[]>([]);
  const [zones, setZones] = useState<NamedItem[]>([]);
  const [areas, setAreas] = useState<NamedItem[]>([]);
  const [parishes, setParishes] = useState<NamedItem[]>([]);
  const [loadingProvinces, setLoadingProvinces] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('provinces')
        .select('id, name')
        .order('name');
      setProvinces(data as NamedItem[] || []);
      setLoadingProvinces(false);
    })();
  }, []);

  const loadZones = useCallback(async (provinceId: string) => {
    const { data } = await supabase
      .from('zones')
      .select('id, name')
      .eq('province_id', provinceId)
      .order('name');
    setZones(data as NamedItem[] || []);
    setAreas([]);
    setParishes([]);
  }, []);

  const loadAreas = useCallback(async (zoneId: string) => {
    const { data } = await supabase
      .from('areas')
      .select('id, name')
      .eq('zone_id', zoneId)
      .order('name');
    setAreas(data as NamedItem[] || []);
    setParishes([]);
  }, []);

  const loadParishes = useCallback(async (areaId: string) => {
    const { data } = await supabase
      .from('parishes')
      .select('id, name')
      .eq('area_id', areaId)
      .order('name');
    setParishes(data as NamedItem[] || []);
  }, []);

  // Load dependent data when selection changes
  useEffect(() => {
    if (value.provinceId) loadZones(value.provinceId);
  }, [value.provinceId, loadZones]);

  useEffect(() => {
    if (value.zoneId) loadAreas(value.zoneId);
  }, [value.zoneId, loadAreas]);

  useEffect(() => {
    if (value.areaId) loadParishes(value.areaId);
  }, [value.areaId, loadParishes]);

  return (
    <div className="space-y-4">
      {/* Province */}
      <div className="space-y-2">
        <Label htmlFor="province">Province <span className="text-crest">*</span></Label>
        <Select
          value={value.provinceId ?? ''}
          onValueChange={(v) => onChange({ ...value, provinceId: v, zoneId: null, areaId: null, parishId: null })}
          disabled={loadingProvinces}
        >
          <SelectTrigger id="province" className={errors.province ? 'border-crest' : ''}>
            <SelectValue placeholder={loadingProvinces ? 'Loading provinces...' : 'Select province'} />
          </SelectTrigger>
          <SelectContent>
            {provinces.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.province && <p className="text-xs text-crest">{errors.province}</p>}
      </div>

      {/* Zone */}
      {stopAt !== 'province' && (
        <div className="space-y-2">
          <Label htmlFor="zone">Zone <span className="text-crest">*</span></Label>
          <Select
            value={value.zoneId ?? ''}
            onValueChange={(v) => onChange({ ...value, zoneId: v, areaId: null, parishId: null })}
            disabled={!value.provinceId}
          >
            <SelectTrigger id="zone" className={errors.zone ? 'border-crest' : ''}>
              <SelectValue placeholder={!value.provinceId ? 'Select province first' : 'Select zone'} />
            </SelectTrigger>
            <SelectContent>
              {zones.map((z) => (
                <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.zone && <p className="text-xs text-crest">{errors.zone}</p>}
        </div>
      )}

      {/* Area */}
      {stopAt !== 'province' && stopAt !== 'zone' && (
        <div className="space-y-2">
          <Label htmlFor="area">Area <span className="text-crest">*</span></Label>
          <Select
            value={value.areaId ?? ''}
            onValueChange={(v) => onChange({ ...value, areaId: v, parishId: null })}
            disabled={!value.zoneId}
          >
            <SelectTrigger id="area" className={errors.area ? 'border-crest' : ''}>
              <SelectValue placeholder={!value.zoneId ? 'Select zone first' : 'Select area'} />
            </SelectTrigger>
            <SelectContent>
              {areas.map((a) => (
                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.area && <p className="text-xs text-crest">{errors.area}</p>}
        </div>
      )}

      {/* Parish */}
      {stopAt === 'parish' && (
        <div className="space-y-2">
          <Label htmlFor="parish">Parish <span className="text-crest">*</span></Label>
          <Select
            value={value.parishId ?? ''}
            onValueChange={(v) => onChange({ ...value, parishId: v })}
            disabled={!value.areaId}
          >
            <SelectTrigger id="parish" className={errors.parish ? 'border-crest' : ''}>
              <SelectValue placeholder={!value.areaId ? 'Select area first' : 'Select parish'} />
            </SelectTrigger>
            <SelectContent>
              {parishes.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.parish && <p className="text-xs text-crest">{errors.parish}</p>}
        </div>
      )}
    </div>
  );
}
