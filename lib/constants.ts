export type AgeCategory = '0-5' | '6-8' | '9-12' | '13-15' | '16-19';

export type StageLevel = 'parish' | 'area' | 'zonal' | 'provincial' | 'regional';

export type CoordinatorLevel = 'parish' | 'area' | 'zone' | 'province' | 'region';

export type QuestionType = 'multiple_choice' | 'true_false' | 'fill_blank';

export type AttemptStatus = 'in_progress' | 'submitted' | 'pending_grading' | 'graded' | 'published';

export const AGE_CATEGORIES: AgeCategory[] = ['0-5', '6-8', '9-12', '13-15', '16-19'];

export const AGE_CATEGORY_LABELS: Record<AgeCategory, string> = {
  '0-5': '0–5 years',
  '6-8': '6–8 years',
  '9-12': '9–12 years',
  '13-15': '13–15 years',
  '16-19': '16–19 years',
};

export const STAGE_LEVELS: StageLevel[] = ['parish', 'area', 'zonal', 'provincial', 'regional'];

export const STAGE_LABELS: Record<StageLevel, string> = {
  parish: 'Parish',
  area: 'Area',
  zonal: 'Zonal',
  provincial: 'Provincial',
  regional: 'Regional',
};

export const STAGE_ORDER: Record<StageLevel, number> = {
  parish: 1,
  area: 2,
  zonal: 3,
  provincial: 4,
  regional: 5,
};

export const COORDINATOR_LEVELS: CoordinatorLevel[] = ['parish', 'area', 'zone', 'province', 'region'];

export const COORDINATOR_LEVEL_LABELS: Record<CoordinatorLevel, string> = {
  parish: 'Parish',
  area: 'Area',
  zone: 'Zone',
  province: 'Province',
  region: 'Region',
};

export const ATTEMPT_STATUS_LABELS: Record<AttemptStatus, string> = {
  in_progress: 'In progress',
  submitted: 'Submitted',
  pending_grading: 'Pending grading',
  graded: 'Graded',
  published: 'Published',
};

export const QUALIFICATION_STATUSES = [
  'qualified',
  'not_qualified',
  'disqualified',
  'no_show',
] as const;

export type QualificationStatus = typeof QUALIFICATION_STATUSES[number];

export const QUALIFICATION_STATUS_LABELS: Record<string, string> = {
  qualified: 'Qualified',
  not_qualified: 'Not qualified',
  disqualified: 'Disqualified',
  no_show: 'No-show',
  pending: 'Pending',
};

export function computeAge(dob: string | Date): number {
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

export function computeAgeCategory(dob: string | Date): AgeCategory {
  const age = computeAge(dob);
  if (age <= 5) return '0-5';
  if (age <= 8) return '6-8';
  if (age <= 12) return '9-12';
  if (age <= 15) return '13-15';
  return '16-19';
}
