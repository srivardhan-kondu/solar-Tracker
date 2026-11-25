import { User, UserRole } from '@/types';
import { normalizeMobile } from '@/lib/mobile';

/**
 * Onboarding a new employee: the details the office enters, and the checks on them.
 * Shared by the form (phone/browser) and the server, so both apply the same rules.
 */

export interface NewPerson {
  name: string;
  username: string;
  pin: string;
  mobile: string;
  role: UserRole;
  division: string;
  address: string;
  joiningDate: string;
  employeeId: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
}

export const ROLES: UserRole[] = ['Installer', 'Service Engineer', 'Admin', 'Super Admin'];

/** Who may onboard whom: head office anyone; office staff only field staff */
export const rolesYouCanAdd = (me: UserRole): UserRole[] =>
  me === 'Super Admin' ? ROLES : me === 'Admin' ? ['Installer', 'Service Engineer'] : [];

export const cleanUsername = (u: string) => u.trim().toLowerCase();

/** Returns the problems with each field (empty when all is well) and the cleaned-up details */
export const checkNewPerson = (p: NewPerson, existingUsernames: string[]) => {
  const problems: Partial<Record<keyof NewPerson, string>> = {};
  const username = cleanUsername(p.username);
  const mobile = normalizeMobile(p.mobile);
  const emergencyPhone = p.emergencyContactPhone.trim() ? normalizeMobile(p.emergencyContactPhone) : '';

  if (p.name.trim().length < 2) problems.name = 'Enter the full name.';
  if (!/^[a-z0-9._-]{3,30}$/.test(username)) problems.username = 'Username: 3 to 30 small letters or numbers (dots, dashes allowed), no spaces.';
  else if (existingUsernames.map(cleanUsername).includes(username)) problems.username = 'This username is already taken.';
  if (!/^\d{4,8}$/.test(p.pin)) problems.pin = 'PIN must be 4 to 8 digits.';
  else if (/^(\d)\1+$/.test(p.pin) || '0123456789'.includes(p.pin) || '9876543210'.includes(p.pin)) problems.pin = 'This PIN is too easy to guess. Avoid 1111 or 1234.';
  if (!mobile) problems.mobile = 'Enter a valid 10-digit mobile number.';
  if (!ROLES.includes(p.role)) problems.role = 'Choose the kind of work.';
  if (p.address.trim().length < 5) problems.address = 'Enter the address.';
  if (p.joiningDate && !/^\d{4}-\d{2}-\d{2}$/.test(p.joiningDate)) problems.joiningDate = 'Choose the joining date.';
  if (emergencyPhone === null) problems.emergencyContactPhone = 'Enter a valid 10-digit mobile number, or leave it empty.';

  const clean: Omit<User, 'id' | 'status' | 'lastLogin'> = {
    name: p.name.trim(),
    username,
    mobile: mobile ?? '',
    role: p.role,
    division: p.division.trim(),
    district: '',
    address: p.address.trim(),
    joiningDate: p.joiningDate || undefined,
    employeeId: p.employeeId.trim() || undefined,
    emergencyContactName: p.emergencyContactName.trim() || undefined,
    emergencyContactPhone: emergencyPhone || undefined,
  };
  return { problems, clean };
};
