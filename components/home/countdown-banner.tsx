'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-client';

export function CountdownBanner() {
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [nextStage, setNextStage] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: seasons } = await supabase
        .from('seasons')
        .select('id, name')
        .eq('is_current', true)
        .maybeSingle();

      if (!seasons) {
        setLoading(false);
        return;
      }

      const { data: stages } = await supabase
        .from('stage_configs')
        .select('level, is_open, opens_at')
        .eq('season_id', seasons.id)
        .order('opens_at', { ascending: true, nullsFirst: false });

      if (stages && stages.length > 0) {
        const nextClosed = stages.find((s) => !s.is_open && s.opens_at);
        if (nextClosed) {
          const diff = Math.ceil(
            (new Date(nextClosed.opens_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          );
          setDaysLeft(Math.max(0, diff));
          setNextStage(capitalize(nextClosed.level));
        } else {
          setDaysLeft(0);
          setNextStage('All stages open');
        }
      }
      setLoading(false);
    }
    load();
  }, []);

  function capitalize(s: string) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  if (loading) {
    return (
      <div className="bg-gold/10 border-y border-gold/20 py-3">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="h-6 w-96 animate-pulse rounded bg-gold/20" />
        </div>
      </div>
    );
  }

  if (daysLeft === null) return null;

  return (
    <div className="border-y border-gold/30 bg-gold/10 py-3">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 text-center sm:px-6 lg:px-8">
        <span className="text-sm font-medium text-navy">
          {daysLeft > 0 ? (
            <>
              <span className="font-serif text-lg font-bold text-gold-600">{daysLeft}</span>
              <span> days until the {nextStage} stage opens</span>
            </>
          ) : (
            <span className="font-medium text-navy">{nextStage} — the competition is live now</span>
          )}
        </span>
      </div>
    </div>
  );
}
