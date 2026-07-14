import { cn } from '@/lib/utils';

export interface StageInfo {
  number: number;
  name: string;
  subtitle: string;
  description: string;
}

export const STAGES: StageInfo[] = [
  { number: 1, name: 'Parish', subtitle: 'Local level', description: 'Children compete within their parish. Parish teachers set and grade questions.' },
  { number: 2, name: 'Area', subtitle: 'Area level', description: 'Qualifiers from parishes under an area compete. Area teachers manage this stage.' },
  { number: 3, name: 'Zonal', subtitle: 'Zone level', description: 'Qualifiers from areas under a zone compete. Zone teachers manage this stage.' },
  { number: 4, name: 'Provincial', subtitle: 'Province level', description: 'Qualifiers from zones under a province compete. Province teachers manage this stage.' },
  { number: 5, name: 'Regional', subtitle: 'Final level', description: 'The grand finale. Qualifiers from all provinces compete at the regional level.' },
];

interface StageJourneyProps {
  currentStage?: number;
  variant?: 'vertical' | 'horizontal';
  className?: string;
}

export function StageJourney({ currentStage, variant = 'vertical', className }: StageJourneyProps) {
  if (variant === 'horizontal') {
    return (
      <div className={cn('flex items-start justify-between gap-2', className)}>
        {STAGES.map((stage, idx) => (
          <div key={stage.number} className="flex flex-1 flex-col items-center">
            <div className="flex w-full items-center">
              {idx > 0 && <div className="h-0.5 flex-1 bg-gold/40" />}
              <div
                className={cn(
                  'wax-seal h-14 w-14 shrink-0 text-lg',
                  currentStage && stage.number < currentStage && 'opacity-40',
                  currentStage && stage.number === currentStage && 'wax-seal-navy ring-4 ring-gold/30'
                )}
              >
                {stage.number}
              </div>
              {idx < STAGES.length - 1 && <div className="h-0.5 flex-1 bg-gold/40" />}
            </div>
            <div className="mt-3 text-center">
              <p className="font-serif text-sm font-semibold text-navy">{stage.name}</p>
              <p className="text-xs text-muted-foreground">{stage.subtitle}</p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col items-center', className)}>
      {STAGES.map((stage, idx) => (
        <div key={stage.number} className="flex w-full max-w-md flex-row items-start gap-4">
          {/* Badge + connecting line */}
          <div className="flex flex-col items-center">
            <div
              className={cn(
                'wax-seal h-14 w-14 shrink-0 text-lg',
                currentStage && stage.number < currentStage && 'opacity-40',
                currentStage && stage.number === currentStage && 'wax-seal-navy ring-4 ring-gold/30'
              )}
            >
              {stage.number}
            </div>
            {idx < STAGES.length - 1 && (
              <div className={cn('w-0.5 grow', stage.number < (currentStage ?? 99) ? 'bg-gold' : 'bg-gold/30')} style={{ minHeight: '3rem' }} />
            )}
          </div>

          {/* Text */}
          <div className={cn('pb-8', idx === STAGES.length - 1 && 'pb-0')}>
            <p className="font-serif text-lg font-semibold text-navy">{stage.name}</p>
            <p className="text-xs font-medium uppercase tracking-wide text-gold-600">{stage.subtitle}</p>
            <p className="mt-1 text-sm text-muted-foreground">{stage.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
