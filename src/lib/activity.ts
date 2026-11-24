/** Plain words for the technical action codes stored in the log */
const ACTION_LABEL: Record<string, string> = {
  SUBMIT_INSTALLATION: 'Installation sent',
  OFFLINE_SAVE: 'Saved on phone (no internet)',
  BACKGROUND_SYNC: 'Sent after internet returned',
  DUPLICATE_SCAN_BLOCKED: 'Reused serial number stopped',
  MANUAL_SERIAL_ENTRY: 'Serial number typed by hand',
  UPLOAD_MASTER_CONSUMERS: 'Consumer list uploaded',
  UPLOAD_INVENTORY: 'Stock list uploaded',
  ASSIGN_WORK: 'Work assigned',
  DCR_RECONCILIATION: 'DCR file matched',
  CREATE_SERVICE_TICKET: 'Service complaint created',
  UPDATE_SERVICE_TICKET: 'Service complaint updated',
  RESOLVE_EXCEPTION: 'Problem marked fixed',
  DISMISS_EXCEPTION: 'Problem dismissed',
  APPROVE_INSTALLATION: 'Installation approved',
  REJECT_INSTALLATION: 'Installation sent back',
  SUBMIT_SURVEY: 'Site survey sent',
  REOPEN_SURVEY: 'Site survey reopened',
  UPDATE_MOBILE: 'Mobile number changed',
};

export const friendly = (code: string) =>
  ACTION_LABEL[code] ||
  code
    .toLowerCase()
    .split('_')
    .map((w, i) => (i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ');
