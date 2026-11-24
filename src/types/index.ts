export type UserRole = 'Super Admin' | 'Admin' | 'Installer' | 'Service Engineer';

export interface User {
  id: string;
  name: string;
  username: string;
  mobile: string;
  role: UserRole;
  division: string;
  district: string;
  status: 'Active' | 'Inactive';
  lastLogin: string;
  avatar?: string;
}

export type InstallationStatus =
  | 'Assigned'
  | 'Downloaded'
  | 'In Progress'
  | 'Saved Locally'
  | 'Waiting to Sync'
  | 'Sync Failed'
  | 'Received by Server'
  | 'Needs Review'
  | 'Completed';

export type PhotoCategory =
  | 'front'
  | 'side'
  | 'consumer'
  | 'meter'
  | 'inverter'
  | 'structure'
  | 'earthing';

export interface PhotoEvidence {
  id: string;
  category: PhotoCategory;
  name: string;
  url: string;
  capturedAt: string;
  status: 'captured' | 'pending_upload' | 'uploaded';
  accuracyNote?: string;
  isBlurry?: boolean;
}

export interface GpsLocation {
  latitude: number;
  longitude: number;
  accuracy: number; // in meters
  capturedAt: string;
  address?: string;
  isSimulated?: boolean;
}

export interface Consumer {
  id: string;
  consumerNumber: string;
  name: string;
  mobile: string;
  village: string;
  mandal: string;
  district: string;
  division: string;
  ula: string;
  status: InstallationStatus;
  assignedInstallerId?: string;
  assignedInstallerName?: string;
  assignedDate?: string;
  capacityKw: number;
}

export interface EquipmentInventory {
  id: string;
  serialNumber: string;
  type: 'panel' | 'inverter';
  brand: string;
  model: string;
  capacityWatts?: number;
  batch: string;
  status: 'Available' | 'Reserved' | 'Installed' | 'Returned' | 'Damaged' | 'Quarantined';
  linkedConsumerNumber?: string;
  installationId?: string;
  receivedDate: string;
  installedDate?: string;
  lastUpdated: string;
}

export interface Installation {
  id: string;
  consumerNumber: string;
  installerId: string;
  installerName: string;
  division: string;
  village: string;
  status: InstallationStatus;
  syncStatus: 'synced' | 'pending_sync' | 'sync_failed' | 'local_only';
  startedAt?: string;
  completedAt?: string;
  syncedAt?: string;
  
  // Equipment
  panels: [string, string, string, string]; // exactly 4 panels
  inverterSerial: string;
  manualSerialUsed?: boolean;
  manualSerialReason?: string;
  
  // Evidence
  photos: {
    front?: PhotoEvidence;
    side?: PhotoEvidence;
    consumer?: PhotoEvidence;
    meter?: PhotoEvidence;
    inverter?: PhotoEvidence;
    structure?: PhotoEvidence;
    earthing?: PhotoEvidence;
  };
  
  // GPS
  gps?: GpsLocation;
  gpsExemptionReason?: string;
  
  // DCR
  dcrNumber?: string;
  dcrStatus?: 'Not Received' | 'Uploaded' | 'Matched' | 'Ready for Review' | 'Updated' | 'Conflict';
  
  // Verification
  consumerConfirmed: boolean;
  reportedIncorrectDetails?: string;
  notes?: string;
  reviewNotes?: string;
  syncErrorReason?: string;
  officeApprovalStatus?: 'Pending' | 'Approved' | 'Rejected';
  officeApprovalNotes?: string;
  approvedBy?: string;
  approvedAt?: string;
}

// ---------- Site survey (done before installation) ----------
export type RoofType = 'Concrete' | 'Mud' | 'Sheds' | 'Metal sheets';
export type ShadeLevel = 'None' | 'Some' | 'Heavy';
export type SurveyDecision = 'Feasible' | 'Not Feasible';

export interface SurveyPhoto {
  id: string;
  url: string; // small JPEG data URL, or a sample image path
  capturedAt: string;
}

export interface SiteSurvey {
  id: string;
  consumerNumber: string;
  surveyorId: string;
  surveyorName: string;
  status: 'Draft' | 'Submitted';
  startedAt: string;
  submittedAt?: string;

  billPhoto?: SurveyPhoto;
  aadhaarPhoto?: SurveyPhoto;

  roofType?: RoofType;
  roofPhotos: SurveyPhoto[];

  shadeLevel?: ShadeLevel;
  shadeSources: string[]; // e.g. Trees, Nearby buildings
  surroundingsPhotos: SurveyPhoto[];

  decision?: SurveyDecision;
  decisionNote?: string; // required when Not Feasible

  // Set when office staff reopen a sent survey so the installer can redo it
  reopenedBy?: string;
  reopenedAt?: string;
  reopenNote?: string;
}

export interface DCRRecord {
  id: string;
  ula: string;
  dcrNumber: string;
  consumerNumber?: string;
  consumerName?: string;
  status: 'Matched' | 'ULA Not Found' | 'Duplicate ULA' | 'Duplicate DCR' | 'Existing Value Conflict' | 'Resolved';
  uploadedAt: string;
  uploadedBy: string;
  sourceFile: string;
  conflictDetails?: string;
}

export interface ServiceTicket {
  id: string;
  ticketNumber: string;
  consumerNumber: string;
  consumerName: string;
  mobile: string;
  village: string;
  division: string;
  issueCategory: 'Inverter Fault' | 'Low Generation' | 'Physical Damage' | 'Earthing / Wiring' | 'Meter Sync' | 'Routine Inspection';
  description: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  status: 'Created' | 'Assigned' | 'Accepted' | 'Visit In Progress' | 'Follow-up Required' | 'Resolved' | 'Closed';
  assignedEngineerId?: string;
  assignedEngineerName?: string;
  createdAt: string;
  dueDate: string;
  closedAt?: string;
  visitNotes?: string;
  visitPhotos: string[];
  visitGps?: GpsLocation;
  closureReason?: string;
}

export type ExceptionType =
  | 'missing_photo'
  | 'gps_issue'
  | 'duplicate_serial'
  | 'inventory_conflict'
  | 'dcr_mismatch'
  | 'sync_failure'
  | 'service_overdue'
  | 'site_not_feasible';

export interface ActionRequiredException {
  id: string;
  type: ExceptionType;
  title: string;
  consumerNumber?: string;
  ticketNumber?: string;
  division: string;
  village: string;
  detectedDate: string;
  priority: 'High' | 'Medium' | 'Low';
  assignedOwner?: string;
  status: 'Open' | 'In Progress' | 'Resolved' | 'Dismissed';
  description: string;
  resolutionNote?: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface AuditEvent {
  id: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  recordType: 'Installation' | 'Consumer' | 'Inventory' | 'DCR' | 'ServiceTicket' | 'User' | 'Assignment';
  recordId: string;
  timestamp: string;
  details: string;
  oldValue?: string;
  newValue?: string;
  reason?: string;
}

export interface OfflineSyncQueueItem {
  id: string;
  installationId: string;
  consumerNumber: string;
  timestamp: string;
  attempts: number;
  lastAttemptAt?: string;
  status: 'pending' | 'syncing' | 'failed' | 'success';
  errorMessage?: string;
  mediaItemsCount: number;
}
