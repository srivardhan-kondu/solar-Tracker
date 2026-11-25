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
  /** Employee details, filled in when the office onboards the person */
  employeeId?: string;
  address?: string;
  joiningDate?: string; // YYYY-MM-DD
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  onboardedBy?: string;
  onboardedAt?: string;
  /** Installers only: the villages the office allows them to work in. None = cannot work anywhere. */
  villageIds?: string[];
  accessUpdatedBy?: string;
  accessUpdatedAt?: string;
}

/**
 * A village the office lets installers work in: its name and a circle on the ground (the geofence).
 * Set up by the office only. An installer can take survey and installation photos only inside
 * the circles of the villages they are allowed.
 */
export interface Village {
  id: string;
  name: string;
  mandal?: string;
  district?: string;
  latitude: number;
  longitude: number;
  /** How far from the centre point still counts as the village */
  radiusM: number;
  updatedBy: string;
  updatedAt: string;
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

/** Where and when a photo was taken. Every photo taken in the app has one. */
export interface GeoTag {
  latitude: number;
  longitude: number;
  accuracy: number; // metres
  capturedAt: string;
  /** When the photo was taken (epoch ms), by the clock checked against the server when possible */
  takenAt?: number;
  /** False when the phone was offline and its own clock had to be used */
  clockChecked?: boolean;
}

export interface PhotoEvidence {
  id: string;
  category: PhotoCategory;
  name: string;
  url: string;
  capturedAt: string;
  status: 'captured' | 'pending_upload' | 'uploaded';
  accuracyNote?: string;
  isBlurry?: boolean;
  geo?: GeoTag;
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
  /** The number from the original list, kept when an installer changes the mobile number */
  previousMobile?: string;
  mobileUpdatedBy?: string;
  mobileUpdatedAt?: string;
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
  url: string; // stored photo link, a JPEG data URL until it is uploaded, or a sample image path
  capturedAt: string;
  geo?: GeoTag;
}

/** The APSPDCL consumer consent form, filled in and signed on the phone during the survey */
export interface SurveyConsent {
  address?: string;
  roofAreaSqFt?: number;
  caste?: 'SC' | 'ST';
  /** Only the last 4 digits are kept, the same as on the Aadhaar photo */
  aadhaarLast4?: string;
  /** The consumer's signature, a PNG data URL. Cleared whenever the details above change. */
  signature?: string;
  signedAt?: string; // ISO time
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

  consent?: SurveyConsent; // needed when the home is Feasible

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
  recordType: 'Installation' | 'Consumer' | 'Inventory' | 'DCR' | 'ServiceTicket' | 'User' | 'Assignment' | 'Village';
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
