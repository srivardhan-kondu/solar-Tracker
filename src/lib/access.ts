import { UserRole } from '@/types';

export type TabId =
  | 'dashboard'
  | 'survey'
  | 'field_portal'
  | 'installations'
  | 'master_upload'
  | 'assignments'
  | 'village_access'
  | 'inventory'
  | 'dcr_module'
  | 'exceptions'
  | 'reports'
  | 'service_desk'
  | 'user_management'
  | 'audit_log';

const ALL_TABS: TabId[] = [
  'dashboard',
  'survey',
  'field_portal',
  'installations',
  'master_upload',
  'assignments',
  'village_access',
  'inventory',
  'dcr_module',
  'exceptions',
  'reports',
  'service_desk',
  'user_management',
  'audit_log',
];

/** Which screens each role sees. Field staff get a short, focused menu. */
export const TABS_FOR_ROLE: Record<UserRole, TabId[]> = {
  'Super Admin': ALL_TABS,
  Admin: ALL_TABS.filter((t) => t !== 'user_management'),
  // Survey comes first: a home is installed only after the survey says it is feasible
  Installer: ['survey', 'field_portal', 'installations'],
  'Service Engineer': ['service_desk', 'installations'],
};

export const HOME_TAB_FOR_ROLE: Record<UserRole, TabId> = {
  'Super Admin': 'dashboard',
  Admin: 'dashboard',
  Installer: 'survey',
  'Service Engineer': 'service_desk',
};

export const canSeeTab = (role: UserRole, tab: string) => (TABS_FOR_ROLE[role] as string[]).includes(tab);

export const isOfficeRole = (role: UserRole) => role === 'Admin' || role === 'Super Admin';

/** Plain words for each role, shown to people using the app */
export const ROLE_LABEL: Record<UserRole, string> = {
  'Super Admin': 'Head office',
  Admin: 'Office staff',
  Installer: 'Installer',
  'Service Engineer': 'Service engineer',
};
