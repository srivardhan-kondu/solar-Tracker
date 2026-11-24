import { UserRole } from '@/types';

export type TabId =
  | 'dashboard'
  | 'field_portal'
  | 'installations'
  | 'master_upload'
  | 'assignments'
  | 'inventory'
  | 'dcr_module'
  | 'exceptions'
  | 'reports'
  | 'service_desk'
  | 'user_management'
  | 'audit_log';

const ALL_TABS: TabId[] = [
  'dashboard',
  'field_portal',
  'installations',
  'master_upload',
  'assignments',
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
  Installer: ['field_portal', 'installations'],
  'Service Engineer': ['service_desk', 'installations'],
};

export const HOME_TAB_FOR_ROLE: Record<UserRole, TabId> = {
  'Super Admin': 'dashboard',
  Admin: 'dashboard',
  Installer: 'field_portal',
  'Service Engineer': 'service_desk',
};

export const canSeeTab = (role: UserRole, tab: string) => (TABS_FOR_ROLE[role] as string[]).includes(tab);

export const isOfficeRole = (role: UserRole) => role === 'Admin' || role === 'Super Admin';
