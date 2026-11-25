/**
 * The collections the app keeps in the database, shared by browser and server.
 * `newestFirst` lists are shown newest first in the app (new items are added to the front).
 */
export const TABLES = {
  users: { collection: 'users', newestFirst: false },
  consumers: { collection: 'consumers', newestFirst: false },
  inventory: { collection: 'inventory', newestFirst: false },
  installations: { collection: 'installations', newestFirst: true },
  dcr_records: { collection: 'dcrRecords', newestFirst: true },
  service_tickets: { collection: 'serviceTickets', newestFirst: true },
  exceptions: { collection: 'exceptions', newestFirst: true },
  audit_logs: { collection: 'auditLogs', newestFirst: true },
  surveys: { collection: 'surveys', newestFirst: true },
  villages: { collection: 'villages', newestFirst: false },
} as const;

export type TableName = keyof typeof TABLES;
export type CollectionKey = (typeof TABLES)[TableName]['collection'];
export const TABLE_NAMES = Object.keys(TABLES) as TableName[];

export interface DbRecord {
  id: string;
  [key: string]: unknown;
}

/** Changes for one table. Upserts are listed oldest first. */
export interface TableChanges {
  table: TableName;
  upserts: DbRecord[];
  deletes: string[];
}

export type AllData = Record<CollectionKey, DbRecord[]>;

/**
 * Put a list in the order it was created (oldest first), which is the order rows are stored.
 * Lists shown newest first are reversed.
 */
export const chronological = (table: TableName, rows: DbRecord[]) =>
  TABLES[table].newestFirst ? [...rows].reverse() : rows;
