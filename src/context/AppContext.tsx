'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
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
} from '@/data/seedData';

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

  // Setters & Actions
  setCurrentUser: (user: User) => void;
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
  reconcileDCRFile: (records: { ula: string; dcrNumber: string }[], fileName: string) => { matched: number; unmatched: number; conflicts: number };
  createServiceTicket: (ticket: Omit<ServiceTicket, 'id' | 'ticketNumber' | 'createdAt' | 'visitPhotos'>) => void;
  updateServiceTicketStatus: (ticketId: string, status: ServiceTicket['status'], notes?: string, photos?: string[]) => void;
  resolveException: (exceptionId: string, resolutionNote: string) => void;
  dismissException: (exceptionId: string, reason: string) => void;
  approveInstallation: (installationId: string, notes?: string) => void;
  rejectInstallation: (installationId: string, notes: string) => void;
  logAudit: (action: string, recordType: AuditEvent['recordType'], recordId: string, details: string, oldValue?: string, newValue?: string, reason?: string) => void;
  resetAllData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY = 'SOLAR_TRACKER_DATA_V1';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>(SEED_USERS);
  const [currentUser, setCurrentUser] = useState<User>(SEED_USERS[0]); // Default Rajesh Varma (Super Admin)
  const [consumers, setConsumers] = useState<Consumer[]>(SEED_CONSUMERS);
  const [inventory, setInventory] = useState<EquipmentInventory[]>(SEED_INVENTORY);
  const [installations, setInstallations] = useState<Installation[]>(SEED_INSTALLATIONS);
  const [dcrRecords, setDcrRecords] = useState<DCRRecord[]>(SEED_DCR_RECORDS);
  const [serviceTickets, setServiceTickets] = useState<ServiceTicket[]>(SEED_SERVICE_TICKETS);
  const [exceptions, setExceptions] = useState<ActionRequiredException[]>(SEED_EXCEPTIONS);
  const [auditLogs, setAuditLogs] = useState<AuditEvent[]>(SEED_AUDIT_LOGS);
  const [offlineQueue, setOfflineQueue] = useState<OfflineSyncQueueItem[]>([]);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [appMode, setAppMode] = useState<'admin' | 'mobile' | 'split'>('admin');
  const [installerDraft, setInstallerDraft] = useState<Installation | null>(null);
  const [activeStep, setActiveStep] = useState<number>(1);
  const [selectedConsumerFor360, setSelectedConsumerFor360] = useState<Consumer | null>(null);

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
        if (parsed.offlineQueue) setOfflineQueue(parsed.offlineQueue);
      }
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
        offlineQueue,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    } catch {
      // quota or private mode
    }
  }, [users, consumers, inventory, installations, dcrRecords, serviceTickets, exceptions, auditLogs, offlineQueue]);

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

    // Check existing installation
    const existing = installations.find((i) => i.consumerNumber === consumerNumber);
    if (existing) {
      setInstallerDraft({ ...existing });
      // Determine resume step
      if (!existing.consumerConfirmed) setActiveStep(2);
      else if (existing.panels.some((p) => !p)) setActiveStep(3);
      else if (!existing.inverterSerial) setActiveStep(4);
      else if (Object.keys(existing.photos).length < 7) setActiveStep(5);
      else if (!existing.gps) setActiveStep(6);
      else setActiveStep(7);
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
    if (!cleanSerial) return { success: false, message: 'Please enter or scan a serial number.' };

    // Check if already in current draft at another index
    if (installerDraft?.panels.some((p, i) => i !== index && p.toUpperCase() === cleanSerial)) {
      return { success: false, message: `Panel serial ${cleanSerial} was already scanned for another slot in this installation!` };
    }

    // Check central inventory
    const invItem = inventory.find(
      (item) => item.type === 'panel' && item.serialNumber.toUpperCase() === cleanSerial
    );

    if (!invItem) {
      return {
        success: false,
        message: `Serial "${cleanSerial}" is NOT found in approved central inventory stock!`,
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
        message: `Serial ${cleanSerial} is ALREADY locked to consumer ${invItem.linkedConsumerNumber}! Duplicate scan blocked and logged.`,
        duplicateConsumer: invItem.linkedConsumerNumber,
      };
    }

    if (invItem.status === 'Damaged' || invItem.status === 'Quarantined') {
      return {
        success: false,
        message: `Serial ${cleanSerial} is marked as ${invItem.status} in warehouse. Please select another panel.`,
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
      message: `Panel ${index + 1} (${cleanSerial}) validated successfully: ${invItem.brand} ${invItem.model}`,
    };
  };

  const scanInverter = (serial: string): { success: boolean; message: string; duplicateConsumer?: string } => {
    const cleanSerial = serial.trim().toUpperCase();
    if (!cleanSerial) return { success: false, message: 'Please enter or scan an inverter serial number.' };

    const invItem = inventory.find(
      (item) => item.type === 'inverter' && item.serialNumber.toUpperCase() === cleanSerial
    );

    if (!invItem) {
      return {
        success: false,
        message: `Inverter serial "${cleanSerial}" is NOT found in approved central inventory stock!`,
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
        message: `Inverter ${cleanSerial} is ALREADY installed at ${invItem.linkedConsumerNumber}! Duplicate scan blocked.`,
        duplicateConsumer: invItem.linkedConsumerNumber,
      };
    }

    if (invItem.status === 'Damaged' || invItem.status === 'Quarantined') {
      return {
        success: false,
        message: `Inverter ${cleanSerial} is marked as ${invItem.status} in warehouse.`,
      };
    }

    if (installerDraft) {
      setInstallerDraft({ ...installerDraft, inverterSerial: cleanSerial });
    }

    return {
      success: true,
      message: `Inverter (${cleanSerial}) verified: ${invItem.brand} ${invItem.model}`,
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
    if (!installerDraft) return { success: false, isOffline: !isOnline, message: 'No draft found.' };

    const missingPhotos: string[] = [];
    const requiredCats: PhotoCategory[] = ['front', 'side', 'consumer', 'meter', 'inverter', 'structure', 'earthing'];
    requiredCats.forEach((c) => {
      if (!installerDraft.photos[c]) missingPhotos.push(c);
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

      logAudit(
        'OFFLINE_SAVE',
        'Installation',
        installerDraft.id,
        `Installation for ${installerDraft.consumerNumber} saved on local device (Offline Mode). Queued for server sync.`
      );

      return {
        success: true,
        isOffline: true,
        message: 'Saved on this device! Installation will synchronize automatically when internet connectivity returns.',
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

    logAudit(
      'SUBMIT_INSTALLATION',
      'Installation',
      updatedInst.id,
      `Installation for ${updatedInst.consumerNumber} received by server. 4 panels and 1 inverter locked.`
    );

    return {
      success: true,
      isOffline: false,
      message: 'Installation submitted and acknowledged by central server successfully!',
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

    logAudit('REJECT_INSTALLATION', 'Installation', installationId, `Rejected by ${currentUser.name}. Reason: ${notes}`);
  };

  const resetAllData = () => {
    setUsers(SEED_USERS);
    setCurrentUser(SEED_USERS[0]);
    setConsumers(SEED_CONSUMERS);
    setInventory(SEED_INVENTORY);
    setInstallations(SEED_INSTALLATIONS);
    setDcrRecords(SEED_DCR_RECORDS);
    setServiceTickets(SEED_SERVICE_TICKETS);
    setExceptions(SEED_EXCEPTIONS);
    setAuditLogs(SEED_AUDIT_LOGS);
    setOfflineQueue([]);
    setInstallerDraft(null);
    localStorage.removeItem(STORAGE_KEY);
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
        setCurrentUser,
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
        reconcileDCRFile,
        createServiceTicket,
        updateServiceTicketStatus,
        resolveException,
        dismissException,
        approveInstallation,
        rejectInstallation,
        logAudit,
        resetAllData,
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
