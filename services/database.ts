import { openDB, IDBPDatabase } from 'idb';
import { BusinessLead, AuditLogEntry } from '../types';

const DB_NAME = 'LeadGenDB';
const LEADS_STORE_NAME = 'leads';
const AUDIT_STORE_NAME = 'audit_logs';
const DB_VERSION = 2; // Increment the version to trigger the upgrade

let dbPromise: Promise<IDBPDatabase<unknown>> | null = null;

const initDB = () => {
  if (dbPromise) {
    return dbPromise;
  }
  dbPromise = openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      // Create leads store if it doesn't exist
      if (!db.objectStoreNames.contains(LEADS_STORE_NAME)) {
        db.createObjectStore(LEADS_STORE_NAME, { keyPath: 'id' });
      }
      // Create audit_logs store for version 2
      if (oldVersion < 2) {
         if (!db.objectStoreNames.contains(AUDIT_STORE_NAME)) {
            const auditStore = db.createObjectStore(AUDIT_STORE_NAME, { 
              keyPath: 'id', 
              autoIncrement: true 
            });
            // Create an index to sort by timestamp later
            auditStore.createIndex('timestamp', 'timestamp');
         }
      }
    },
  });
  return dbPromise;
};

// --- Lead Functions ---
export const addLead = async (lead: BusinessLead) => {
  const db = await initDB();
  await db.put(LEADS_STORE_NAME, lead);
};

export const getLeads = async (): Promise<BusinessLead[]> => {
  const db = await initDB();
  return db.getAll(LEADS_STORE_NAME);
};

export const clearLeads = async () => {
  const db = await initDB();
  await db.clear(LEADS_STORE_NAME);
};


// --- Audit Log Functions ---
export const addAuditLog = async (logEntry: Omit<AuditLogEntry, 'id'>) => {
    const db = await initDB();
    await db.add(AUDIT_STORE_NAME, logEntry);
};

export const getAuditLogs = async (): Promise<AuditLogEntry[]> => {
    const db = await initDB();
    const logs = await db.getAll(AUDIT_STORE_NAME);
    // Sort logs with the newest first
    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};
