import { User, Village } from '@/types';

/**
 * Who may work where. The office approves villages for each installer;
 * an installer can work only inside the villages approved for them.
 * Office staff and service engineers are not limited.
 */

/** Only installers are held to their villages */
export const isLimitedToVillages = (u: Pick<User, 'role'>) => u.role === 'Installer';

/** The villages this person is allowed, in name order */
export const villagesOf = (u: Pick<User, 'villageIds'>, villages: Village[]) =>
  villages.filter((v) => u.villageIds?.includes(v.id)).sort((a, b) => a.name.localeCompare(b.name));

/** Village name with its mandal, e.g. "Kollipara (Tenali mandal)" */
export const villageLabel = (v: Pick<Village, 'name' | 'mandal'>) => (v.mandal ? `${v.name} (${v.mandal} mandal)` : v.name);
