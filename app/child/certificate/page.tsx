'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';
import { RoleGuard } from '@/components/shared/role-guard';
import { Button } from '@/components/ui/button';
import { Loader2, Download, Printer } from 'lucide-react';
import { Region36Logo } from '@/components/layout/region-36-logo';
import { STAGE_LABELS, StageLevel, AGE_CATEGORY_LABELS, AgeCategory } from '@/lib/constants';

export default function CertificatePage() {
  return (
    <RoleGuard allowedRoles={['child', 'parent']}>
      <CertificateContent />
    </RoleGuard>
  );
}

function CertificateContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const attemptId = searchParams.get('attempt');
  const [data, setData] = useState<{
    childName: string;
    stage: string;
    ageCategory: string;
    seasonName: string;
    percentage: number;
    qualified: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const certificateRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      if (!attemptId) {
        setError('No attempt specified.');
        setLoading(false);
        return;
      }

      const { data: attempt } = await supabase
        .from('attempts')
        .select(`
          id, stage_level, age_category, percentage, qualification_status, status,
          children (full_name),
          seasons (name)
        `)
        .eq('id', attemptId)
        .maybeSingle();

      if (!attempt) {
        setError('Certificate not found.');
        setLoading(false);
        return;
      }

      if (attempt.status !== 'published') {
        setError('Results have not been published yet. Please wait for your coordinator to publish results.');
        setLoading(false);
        return;
      }

      const a = attempt as Record<string, unknown>;
      const child = a.children as { full_name: string };
      const season = a.seasons as { name: string };

      setData({
        childName: child.full_name,
        stage: a.stage_level as string,
        ageCategory: a.age_category as string,
        seasonName: season.name,
        percentage: a.percentage as number,
        qualified: a.qualification_status === 'qualified',
      });
      setLoading(false);
    })();
  }, [attemptId]);

  function handlePrint() {
    window.print();
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 text-center">
        <p className="text-muted-foreground">{error || 'Could not load certificate.'}</p>
        <Button onClick={() => router.back()} className="mt-4 bg-gold text-navy hover:bg-gold-600">Go back</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="no-print mb-6 flex justify-end gap-3">
        <Button onClick={handlePrint} className="bg-gold text-navy hover:bg-gold-600">
          <Printer className="mr-2 h-4 w-4" /> Print certificate
        </Button>
        <Button variant="outline" onClick={handlePrint} className="border-navy/20">
          <Download className="mr-2 h-4 w-4" /> Save as PDF
        </Button>
      </div>

      {/* Certificate */}
      <div
        ref={certificateRef}
        className="relative mx-auto aspect-[1/0.7] max-w-4xl rounded-lg border-4 border-gold bg-cream-light p-8 print:border-[3px]"
        style={{ borderColor: '#C9A227' }}
      >
        {/* Decorative border */}
        <div className="absolute inset-2 rounded-md border border-navy/20" />

        <div className="relative flex h-full flex-col items-center text-center">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Region36Logo size={56} />
            <div>
              <h1 className="font-serif text-2xl font-bold text-navy">RCCG Region 36</h1>
              <p className="text-sm text-gold">Children&apos;s Ministry Quiz Challenge</p>
            </div>
          </div>

          {/* Title */}
          <div className="mt-8">
            <p className="font-serif text-lg text-muted-foreground">Certificate of</p>
            <h2 className="font-serif text-4xl font-bold text-navy">
              {data.qualified ? 'Qualification' : 'Participation'}
            </h2>
          </div>

          {/* Body */}
          <div className="mt-8 max-w-lg">
            <p className="text-ink">This is to certify that</p>
            <p className="mt-3 font-serif text-3xl font-bold text-navy border-b-2 border-gold/30 pb-2">
              {data.childName}
            </p>
            <p className="mt-4 text-ink">
              has {data.qualified ? 'qualified at' : 'participated in'} the{' '}
              <span className="font-semibold text-navy">{STAGE_LABELS[data.stage as StageLevel]}</span> stage
              {' '}of the {data.seasonName}
              {' '}in the <span className="font-semibold text-navy">{AGE_CATEGORY_LABELS[data.ageCategory as AgeCategory]}</span> category
              {data.qualified ? '' : ' with a score of'}
              {data.qualified ? '.' : ` ${data.percentage.toFixed(1)}%.`}
            </p>
          </div>

          {/* Seal */}
          <div className="mt-8">
            <div className="wax-seal-navy h-20 w-20 font-serif text-sm">
              <div className="text-center">
                <p className="text-gold">R36</p>
                <p className="text-[8px] text-gold/80">{data.qualified ? 'QUALIFIED' : 'PARTICIPANT'}</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-auto flex w-full justify-between items-end pt-8">
            <div className="text-left">
              <div className="border-t border-navy/30 pt-1">
                <p className="font-serif text-sm text-navy">Date</p>
                <p className="text-xs text-muted-foreground">{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
            </div>
            <div className="text-center">
              <p className="font-serif text-xs text-muted-foreground">Score</p>
              <p className="font-serif text-lg font-bold text-gold-600">{data.percentage.toFixed(1)}%</p>
            </div>
            <div className="text-right">
              <div className="border-t border-navy/30 pt-1">
                <p className="font-serif text-sm text-navy">Regional Coordinator</p>
                <p className="text-xs text-muted-foreground">RCCG Region 36</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
