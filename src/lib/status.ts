import { InstallationStatus } from '@/types';

/** Plain-language groups of the 9 technical installation statuses. */
export const STATUS_GROUPS = {
  not_started: { label: 'Not started', statuses: ['Assigned', 'Downloaded'] },
  working: { label: 'Being worked on', statuses: ['In Progress', 'Saved Locally', 'Waiting to Sync', 'Sync Failed'] },
  office_check: { label: 'Waiting for office check', statuses: ['Received by Server', 'Needs Review'] },
  done: { label: 'Done', statuses: ['Completed'] },
  not_done: {
    label: 'Not finished yet',
    statuses: ['Assigned', 'Downloaded', 'In Progress', 'Saved Locally', 'Waiting to Sync', 'Sync Failed'],
  },
} satisfies Record<string, { label: string; statuses: InstallationStatus[] }>;

export type StatusGroupKey = keyof typeof STATUS_GROUPS;

export const ALL_STATUSES: InstallationStatus[] = [
  'Assigned',
  'Downloaded',
  'In Progress',
  'Saved Locally',
  'Waiting to Sync',
  'Sync Failed',
  'Received by Server',
  'Needs Review',
  'Completed',
];

/** Friendlier wording for each status where the technical one is unclear. */
export const STATUS_LABEL: Record<InstallationStatus, string> = {
  Assigned: 'Not started',
  Downloaded: 'Not started (on phone)',
  'In Progress': 'Being installed',
  'Saved Locally': 'Saved on phone, not sent',
  'Waiting to Sync': 'Waiting for internet',
  'Sync Failed': 'Sending failed',
  'Received by Server': 'Sent, awaiting office check',
  'Needs Review': 'Needs office review',
  Completed: 'Done',
};

/**
 * A filter value is "All", a group key prefixed with "group:", or one exact status.
 */
export const matchesStatusFilter = (status: InstallationStatus, filter: string): boolean => {
  if (!filter || filter === 'All') return true;
  if (filter.startsWith('group:')) {
    const group = STATUS_GROUPS[filter.slice(6) as StatusGroupKey];
    return group ? (group.statuses as InstallationStatus[]).includes(status) : true;
  }
  return status === filter;
};

export const statusBadgeClass = (status: InstallationStatus): string => {
  if (status === 'Completed') return 'bg-emerald-100 text-emerald-800';
  if (status === 'Needs Review' || status === 'Sync Failed') return 'bg-amber-100 text-amber-800';
  if (status === 'Received by Server') return 'bg-violet-100 text-violet-800';
  if (status === 'In Progress' || status === 'Saved Locally' || status === 'Waiting to Sync')
    return 'bg-blue-100 text-blue-800';
  return 'bg-slate-100 text-slate-700';
};

/** Sorted unique non-empty values, for building filter dropdowns from real data. */
export const uniqueSorted = (values: (string | undefined)[]): string[] =>
  Array.from(new Set(values.filter((v): v is string => !!v && v.trim() !== ''))).sort();
