'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  User,
  Consumer,
  EquipmentInventory,
  Installation,
  DCRRecord,
  ServiceTicket,
  ActionRequiredException,
  AuditEvent,
  OfflineSyncQueueItem,
  PhotoCategory,
  PhotoEvidence,
  GpsLocation,
  SiteSurvey,
  GeoTag,
  Village,
} from '@/types';
import {
  SEED_USERS,
  SEED_CONSUMERS,
  SEED_INVENTORY,
  SEED_INSTALLATIONS,
  SEED_DCR_RECORDS,
  SEED_SERVICE_TICKETS,
  SEED_EXCEPTIONS,
  SEED_AUDIT_LOGS,
  SEED_SURVEYS,
} from '@/data/seedData';
import { useLang } from '@/i18n/LanguageContext';
import { IS_DEMO } from '@/lib/mode';
import { canInstall, reopenBlocker, surveyMissing } from '@/lib/survey';
import { Refusal, SyncState, uploadPhoto, useServerSync } from '@/lib/serverSync';
import { useAuth } from '@/components/auth/AuthGate';
import { villageLabel } from '@/lib/workArea';
import { hasGeo } from '@/lib/geoPhoto';
import { normalizeMobile, sameMobile } from '@/lib/mobile';
import { resumeStep } from '@/lib/installationSteps';
import { AllData, CollectionKey, DbRecord } from '@/lib/tables';

interface AppContextType {
  // State
  users: User[];
  currentUser: User;
  consumers: Consumer[];
  inventory: EquipmentInventory[];
  installations: Installation[];
  dcrRecords: DCRRecord[];
  serviceTickets: ServiceTicket[];
  exceptions: ActionRequiredException[];
  auditLogs: AuditEvent[];
  offlineQueue: OfflineSyncQueueItem[];
  isOnline: boolean;
  appMode: 'admin' | 'mobile' | 'split';
  installerDraft: Installation | null;
  activeStep: number;
  selectedConsumerFor360: Consumer | null;
  surveys: SiteSurvey[];
  /** Villages set up by the office: name and geofence circle */
  villages: Village[];
  /** Work the server would not accept since the last time the notice was closed */
  refusedChanges: Refusal[];
  clearRefusedChanges: () => void;
  /** True when the browser refused to save (storage full), so recent work may be lost on refresh */
  storageFull: boolean;
  /** Whether everything has been saved to the server */
  syncState: SyncState;

  // Setters & Actions
  /** Sign out. Returns false (and does nothing) while this phone has work not yet sent. */
  signOut: () => Promise<boolean>;
  setAppMode: (mode: 'admin' | 'mobile' | 'split') => void;
  setIsOnline: (online: boolean) => void;
  setSelectedConsumerFor360: (consumer: Consumer | null) => void;
  startOrResumeInstallation: (consumerNumber: string) => void;
  updateDraft: (updates: Partial<Installation>) => void;
  setDraftStep: (step: number) => void;
  scanPanel: (index: number, serial: string) => { success: boolean; message: string; duplicateConsumer?: string };
  scanInverter: (serial: string) => { success: boolean; message: string; duplicateConsumer?: string };
  addPhotoToDraft: (category: PhotoCategory, photo: PhotoEvidence) => void;
  removePhotoFromDraft: (category: PhotoCategory) => void;
  setGpsToDraft: (gps: GpsLocation) => void;
  submitInstallationDraft: () => { success: boolean; isOffline: boolean; message: string };
  syncOfflineQueue: () => Promise<{ synced: number; failed: number }>;
  retryOfflineQueueItem: (id: string) => Promise<void>;
  uploadConsumers: (newConsumers: Consumer[]) => { inserted: number; updated: number };
  uploadInventory: (items: EquipmentInventory[]) => { inserted: number; duplicateSerials: string[] };
  assignConsumersToInstaller: (consumerNumbers: string[], installerId: string) => void;
  /** Office: choose the villages an installer may work in (replaces their previous villages) */
  setInstallerVillages: (installerId: string, villageIds: string[]) => void;
  /** Office: add a village, or change its name or geofence (pass its id) */
  saveVillage: (v: Omit<Village, 'id' | 'updatedBy' | 'updatedAt'> & { id?: string }) => void;
  /** Office: remove a village; it is taken away from every installer who had it */
  removeVillage: (id: string) => void;
  /** Head office: add a person. Returns an error message, or null when added. */
  addUser: (p: Pick<User, 'name' | 'username' | 'mobile' | 'role' | 'division'>) => string | null;
  /** Head office: switch a person off (they can no longer sign in) or back on */
  setUserStatus: (userId: string, status: User['status']) => void;
  reconcileDCRFile: (records: { ula: string; dcrNumber: string }[], fileName: string) => { matched: number; unmatched: number; conflicts: number };
  createServiceTicket: (ticket: Omit<ServiceTicket, 'id' | 'ticketNumber' | 'createdAt' | 'visitPhotos'>) => void;
  updateServiceTicketStatus: (ticketId: string, status: ServiceTicket['status'], notes?: string, photos?: string[]) => void;
  resolveException: (exceptionId: string, resolutionNote: string) => void;
  dismissException: (exceptionId: string, reason: string) => void;
  approveInstallation: (installationId: string, notes?: string) => void;
  rejectInstallation: (installationId: string, notes: string) => void;
  recordManualSerial: (serial: string, reason: string) => void;
  logAudit: (action: string, recordType: AuditEvent['recordType'], recordId: string, details: string, oldValue?: string, newValue?: string, reason?: string) => void;
  resetAllData: () => Promise<boolean>;
  /** Change a survey that has not been sent yet; starts one if needed. */
  updateSurveyDraft: (consumerNumber: string, change: (s: SiteSurvey) => SiteSurvey) => void;
  submitSurvey: (consumerNumber: string) => { success: boolean; message: string };
  /** Installer or office: correct a consumer's mobile number. The original number is kept as "previous". */
  updateConsumerMobile: (consumerNumber: string, newMobile: string) => { success: boolean; message: string };
  /** Office only: send a survey back to the installer to be done again */
  reopenSurvey: (consumerNumber: string, reason: string) => { success: boolean; message: string };
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY = 'SOLAR_TRACKER_DATA_V1';
// Surveys hold photos, so they are kept apart from the rest of the data
const SURVEY_STORAGE_KEY = 'SOLAR_TRACKER_SURVEYS_V1';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Messages shown to people are translated; audit records stay in English.
  const { t } = useLang();
  const { user: sessionUser, signOut, signedOutByServer } = useAuth();
  const [users, setUsers] = useState<User[]>(IS_DEMO ? SEED_USERS : []);
  // The signed-in person, kept up to date when the office changes them (e.g. their work area)
  const currentUser = users.find((u) => u.id === sessionUser.id) ?? sessionUser;
  const [villages, setVillages] = useState<Village[]>([]);
  const [refusedChanges, setRefusedChanges] = useState<Refusal[]>([]);
  const [consumers, setConsumers] = useState<Consumer[]>(IS_DEMO ? SEED_CONSUMERS : []);
  const [inventory, setInventory] = useState<EquipmentInventory[]>(IS_DEMO ? SEED_INVENTORY : []);
  const [installations, setInstallations] = useState<Installation[]>(IS_DEMO ? SEED_INSTALLATIONS : []);
  const [dcrRecords, setDcrRecords] = useState<DCRRecord[]>(IS_DEMO ? SEED_DCR_RECORDS : []);
  const [serviceTickets, setServiceTickets] = useState<ServiceTicket[]>(IS_DEMO ? SEED_SERVICE_TICKETS : []);
  const [exceptions, setExceptions] = useState<ActionRequiredException[]>(IS_DEMO ? SEED_EXCEPTIONS : []);
  const [auditLogs, setAuditLogs] = useState<AuditEvent[]>(IS_DEMO ? SEED_AUDIT_LOGS : []);
  const [offlineQueue, setOfflineQueue] = useState<OfflineSyncQueueItem[]>([]);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [appMode, setAppMode] = useState<'admin' | 'mobile' | 'split'>('admin');
  const [installerDraft, setInstallerDraft] = useState<Installation | null>(null);
  const [activeStep, setActiveStep] = useState<number>(1);
  const [selectedConsumerFor360, setSelectedConsumerFor360] = useState<Consumer | null>(null);
  const [surveys, setSurveys] = useState<SiteSurvey[]>(IS_DEMO ? SEED_SURVEYS : []);
  const [mainStorageFull, setMainStorageFull] = useState(false);
  const [surveyStorageFull, setSurveyStorageFull] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.users) setUsers(parsed.users);
        if (parsed.consumers) setConsumers(parsed.consumers);
        if (parsed.inventory) setInventory(parsed.inventory);
        if (parsed.installations) setInstallations(parsed.installations);
        if (parsed.dcrRecords) setDcrRecords(parsed.dcrRecords);
        if (parsed.serviceTickets) setServiceTickets(parsed.serviceTickets);
        if (parsed.exceptions) setExceptions(parsed.exceptions);
        if (parsed.auditLogs) setAuditLogs(parsed.auditLogs);
        if (parsed.villages) setVillages(parsed.villages);
        if (parsed.offlineQueue) setOfflineQueue(parsed.offlineQueue);
        if (parsed.installerDraft) {
          setInstallerDraft(parsed.installerDraft);
          // Work out the step from the job itself (step numbers changed when steps 1 and 2 were merged)
          setActiveStep(resumeStep(parsed.installerDraft));
        }
      }
      const savedSurveys = localStorage.getItem(SURVEY_STORAGE_KEY);
      if (savedSurveys) setSurveys(JSON.parse(savedSurveys));
    } catch {
      console.warn('Could not load localStorage data, using seed defaults');
    }
  }, []);

  // Sync to localStorage
  useEffect(() => {
    try {
      const dataToSave = {
        users,
        consumers,
        inventory,
        installations,
        dcrRecords,
        serviceTickets,
        exceptions,
        auditLogs,
        villages,
        offlineQueue,
        // Keep the in-progress installation so a page refresh never loses field work
        installerDraft,
        activeStep,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
      setMainStorageFull(false);
    } catch {
      // quota or private mode
      setMainStorageFull(true);
    }
  }, [users, consumers, inventory, installations, dcrRecords, serviceTickets, exceptions, auditLogs, villages, offlineQueue, installerDraft, activeStep]);

  useEffect(() => {
    try {
      localStorage.setItem(SURVEY_STORAGE_KEY, JSON.stringify(surveys));
      setSurveyStorageFull(false);
    } catch {
      setSurveyStorageFull(true);
    }
  }, [surveys]);

  // Audit Logger helper
  const logAudit = (
    action: string,
    recordType: AuditEvent['recordType'],
    recordId: string,
    details: string,
    oldValue?: string,
    newValue?: string,
    reason?: string
  ) => {
    const newLog: AuditEvent = {
      id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      action,
      recordType,
      recordId,
      timestamp: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
      details,
      oldValue,
      newValue,
      reason,
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  // Start or resume installation for mobile app
  const startOrResumeInstallation = (consumerNumber: string) => {
    const consumer = consumers.find((c) => c.consumerNumber === consumerNumber);
    if (!consumer) return;
    // Installers work only on their own homes
    if (currentUser.role === 'Installer' && consumer.assignedInstallerId !== currentUser.id) return;
    // A home is installed only after the site survey says it is feasible
    if (!canInstall(surveys, installations, consumerNumber)) return;

    // Check existing installation
    const existing = installations.find((i) => i.consumerNumber === consumerNumber);
    if (existing) {
      setInstallerDraft({ ...existing });
      setActiveStep(resumeStep(existing));
      return;
    }

    // New draft
    const newDraft: Installation = {
      id: `inst_${Date.now()}`,
      consumerNumber,
      installerId: currentUser.id,
      installerName: currentUser.name,
      division: consumer.division,
      village: consumer.village,
      status: 'In Progress',
      syncStatus: isOnline ? 'local_only' : 'local_only',
      startedAt: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
      panels: ['', '', '', ''],
      inverterSerial: '',
      photos: {},
      consumerConfirmed: false,
    };

    setInstallerDraft(newDraft);
    setActiveStep(1);

    // Update consumer status
    setConsumers((prev) =>
      prev.map((c) => (c.consumerNumber === consumerNumber ? { ...c, status: 'In Progress' } : c))
    );
  };

  const updateDraft = (updates: Partial<Installation>) => {
    if (!installerDraft) return;
    setInstallerDraft((prev) => (prev ? { ...prev, ...updates } : null));
  };

  const setDraftStep = (step: number) => {
    setActiveStep(step);
  };

  // Serial verification against inventory (BR-002, BR-005, BR-006, BR-007)
  const scanPanel = (index: number, serial: string): { success: boolean; message: string; duplicateConsumer?: string } => {
    const cleanSerial = serial.trim().toUpperCase();
    if (!cleanSerial) return { success: false, message: t('Please scan or type the panel number first.') };

    // Check if already in current draft at another index
    if (installerDraft?.panels.some((p, i) => i !== index && p.toUpperCase() === cleanSerial)) {
      return { success: false, message: t('You already scanned panel {sn} for another slot. Please scan a different panel.', { sn: cleanSerial }) };
    }

    // Check central inventory
    const invItem = inventory.find(
      (item) => item.type === 'panel' && item.serialNumber.toUpperCase() === cleanSerial
    );

    if (!invItem) {
      return {
        success: false,
        message: t('Panel number {sn} is not in our stock list. Check the label and scan again, or call your supervisor.', { sn: cleanSerial }),
      };
    }

    if (invItem.status === 'Installed' && invItem.linkedConsumerNumber !== installerDraft?.consumerNumber) {
      // Record duplicate attempt exception!
      const exc: ActionRequiredException = {
        id: `exc_${Date.now()}`,
        type: 'duplicate_serial',
        title: `Duplicate Panel Serial Scan: ${cleanSerial}`,
        consumerNumber: installerDraft?.consumerNumber,
        division: installerDraft?.division || 'Unknown',
        village: installerDraft?.village || 'Unknown',
        detectedDate: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
        priority: 'High',
        assignedOwner: currentUser.name,
        status: 'Open',
        description: `Installer ${currentUser.name} attempted to scan panel ${cleanSerial} which is already locked to consumer ${invItem.linkedConsumerNumber}.`,
      };
      setExceptions((prev) => [exc, ...prev]);

      logAudit(
        'DUPLICATE_SCAN_BLOCKED',
        'Inventory',
        cleanSerial,
        `Duplicate scan attempt blocked for panel ${cleanSerial} against consumer ${installerDraft?.consumerNumber}. Linked consumer: ${invItem.linkedConsumerNumber}`
      );

      return {
        success: false,
        message: t('Panel {sn} is already fitted at another home ({c}). Please use a different panel. The office has been informed.', { sn: cleanSerial, c: invItem.linkedConsumerNumber }),
        duplicateConsumer: invItem.linkedConsumerNumber,
      };
    }

    if (invItem.status === 'Damaged' || invItem.status === 'Quarantined') {
      return {
        success: false,
        message: t('Panel {sn} is marked "{status}" in the store. Please use a different panel.', { sn: cleanSerial, status: t(invItem.status) }),
      };
    }

    // Valid scan! Update draft
    if (installerDraft) {
      const updatedPanels = [...installerDraft.panels] as [string, string, string, string];
      updatedPanels[index] = cleanSerial;
      setInstallerDraft({ ...installerDraft, panels: updatedPanels });
    }

    return {
      success: true,
      message: t('Panel {n} saved: {sn} ({brand}).', { n: index + 1, sn: cleanSerial, brand: invItem.brand }),
    };
  };

  const scanInverter = (serial: string): { success: boolean; message: string; duplicateConsumer?: string } => {
    const cleanSerial = serial.trim().toUpperCase();
    if (!cleanSerial) return { success: false, message: t('Please scan or type the inverter number first.') };

    const invItem = inventory.find(
      (item) => item.type === 'inverter' && item.serialNumber.toUpperCase() === cleanSerial
    );

    if (!invItem) {
      return {
        success: false,
        message: t('Inverter number {sn} is not in our stock list. Check the label and scan again, or call your supervisor.', { sn: cleanSerial }),
      };
    }

    if (invItem.status === 'Installed' && invItem.linkedConsumerNumber !== installerDraft?.consumerNumber) {
      const exc: ActionRequiredException = {
        id: `exc_${Date.now()}`,
        type: 'duplicate_serial',
        title: `Duplicate Inverter Scan: ${cleanSerial}`,
        consumerNumber: installerDraft?.consumerNumber,
        division: installerDraft?.division || 'Unknown',
        village: installerDraft?.village || 'Unknown',
        detectedDate: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
        priority: 'High',
        assignedOwner: currentUser.name,
        status: 'Open',
        description: `Attempted to scan inverter ${cleanSerial} already installed at ${invItem.linkedConsumerNumber}.`,
      };
      setExceptions((prev) => [exc, ...prev]);

      return {
        success: false,
        message: t('Inverter {sn} is already fitted at another home ({c}). Please use a different inverter. The office has been informed.', { sn: cleanSerial, c: invItem.linkedConsumerNumber }),
        duplicateConsumer: invItem.linkedConsumerNumber,
      };
    }

    if (invItem.status === 'Damaged' || invItem.status === 'Quarantined') {
      return {
        success: false,
        message: t('Inverter {sn} is marked "{status}" in the store. Please use a different inverter.', { sn: cleanSerial, status: t(invItem.status) }),
      };
    }

    if (installerDraft) {
      setInstallerDraft({ ...installerDraft, inverterSerial: cleanSerial });
    }

    return {
      success: true,
      message: t('Inverter saved: {sn} ({brand}).', { sn: cleanSerial, brand: invItem.brand }),
    };
  };

  const addPhotoToDraft = (category: PhotoCategory, photo: PhotoEvidence) => {
    if (!installerDraft) return;
    setInstallerDraft({
      ...installerDraft,
      photos: {
        ...installerDraft.photos,
        [category]: photo,
      },
    });
  };

  const removePhotoFromDraft = (category: PhotoCategory) => {
    if (!installerDraft) return;
    const updated = { ...installerDraft.photos };
    delete updated[category];
    setInstallerDraft({
      ...installerDraft,
      photos: updated,
    });
  };

  const setGpsToDraft = (gps: GpsLocation) => {
    if (!installerDraft) return;
    setInstallerDraft({ ...installerDraft, gps });
  };

  // Submit Installation Draft
  const submitInstallationDraft = (): { success: boolean; isOffline: boolean; message: string } => {
    if (!installerDraft) return { success: false, isOffline: !isOnline, message: t('No draft found.') };

    const missingPhotos: string[] = [];
    const requiredCats: PhotoCategory[] = ['front', 'side', 'consumer', 'meter', 'inverter', 'structure', 'earthing'];
    requiredCats.forEach((c) => {
      if (!hasGeo(installerDraft.photos[c])) missingPhotos.push(c); // a photo without a location does not count
    });

    const isComplete =
      installerDraft.consumerConfirmed &&
      installerDraft.panels.every((p) => p.trim() !== '') &&
      installerDraft.inverterSerial.trim() !== '' &&
      missingPhotos.length === 0 &&
      installerDraft.gps !== undefined;

    const timestamp = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

    if (!isOnline) {
      // Offline mode submission (FR-SYNC-001, FR-INST-009)
      const offlineItem: OfflineSyncQueueItem = {
        id: `sync_${Date.now()}`,
        installationId: installerDraft.id,
        consumerNumber: installerDraft.consumerNumber,
        timestamp,
        attempts: 0,
        status: 'pending',
        mediaItemsCount: Object.keys(installerDraft.photos).length,
      };

      const updatedInst: Installation = {
        ...installerDraft,
        status: 'Saved Locally',
        syncStatus: 'pending_sync',
        completedAt: timestamp,
      };

      // Upsert installation in local list
      setInstallations((prev) => {
        const filtered = prev.filter((i) => i.id !== installerDraft.id && i.consumerNumber !== installerDraft.consumerNumber);
        return [updatedInst, ...filtered];
      });

      // Update consumer status
      setConsumers((prev) =>
        prev.map((c) => (c.consumerNumber === installerDraft.consumerNumber ? { ...c, status: 'Saved Locally' } : c))
      );

      // Queue in offline queue
      setOfflineQueue((prev) => [offlineItem, ...prev]);

      setInstallerDraft(null);
      setActiveStep(1);

      logAudit(
        'OFFLINE_SAVE',
        'Installation',
        installerDraft.id,
        `Installation for ${installerDraft.consumerNumber} saved on local device (Offline Mode). Queued for server sync.`
      );

      return {
        success: true,
        isOffline: true,
        message: t('Saved on this phone. It will be sent to the office automatically when the internet comes back.'),
      };
    }

    // Online submission
    const finalStatus = isComplete ? 'Received by Server' : 'Needs Review';
    const updatedInst: Installation = {
      ...installerDraft,
      status: finalStatus,
      syncStatus: 'synced',
      completedAt: timestamp,
      syncedAt: timestamp,
      officeApprovalStatus: 'Pending',
    };

    // Lock inventory serials atomically (FR-INV-002, FR-INV-003)
    setInventory((prev) =>
      prev.map((item) => {
        const isMatchedPanel = updatedInst.panels.some((p) => p.toUpperCase() === item.serialNumber.toUpperCase());
        const isMatchedInverter = updatedInst.inverterSerial.toUpperCase() === item.serialNumber.toUpperCase();
        if (isMatchedPanel || isMatchedInverter) {
          return {
            ...item,
            status: 'Installed',
            linkedConsumerNumber: updatedInst.consumerNumber,
            installationId: updatedInst.id,
            installedDate: timestamp,
            lastUpdated: timestamp,
          };
        }
        return item;
      })
    );

    // Save installation
    setInstallations((prev) => {
      const filtered = prev.filter((i) => i.id !== installerDraft.id && i.consumerNumber !== installerDraft.consumerNumber);
      return [updatedInst, ...filtered];
    });

    // Update consumer status
    setConsumers((prev) =>
      prev.map((c) => (c.consumerNumber === installerDraft.consumerNumber ? { ...c, status: finalStatus } : c))
    );

    // If photos missing or GPS poor, log exception
    if (missingPhotos.length > 0) {
      const exc: ActionRequiredException = {
        id: `exc_${Date.now()}_ph`,
        type: 'missing_photo',
        title: `Missing Photo: ${missingPhotos.join(', ')}`,
        consumerNumber: updatedInst.consumerNumber,
        division: updatedInst.division,
        village: updatedInst.village,
        detectedDate: timestamp,
        priority: 'High',
        assignedOwner: currentUser.name,
        status: 'Open',
        description: `Consumer ${updatedInst.consumerNumber} submitted without: ${missingPhotos.join(', ')}.`,
      };
      setExceptions((prev) => [exc, ...prev]);
    }

    if (updatedInst.gps && updatedInst.gps.accuracy > 15) {
      const exc: ActionRequiredException = {
        id: `exc_${Date.now()}_gps`,
        type: 'gps_issue',
        title: `GPS Accuracy Warning (${updatedInst.gps.accuracy}m)`,
        consumerNumber: updatedInst.consumerNumber,
        division: updatedInst.division,
        village: updatedInst.village,
        detectedDate: timestamp,
        priority: 'Medium',
        assignedOwner: 'Priya Sharma (Admin)',
        status: 'Open',
        description: `GPS accuracy recorded as ${updatedInst.gps.accuracy}m. Requires office review.`,
      };
      setExceptions((prev) => [exc, ...prev]);
    }

    setInstallerDraft(null);
    setActiveStep(1);

    logAudit(
      'SUBMIT_INSTALLATION',
      'Installation',
      updatedInst.id,
      isComplete
        ? `Installation for ${updatedInst.consumerNumber} received by server. 4 panels and 1 inverter locked.`
        : `Installation for ${updatedInst.consumerNumber} received with missing items; sent for office review.`
    );

    return {
      success: true,
      isOffline: false,
      message: isComplete
        ? t('Installation sent to the office successfully.')
        : t('Installation sent, but some items are missing. The office will review it and may contact you.'),
    };
  };

  // Sync Offline Queue
  const syncOfflineQueue = async (): Promise<{ synced: number; failed: number }> => {
    if (!isOnline) {
      return { synced: 0, failed: offlineQueue.length };
    }

    let syncedCount = 0;
    const remainingQueue: OfflineSyncQueueItem[] = [];

    for (const item of offlineQueue) {
      const inst = installations.find((i) => i.id === item.installationId || i.consumerNumber === item.consumerNumber);
      if (inst) {
        // Atomic lock inventory
        setInventory((prev) =>
          prev.map((invItem) => {
            const isMatchedPanel = inst.panels.some((p) => p.toUpperCase() === invItem.serialNumber.toUpperCase());
            const isMatchedInverter = inst.inverterSerial.toUpperCase() === invItem.serialNumber.toUpperCase();
            if (isMatchedPanel || isMatchedInverter) {
              return {
                ...invItem,
                status: 'Installed',
                linkedConsumerNumber: inst.consumerNumber,
                installationId: inst.id,
                installedDate: new Date().toLocaleString('en-IN'),
                lastUpdated: new Date().toLocaleString('en-IN'),
              };
            }
            return invItem;
          })
        );

        // Update installation to synced
        const syncedTimestamp = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
        setInstallations((prev) =>
          prev.map((i) =>
            i.id === inst.id
              ? {
                  ...i,
                  status: 'Received by Server',
                  syncStatus: 'synced',
                  syncedAt: syncedTimestamp,
                }
              : i
          )
        );

        setConsumers((prev) =>
          prev.map((c) =>
            c.consumerNumber === inst.consumerNumber ? { ...c, status: 'Received by Server' } : c
          )
        );

        logAudit(
          'BACKGROUND_SYNC',
          'Installation',
          inst.id,
          `Background sync confirmed receipt for ${inst.consumerNumber}. Stored centrally.`
        );

        syncedCount++;
      } else {
        remainingQueue.push({
          ...item,
          attempts: item.attempts + 1,
          status: 'failed',
          errorMessage: 'Draft record missing in local storage',
        });
      }
    }

    setOfflineQueue(remainingQueue);
    return { synced: syncedCount, failed: remainingQueue.length };
  };

  const retryOfflineQueueItem = async (id: string) => {
    if (!isOnline) return;
    const item = offlineQueue.find((q) => q.id === id);
    if (!item) return;

    await syncOfflineQueue();
  };

  // Master Data Upload: Consumers (FR-MD-001)
  const uploadConsumers = (newConsumers: Consumer[]): { inserted: number; updated: number } => {
    let inserted = 0;
    let updated = 0;

    setConsumers((prev) => {
      const map = new Map(prev.map((c) => [c.consumerNumber, c]));
      newConsumers.forEach((nc) => {
        if (map.has(nc.consumerNumber)) {
          map.set(nc.consumerNumber, { ...map.get(nc.consumerNumber)!, ...nc });
          updated++;
        } else {
          map.set(nc.consumerNumber, nc);
          inserted++;
        }
      });
      return Array.from(map.values());
    });

    logAudit(
      'UPLOAD_MASTER_CONSUMERS',
      'Consumer',
      `BATCH_${Date.now()}`,
      `Uploaded consumers: ${inserted} added, ${updated} updated.`
    );

    return { inserted, updated };
  };

  // Master Data Upload: Inventory (FR-MD-002, FR-MD-003)
  const uploadInventory = (items: EquipmentInventory[]): { inserted: number; duplicateSerials: string[] } => {
    const duplicates: string[] = [];
    const validToAdd: EquipmentInventory[] = [];

    const existingSerials = new Set(inventory.map((i) => i.serialNumber.toUpperCase()));

    items.forEach((item) => {
      const up = item.serialNumber.toUpperCase();
      if (existingSerials.has(up)) {
        duplicates.push(item.serialNumber);
      } else {
        existingSerials.add(up);
        validToAdd.push(item);
      }
    });

    if (validToAdd.length > 0) {
      setInventory((prev) => [...prev, ...validToAdd]);
      logAudit(
        'UPLOAD_INVENTORY',
        'Inventory',
        `BATCH_${Date.now()}`,
        `Uploaded ${validToAdd.length} equipment items (${duplicates.length} duplicate serials skipped).`
      );
    }

    return { inserted: validToAdd.length, duplicateSerials: duplicates };
  };

  // Assign Consumers to Installer (FR-ASG-001)
  const assignConsumersToInstaller = (consumerNumbers: string[], installerId: string) => {
    const installer = users.find((u) => u.id === installerId);
    if (!installer) return;

    setConsumers((prev) =>
      prev.map((c) => {
        if (consumerNumbers.includes(c.consumerNumber)) {
          return {
            ...c,
            assignedInstallerId: installer.id,
            assignedInstallerName: installer.name,
            assignedDate: new Date().toLocaleDateString('en-CA'),
            status: c.status === 'Assigned' ? 'Assigned' : c.status,
          };
        }
        return c;
      })
    );

    logAudit(
      'ASSIGN_WORK',
      'Assignment',
      installerId,
      `Assigned ${consumerNumbers.length} consumer(s) to ${installer.name}.`
    );
  };

  // ---------- Villages and who may work in them (office only) ----------
  const stamp = () => new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  const namesOf = (ids?: string[]) => {
    const list = (ids ?? []).map((id) => villages.find((v) => v.id === id)).filter(Boolean) as Village[];
    return list.length ? list.map(villageLabel).join(', ') : 'No villages';
  };

  const setInstallerVillages = (installerId: string, villageIds: string[]) => {
    const installer = users.find((u) => u.id === installerId);
    if (!installer) return;
    const ids = Array.from(new Set(villageIds)).filter((id) => villages.some((v) => v.id === id));
    setUsers((prev) =>
      prev.map((u) => (u.id === installerId ? { ...u, villageIds: ids, accessUpdatedBy: currentUser.name, accessUpdatedAt: stamp() } : u))
    );
    logAudit('SET_VILLAGE_ACCESS', 'User', installerId, `Villages of ${installer.name} changed by ${currentUser.name}.`, namesOf(installer.villageIds), namesOf(ids));
  };

  const saveVillage = (v: Omit<Village, 'id' | 'updatedBy' | 'updatedAt'> & { id?: string }) => {
    const before = v.id ? villages.find((x) => x.id === v.id) : undefined;
    const village: Village = {
      ...v,
      name: v.name.trim(),
      mandal: v.mandal?.trim() || undefined,
      district: v.district?.trim() || undefined,
      id: before?.id ?? `vil_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      updatedBy: currentUser.name,
      updatedAt: stamp(),
    };
    setVillages((prev) => [...prev.filter((x) => x.id !== village.id), village]);
    const where = (x?: Village) => (x ? `${villageLabel(x)}: ${x.latitude.toFixed(6)}, ${x.longitude.toFixed(6)} within ${x.radiusM} m` : 'None');
    logAudit(before ? 'UPDATE_VILLAGE' : 'ADD_VILLAGE', 'Village', village.id, `Village ${village.name} ${before ? 'changed' : 'added'} by ${currentUser.name}.`, where(before), where(village));
  };

  const addUser = (p: Pick<User, 'name' | 'username' | 'mobile' | 'role' | 'division'>): string | null => {
    if (currentUser.role !== 'Super Admin') return t('Only head office can add people.');
    const username = p.username.trim().toLowerCase();
    if (!p.name.trim()) return t('Enter the name.');
    if (!/^[a-z0-9._-]{3,30}$/.test(username)) return t('Username: 3 to 30 letters or numbers (dots, dashes allowed), no spaces.');
    if (users.some((u) => u.username.toLowerCase() === username)) return t('Username {name} is already taken.', { name: username });
    const person: User = {
      id: `usr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: p.name.trim(),
      username,
      mobile: p.mobile.trim(),
      role: p.role,
      division: p.division.trim(),
      district: '',
      status: 'Active',
      lastLogin: '',
      ...(p.role === 'Installer' ? { villageIds: [] } : {}),
    };
    setUsers((prev) => [...prev, person]);
    logAudit('ADD_USER', 'User', person.id, `${person.name} (${person.role}, username ${person.username}) added by ${currentUser.name}.`);
    return null;
  };

  const setUserStatus = (userId: string, status: User['status']) => {
    const u = users.find((x) => x.id === userId);
    if (!u || u.status === status || currentUser.role !== 'Super Admin' || userId === currentUser.id) return;
    setUsers((prev) => prev.map((x) => (x.id === userId ? { ...x, status } : x)));
    logAudit(status === 'Active' ? 'ENABLE_USER' : 'DISABLE_USER', 'User', userId, `${u.name} switched ${status === 'Active' ? 'on' : 'off'} by ${currentUser.name}.`, u.status, status);
  };

  const removeVillage = (id: string) => {
    const before = villages.find((v) => v.id === id);
    if (!before) return;
    const had = users.filter((u) => u.villageIds?.includes(id));
    setVillages((prev) => prev.filter((v) => v.id !== id));
    if (had.length) {
      setUsers((prev) =>
        prev.map((u) =>
          u.villageIds?.includes(id)
            ? { ...u, villageIds: u.villageIds.filter((x) => x !== id), accessUpdatedBy: currentUser.name, accessUpdatedAt: stamp() }
            : u
        )
      );
    }
    logAudit(
      'REMOVE_VILLAGE',
      'Village',
      id,
      `Village ${villageLabel(before)} removed by ${currentUser.name}.` + (had.length ? ` Taken away from: ${had.map((u) => u.name).join(', ')}.` : '')
    );
  };

  // DCR Reconciliation (FR-DCR-001 to 010)
  const reconcileDCRFile = (
    records: { ula: string; dcrNumber: string }[],
    fileName: string
  ): { matched: number; unmatched: number; conflicts: number } => {
    let matched = 0;
    let unmatched = 0;
    let conflicts = 0;

    const newDcrRecords: DCRRecord[] = [];
    const consumerUpdates: Record<string, string> = {};

    records.forEach((row) => {
      const cleanUla = row.ula.trim();
      const cleanDcr = row.dcrNumber.trim();
      const matchedConsumer = consumers.find((c) => c.ula.toUpperCase() === cleanUla.toUpperCase());

      if (!matchedConsumer) {
        unmatched++;
        newDcrRecords.push({
          id: `dcr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          ula: cleanUla,
          dcrNumber: cleanDcr,
          status: 'ULA Not Found',
          uploadedAt: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
          uploadedBy: currentUser.name,
          sourceFile: fileName,
          conflictDetails: `ULA ${cleanUla} was not found in consumer master records.`,
        });

        // Trigger exception in Action Required center
        const exc: ActionRequiredException = {
          id: `exc_${Date.now()}_dcr`,
          type: 'dcr_mismatch',
          title: `DCR ULA Not Found: ${cleanUla}`,
          division: 'All',
          village: 'Unmapped',
          detectedDate: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
          priority: 'High',
          assignedOwner: currentUser.name,
          status: 'Open',
          description: `DCR ${cleanDcr} cannot be mapped because ULA ${cleanUla} does not exist in master data.`,
        };
        setExceptions((prev) => [exc, ...prev]);
      } else {
        // Check if consumer already has a different DCR
        const existingInst = installations.find((i) => i.consumerNumber === matchedConsumer.consumerNumber);
        if (existingInst?.dcrNumber && existingInst.dcrNumber !== cleanDcr) {
          conflicts++;
          newDcrRecords.push({
            id: `dcr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            ula: cleanUla,
            dcrNumber: cleanDcr,
            consumerNumber: matchedConsumer.consumerNumber,
            consumerName: matchedConsumer.name,
            status: 'Existing Value Conflict',
            uploadedAt: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
            uploadedBy: currentUser.name,
            sourceFile: fileName,
            conflictDetails: `Existing DCR is ${existingInst.dcrNumber}, new file has ${cleanDcr}.`,
          });
        } else {
          matched++;
          consumerUpdates[matchedConsumer.consumerNumber] = cleanDcr;
          newDcrRecords.push({
            id: `dcr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            ula: cleanUla,
            dcrNumber: cleanDcr,
            consumerNumber: matchedConsumer.consumerNumber,
            consumerName: matchedConsumer.name,
            status: 'Matched',
            uploadedAt: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
            uploadedBy: currentUser.name,
            sourceFile: fileName,
          });
        }
      }
    });

    // Update DCR records
    setDcrRecords((prev) => [...newDcrRecords, ...prev]);

    // Update installations with matched DCR
    setInstallations((prev) =>
      prev.map((inst) => {
        if (consumerUpdates[inst.consumerNumber]) {
          return {
            ...inst,
            dcrNumber: consumerUpdates[inst.consumerNumber],
            dcrStatus: 'Matched',
          };
        }
        return inst;
      })
    );

    logAudit(
      'DCR_RECONCILIATION',
      'DCR',
      fileName,
      `DCR file ${fileName} processed: ${matched} matched, ${unmatched} unmatched ULA, ${conflicts} conflicts.`
    );

    return { matched, unmatched, conflicts };
  };

  // Service Tickets (FR-SVC-001 to 008)
  const createServiceTicket = (
    ticketData: Omit<ServiceTicket, 'id' | 'ticketNumber' | 'createdAt' | 'visitPhotos'>
  ) => {
    const newTicket: ServiceTicket = {
      ...ticketData,
      id: `st_${Date.now()}`,
      ticketNumber: `SRV-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
      visitPhotos: [],
    };

    setServiceTickets((prev) => [newTicket, ...prev]);
    logAudit(
      'CREATE_SERVICE_TICKET',
      'ServiceTicket',
      newTicket.ticketNumber,
      `Created ticket ${newTicket.ticketNumber} for ${newTicket.consumerNumber} (${newTicket.issueCategory})`
    );
  };

  const updateServiceTicketStatus = (
    ticketId: string,
    status: ServiceTicket['status'],
    notes?: string,
    photos?: string[]
  ) => {
    setServiceTickets((prev) =>
      prev.map((t) => {
        if (t.id === ticketId) {
          return {
            ...t,
            status,
            visitNotes: notes || t.visitNotes,
            visitPhotos: photos ? [...t.visitPhotos, ...photos] : t.visitPhotos,
            closedAt: status === 'Closed' || status === 'Resolved' ? new Date().toLocaleString('en-IN') : undefined,
          };
        }
        return t;
      })
    );

    logAudit(
      'UPDATE_SERVICE_TICKET',
      'ServiceTicket',
      ticketId,
      `Ticket status updated to ${status}. Notes: ${notes || 'N/A'}`
    );
  };

  // Exceptions (FR-EXC-001 to 003)
  const resolveException = (exceptionId: string, resolutionNote: string) => {
    const timestamp = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
    setExceptions((prev) =>
      prev.map((e) =>
        e.id === exceptionId
          ? {
              ...e,
              status: 'Resolved',
              resolutionNote,
              resolvedAt: timestamp,
              resolvedBy: currentUser.name,
            }
          : e
      )
    );

    logAudit('RESOLVE_EXCEPTION', 'Installation', exceptionId, `Resolved exception: ${resolutionNote}`);
  };

  const dismissException = (exceptionId: string, reason: string) => {
    setExceptions((prev) =>
      prev.map((e) =>
        e.id === exceptionId
          ? {
              ...e,
              status: 'Dismissed',
              resolutionNote: `Dismissed: ${reason}`,
            }
          : e
      )
    );

    logAudit('DISMISS_EXCEPTION', 'Installation', exceptionId, `Dismissed exception: ${reason}`);
  };

  const approveInstallation = (installationId: string, notes?: string) => {
    const timestamp = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
    setInstallations((prev) =>
      prev.map((i) =>
        i.id === installationId
          ? {
              ...i,
              status: 'Completed',
              officeApprovalStatus: 'Approved',
              approvedBy: currentUser.name,
              approvedAt: timestamp,
              officeApprovalNotes: notes,
            }
          : i
      )
    );

    const inst = installations.find((i) => i.id === installationId);
    if (inst) {
      setConsumers((prev) =>
        prev.map((c) => (c.consumerNumber === inst.consumerNumber ? { ...c, status: 'Completed' } : c))
      );
    }

    logAudit('APPROVE_INSTALLATION', 'Installation', installationId, `Approved by ${currentUser.name}. Notes: ${notes || 'None'}`);
  };

  const rejectInstallation = (installationId: string, notes: string) => {
    setInstallations((prev) =>
      prev.map((i) =>
        i.id === installationId
          ? {
              ...i,
              status: 'Needs Review',
              officeApprovalStatus: 'Rejected',
              officeApprovalNotes: notes,
            }
          : i
      )
    );

    // Put the job back in the installer's list
    const rejected = installations.find((i) => i.id === installationId);
    if (rejected) {
      setConsumers((prev) =>
        prev.map((c) => (c.consumerNumber === rejected.consumerNumber ? { ...c, status: 'Needs Review' } : c))
      );
    }

    logAudit('REJECT_INSTALLATION', 'Installation', installationId, `Rejected by ${currentUser.name}. Reason: ${notes}`);
  };

  // Manual serial entry (camera/label damaged) must be recorded for audit (FR-INST-017)
  const recordManualSerial = (serial: string, reason: string) => {
    setInstallerDraft((prev) => {
      if (!prev) return prev;
      const prevReason = prev.manualSerialReason ? `${prev.manualSerialReason}; ` : '';
      return { ...prev, manualSerialUsed: true, manualSerialReason: `${prevReason}${serial}: ${reason}` };
    });
    logAudit(
      'MANUAL_SERIAL_ENTRY',
      'Installation',
      installerDraft?.id || 'unknown',
      `Serial ${serial} typed manually for ${installerDraft?.consumerNumber || 'unknown consumer'}. Reason: ${reason}`
    );
  };

  // ---------- Site survey ----------
  const updateSurveyDraft = (consumerNumber: string, change: (s: SiteSurvey) => SiteSurvey) => {
    const consumer = consumers.find((c) => c.consumerNumber === consumerNumber);
    if (currentUser.role === 'Installer' && consumer?.assignedInstallerId !== currentUser.id) return;
    setSurveys((prev) => {
      const existing = prev.find((s) => s.consumerNumber === consumerNumber);
      if (existing?.status === 'Submitted') return prev; // sent surveys cannot be changed
      const base: SiteSurvey = existing ?? {
        id: `svy_${Date.now()}`,
        consumerNumber,
        surveyorId: currentUser.id,
        surveyorName: currentUser.name,
        status: 'Draft',
        startedAt: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
        roofPhotos: [],
        shadeSources: [],
        surroundingsPhotos: [],
      };
      return [change(base), ...prev.filter((s) => s.consumerNumber !== consumerNumber)];
    });
  };

  const submitSurvey = (consumerNumber: string): { success: boolean; message: string } => {
    const survey = surveys.find((s) => s.consumerNumber === consumerNumber);
    if (!survey) return { success: false, message: t('Survey not started') };
    if (survey.status === 'Submitted') return { success: false, message: t('This survey was already sent.') };
    const missing = surveyMissing(survey, t);
    if (missing.length) return { success: false, message: t('Please finish: {list}', { list: missing.join(', ') }) };

    const timestamp = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
    const consumer = consumers.find((c) => c.consumerNumber === consumerNumber);
    setSurveys((prev) =>
      prev.map((s) => (s.consumerNumber === consumerNumber ? { ...s, status: 'Submitted', submittedAt: timestamp } : s))
    );

    const feasible = survey.decision === 'Feasible';
    const shade =
      survey.shadeLevel === 'None' ? 'no shade' : `${survey.shadeLevel?.toLowerCase()} shade (${survey.shadeSources.join(', ')})`;
    logAudit(
      'SUBMIT_SURVEY',
      'Consumer',
      consumerNumber,
      `Site survey: ${feasible ? 'FEASIBLE' : 'NOT FEASIBLE'}. Roof: ${survey.roofType}, ${shade}.` +
        (survey.decisionNote?.trim() ? ` Note: ${survey.decisionNote.trim()}` : ''),
      undefined,
      survey.decision
    );

    if (!feasible) {
      // Let the office know so they can call the consumer
      const exc: ActionRequiredException = {
        id: `exc_${Date.now()}_svy`,
        type: 'site_not_feasible',
        title: `Site not feasible: ${consumerNumber}`,
        consumerNumber,
        division: consumer?.division || 'Unknown',
        village: consumer?.village || 'Unknown',
        detectedDate: timestamp,
        priority: 'Medium',
        assignedOwner: 'Office',
        status: 'Open',
        description: `${currentUser.name} surveyed the site and marked it not feasible. Roof: ${survey.roofType}, ${shade}. Reason: ${survey.decisionNote?.trim()}`,
      };
      setExceptions((prev) => [exc, ...prev]);
    }

    return {
      success: true,
      message: feasible
        ? t('Survey sent. This home is now ready for installation.')
        : t('Survey sent. The office has been told this home is not feasible.'),
    };
  };

  const updateConsumerMobile = (consumerNumber: string, newMobile: string): { success: boolean; message: string } => {
    const consumer = consumers.find((c) => c.consumerNumber === consumerNumber);
    if (!consumer) return { success: false, message: t('Consumer not found.') };
    const mobile = normalizeMobile(newMobile);
    if (!mobile) return { success: false, message: t('Please enter a valid 10-digit mobile number (starting with 6, 7, 8 or 9).') };
    if (sameMobile(mobile, consumer.mobile)) return { success: false, message: t('This is the same as the current number.') };

    const original = consumer.previousMobile ?? consumer.mobile;
    const backToOriginal = sameMobile(mobile, original);
    const timestamp = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
    setConsumers((prev) =>
      prev.map((c) =>
        c.consumerNumber !== consumerNumber
          ? c
          : backToOriginal
          ? { ...c, mobile: original, previousMobile: undefined, mobileUpdatedBy: undefined, mobileUpdatedAt: undefined }
          : { ...c, mobile, previousMobile: original, mobileUpdatedBy: currentUser.name, mobileUpdatedAt: timestamp }
      )
    );
    logAudit(
      'UPDATE_MOBILE',
      'Consumer',
      consumerNumber,
      `Mobile number changed by ${currentUser.name} from ${consumer.mobile} to ${mobile}.`,
      consumer.mobile,
      mobile
    );
    return { success: true, message: t('Mobile number updated.') };
  };

  const reopenSurvey = (consumerNumber: string, reason: string): { success: boolean; message: string } => {
    if (currentUser.role !== 'Admin' && currentUser.role !== 'Super Admin')
      return { success: false, message: t('Only office staff can reopen a survey.') };
    if (!reason.trim()) return { success: false, message: t('Please write why the survey is being reopened.') };
    const survey = surveys.find((s) => s.consumerNumber === consumerNumber);
    const consumer = consumers.find((c) => c.consumerNumber === consumerNumber);
    const blocker = reopenBlocker(survey, consumer, installations, t);
    if (blocker || !survey) return { success: false, message: blocker || t('Survey not started') };

    const timestamp = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
    // Photos and roof details are kept; the installer must decide again
    setSurveys((prev) =>
      prev.map((s) =>
        s.consumerNumber === consumerNumber
          ? {
              ...s,
              status: 'Draft',
              submittedAt: undefined,
              decision: undefined,
              decisionNote: undefined,
              reopenedBy: currentUser.name,
              reopenedAt: timestamp,
              reopenNote: reason.trim(),
            }
          : s
      )
    );

    // A "not feasible" problem for this home is no longer open
    setExceptions((prev) =>
      prev.map((e) =>
        e.type === 'site_not_feasible' && e.consumerNumber === consumerNumber && (e.status === 'Open' || e.status === 'In Progress')
          ? { ...e, status: 'Resolved', resolutionNote: `Survey reopened: ${reason.trim()}`, resolvedAt: timestamp, resolvedBy: currentUser.name }
          : e
      )
    );

    logAudit(
      'REOPEN_SURVEY',
      'Consumer',
      consumerNumber,
      `Site survey reopened by ${currentUser.name}. Previous decision: ${survey.decision}.`,
      survey.decision,
      'Reopened',
      reason.trim()
    );

    return { success: true, message: t('Survey reopened. It is back on the installer\'s Site Survey list.') };
  };

  // ---------- Database sync ----------
  const { syncState, reloadAfterReset } = useServerSync({
    collections: {
      users,
      consumers,
      inventory,
      installations,
      dcrRecords,
      serviceTickets,
      exceptions,
      auditLogs,
      surveys,
      villages,
    } as unknown as AllData,
    setters: {
      users: setUsers,
      consumers: setConsumers,
      inventory: setInventory,
      installations: setInstallations,
      dcrRecords: setDcrRecords,
      serviceTickets: setServiceTickets,
      exceptions: setExceptions,
      auditLogs: setAuditLogs,
      surveys: setSurveys,
      villages: setVillages,
    } as unknown as Record<CollectionKey, (rows: DbRecord[]) => void>,
    paused: !isOnline,
    onSignedOut: signedOutByServer,
    onRefused: (r) => setRefusedChanges((prev) => [...prev, ...r]),
  });

  // Try failed photo uploads again now and then
  const [photoRetryTick, setPhotoRetryTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setPhotoRetryTick((n) => n + 1), 20000);
    return () => clearInterval(id);
  }, []);

  // Photos are first kept on the phone. Send each one to photo storage and keep only its link.
  const uploading = useRef(new Set<string>());
  const refused = useRef(new Set<string>()); // the server will never take these; do not keep retrying
  useEffect(() => {
    if (!isOnline || syncState === 'loading') return;
    type Job = { id: string; url: string; folder: 'surveys' | 'installations'; group: string; geo?: GeoTag };
    const jobs: Job[] = [];
    for (const s of surveys) {
      for (const p of [s.billPhoto, s.aadhaarPhoto, ...s.roofPhotos, ...s.surroundingsPhotos]) {
        if (p) jobs.push({ id: p.id, url: p.url, folder: 'surveys', group: s.consumerNumber, geo: p.geo });
      }
    }
    for (const inst of [...(installerDraft ? [installerDraft] : []), ...installations]) {
      for (const p of Object.values(inst.photos || {})) {
        if (p) jobs.push({ id: p.id, url: p.url, folder: 'installations', group: inst.consumerNumber, geo: p.geo });
      }
    }
    for (const job of jobs) {
      if (!job.url.startsWith('data:') || uploading.current.has(job.id) || refused.current.has(job.id)) continue;
      // A photo without a full location is never sent; the screens ask for it to be taken again
      const g = job.geo;
      if (!g || typeof g.takenAt !== 'number' || typeof g.clockChecked !== 'boolean') continue;
      uploading.current.add(job.id);
      void uploadPhoto(job.url, job.group, job.folder, {
        latitude: g.latitude,
        longitude: g.longitude,
        accuracy: g.accuracy,
        takenAt: g.takenAt,
        clockChecked: g.clockChecked,
      }).then((result) => {
        if (result && 'refused' in result) {
          console.warn('Photo refused by the server:', result.refused);
          refused.current.add(job.id);
        }
        const link = result && 'url' in result ? result.url : null;
        if (link) {
          // Swap the photo for its link wherever it is, if it has not been replaced meanwhile
          const swap = <P extends { id: string; url: string }>(x: P | undefined): P | undefined =>
            x && x.id === job.id && x.url === job.url ? { ...x, url: link } : x;
          const swapAll = <P extends { id: string; url: string }>(list: P[]) => list.map((x) => swap(x)!);
          const swapInst = (i: Installation): Installation => {
            const photos = { ...i.photos };
            for (const k of Object.keys(photos) as PhotoCategory[]) photos[k] = swap(photos[k]);
            return { ...i, photos };
          };
          if (job.folder === 'surveys') {
            setSurveys((prev) =>
              prev.map((sv) =>
                sv.consumerNumber !== job.group
                  ? sv
                  : {
                      ...sv,
                      billPhoto: swap(sv.billPhoto),
                      aadhaarPhoto: swap(sv.aadhaarPhoto),
                      roofPhotos: swapAll(sv.roofPhotos),
                      surroundingsPhotos: swapAll(sv.surroundingsPhotos),
                    }
              )
            );
          } else {
            setInstallerDraft((prev) => (prev && prev.consumerNumber === job.group ? swapInst(prev) : prev));
            setInstallations((prev) => prev.map((i) => (i.consumerNumber === job.group ? swapInst(i) : i)));
          }
        }
        uploading.current.delete(job.id); // if it failed, the next change or retry tries again
      });
    }
  }, [surveys, installations, installerDraft, isOnline, syncState, photoRetryTick]);

  /** "Reset demo": put the sample data back in the database, then reload it */
  const resetAllData = async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/reset', { method: 'POST' });
      if (!res.ok) return false;
    } catch {
      return false;
    }
    setOfflineQueue([]);
    setInstallerDraft(null);
    setActiveStep(1);
    return reloadAfterReset();
  };

  return (
    <AppContext.Provider
      value={{
        users,
        currentUser,
        consumers,
        inventory,
        installations,
        dcrRecords,
        serviceTickets,
        exceptions,
        auditLogs,
        offlineQueue,
        isOnline,
        appMode,
        installerDraft,
        activeStep,
        selectedConsumerFor360,
        surveys,
        villages,
        refusedChanges,
        clearRefusedChanges: () => setRefusedChanges([]),
        storageFull: mainStorageFull || surveyStorageFull,
        syncState,
        signOut,
        setAppMode,
        setIsOnline,
        setSelectedConsumerFor360,
        startOrResumeInstallation,
        updateDraft,
        setDraftStep,
        scanPanel,
        scanInverter,
        addPhotoToDraft,
        removePhotoFromDraft,
        setGpsToDraft,
        submitInstallationDraft,
        syncOfflineQueue,
        retryOfflineQueueItem,
        uploadConsumers,
        uploadInventory,
        assignConsumersToInstaller,
        setInstallerVillages,
        saveVillage,
        removeVillage,
        addUser,
        setUserStatus,
        reconcileDCRFile,
        createServiceTicket,
        updateServiceTicketStatus,
        resolveException,
        dismissException,
        approveInstallation,
        rejectInstallation,
        recordManualSerial,
        logAudit,
        resetAllData,
        updateSurveyDraft,
        submitSurvey,
        reopenSurvey,
        updateConsumerMobile,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
