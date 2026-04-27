/** Persisted in localStorage + sent as Organization.onboardingState (partial fields). */
export const ONBOARDING_DRAFT_KEY = 'alega:onboarding:draft';

export const ONBOARDING_DRAFT_VERSION = 2 as const;

export interface OnboardingInviteRow {
  email: string;
  role: string;
}

export interface OnboardingDraft {
  version: typeof ONBOARDING_DRAFT_VERSION;
  name: string;
  description: string;
  firmType: string;
  firmSize: string;
  country: string;
  timezone: string;
  language: string;
  practiceAreas: string[];
  practiceAreasOther: string;
  role: string;
  currentTool: string;
  goals: string[];
  useCases: string[];
  volume: string;
  interestsFreeform: string;
  referralSource: string;
  invites: OnboardingInviteRow[];
  /** Main outcome the user wants from Alega (card selection). */
  primaryIntent: string;
  /** Optional friction points (preset toggles). */
  painPoints: string[];
  /** Optional first-setup priority. */
  setupPriority: string;
}

/** Suggested goals/use cases when user picks a primary intent (only applied when arrays were empty). */
export const PRIMARY_INTENT_SUGGESTIONS: Record<
  string,
  { goals: string[]; useCases: string[] }
> = {
  matters: { goals: ['organizeMatters'], useCases: ['matters'] },
  deadlines: { goals: ['deadlines'], useCases: ['tasks'] },
  documents: { goals: ['compliance'], useCases: ['documents'] },
  team: { goals: ['collaborate'], useCases: ['matters', 'clients'] },
  signatures: { goals: ['compliance'], useCases: ['documents'] },
  reporting: { goals: ['reporting'], useCases: ['matters'] },
};

export function defaultOnboardingDraft(): OnboardingDraft {
  return {
    version: ONBOARDING_DRAFT_VERSION,
    name: '',
    description: '',
    firmType: '',
    firmSize: '',
    country: '',
    timezone: 'America/Lima',
    language: 'Español',
    practiceAreas: [],
    practiceAreasOther: '',
    role: '',
    currentTool: '',
    goals: [],
    useCases: [],
    volume: '',
    interestsFreeform: '',
    referralSource: '',
    invites: [{ email: '', role: '' }],
    primaryIntent: '',
    painPoints: [],
    setupPriority: '',
  };
}

export function loadOnboardingDraft(): OnboardingDraft {
  const base = defaultOnboardingDraft();
  try {
    const raw = localStorage.getItem(ONBOARDING_DRAFT_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<OnboardingDraft> & { version?: number };
    const prevVersion = parsed.version ?? 1;
    if (prevVersion > ONBOARDING_DRAFT_VERSION) return base;

    return {
      ...base,
      ...parsed,
      version: ONBOARDING_DRAFT_VERSION,
      primaryIntent: typeof parsed.primaryIntent === 'string' ? parsed.primaryIntent : base.primaryIntent,
      painPoints: Array.isArray(parsed.painPoints) ? [...parsed.painPoints] : base.painPoints,
      setupPriority: typeof parsed.setupPriority === 'string' ? parsed.setupPriority : base.setupPriority,
      practiceAreas: Array.isArray(parsed.practiceAreas) ? [...parsed.practiceAreas] : base.practiceAreas,
      goals: Array.isArray(parsed.goals) ? [...parsed.goals] : base.goals,
      useCases: Array.isArray(parsed.useCases) ? [...parsed.useCases] : base.useCases,
      invites: parsed.invites?.length ? parsed.invites.map((i) => ({ ...i })) : base.invites,
    };
  } catch {
    return base;
  }
}

export function saveOnboardingDraft(d: OnboardingDraft) {
  try {
    localStorage.setItem(ONBOARDING_DRAFT_KEY, JSON.stringify(d));
  } catch {
    /* ignore quota */
  }
}

export function clearOnboardingDraft() {
  try {
    localStorage.removeItem(ONBOARDING_DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

export const FIRM_TYPE_KEYS = ['legal', 'accounting', 'notarial', 'consulting', 'mixed', 'other'] as const;
export const FIRM_SIZE_KEYS = ['solo', 's2_5', 's6_20', 's21_50', 's50plus'] as const;
export const PRACTICE_AREA_KEYS = [
  'civil',
  'criminal',
  'labor',
  'tax',
  'corporate',
  'family',
  'immigration',
  'admin',
  'other',
] as const;
export const GOAL_KEYS = [
  'organizeMatters',
  'deadlines',
  'collaborate',
  'compliance',
  'reporting',
  'billing',
] as const;
export const USE_CASE_KEYS = ['matters', 'clients', 'documents', 'tasks', 'hearings'] as const;
export const VOLUME_KEYS = ['lt10', 's10_50', 's50_200', 'gt200'] as const;
export const ROLE_KEYS = ['partner', 'associate', 'admin', 'paralegal', 'other'] as const;
export const REFERRAL_KEYS = ['google', 'referral', 'event', 'social', 'other'] as const;

export const PRIMARY_INTENT_KEYS = [
  'matters',
  'deadlines',
  'documents',
  'team',
  'signatures',
  'reporting',
] as const;

export const PAIN_POINT_KEYS = [
  'scattered_info',
  'missed_deadlines',
  'coordination',
  'reporting',
  'client_visibility',
  'workload',
] as const;

export const SETUP_PRIORITY_KEYS = [
  'matters_first',
  'deadlines_first',
  'docs_first',
  'team_first',
  'reporting_first',
] as const;

export type OnboardingStepPreviewKey = 'intent' | 'firm' | 'practice' | 'workflow' | 'team';

export const TIMEZONE_OPTIONS = [
  'America/Lima',
  'America/Bogota',
  'America/Mexico_City',
  'America/New_York',
  'America/Argentina/Buenos_Aires',
  'America/Santiago',
  'Europe/Madrid',
] as const;

export const COUNTRY_CODES = [
  'PE',
  'CO',
  'MX',
  'ES',
  'AR',
  'CL',
  'US',
  'EC',
  'BO',
  'UY',
  'PY',
  'CR',
  'PA',
  'DO',
  'GT',
  'HN',
  'NI',
  'SV',
  'OTHER',
] as const;
