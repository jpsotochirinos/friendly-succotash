/** Persisted in localStorage + sent as Organization.onboardingState (partial fields). */
export const ONBOARDING_DRAFT_KEY = 'alega:onboarding:draft';

export const ONBOARDING_DRAFT_VERSION = 1 as const;

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
}

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
  };
}

export function loadOnboardingDraft(): OnboardingDraft {
  try {
    const raw = localStorage.getItem(ONBOARDING_DRAFT_KEY);
    if (!raw) return defaultOnboardingDraft();
    const parsed = JSON.parse(raw) as Partial<OnboardingDraft>;
    if (parsed.version !== ONBOARDING_DRAFT_VERSION) return defaultOnboardingDraft();
    return { ...defaultOnboardingDraft(), ...parsed, invites: parsed.invites?.length ? parsed.invites : [{ email: '', role: '' }] };
  } catch {
    return defaultOnboardingDraft();
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
