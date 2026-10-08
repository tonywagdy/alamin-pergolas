/**
 * Local-First + Background Sync + Offline Queue Manager for Alamin Pergolas Gallery
 *
 * Architecture:
 * 1. IndexedDB: Permanent local storage for compressed image Blobs (prevents 5MB localStorage quota limit).
 * 2. LocalStorage: Lightweight metadata, sync queues, and ordering records.
 * 3. Background Sync Queue: Exponential backoff retries for Storage uploads, Firestore metadata, deletions, and activities.
 * 4. Coalescing: Rapid reorder actions are merged and debounced into a single cloud update.
 * 5. Deterministic Document IDs: Avoids duplicate records on network retries.
 * 6. Resilience: Quota errors (RESOURCE_EXHAUSTED) or offline states NEVER discard local data.
 */

import { Project, SyncStatus, ActivityLogItem } from '../types';

async function galleryBackend() {
  const [{ db }, firestore] = await Promise.all([import('../firebase'), import('firebase/firestore')]);
  return { db, ...firestore };
}

// ============================================================================
// 1. INDEXED_DB FOR BINARY BLOBS
// ============================================================================

const DB_NAME = 'AlaminStorageDB';
const DB_VERSION = 1;
const BLOB_STORE = 'gallery_blobs';

let dbInstance: IDBDatabase | null = null;
const blobUrlCache = new Map<string, string>();

function openIndexedDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this environment'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(BLOB_STORE)) {
        db.createObjectStore(BLOB_STORE, { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      console.warn('[Gallery] IndexedDB open error:', (event.target as IDBOpenDBRequest).error);
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

export async function saveLocalBlob(id: string, blob: Blob): Promise<void> {
  try {
    const idb = await openIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = idb.transaction(BLOB_STORE, 'readwrite');
      const store = tx.objectStore(BLOB_STORE);
      const req = store.put({ id, blob, mimeType: blob.type, createdAt: Date.now() });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[Gallery] Save blob notice:', err);
  }
}

export async function getLocalBlob(id: string): Promise<Blob | null> {
  try {
    const idb = await openIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = idb.transaction(BLOB_STORE, 'readonly');
      const store = tx.objectStore(BLOB_STORE);
      const req = store.get(id);
      req.onsuccess = () => {
        if (req.result && req.result.blob) {
          resolve(req.result.blob);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[Gallery] Get blob notice:', err);
    return null;
  }
}

export async function deleteLocalBlob(id: string): Promise<void> {
  try {
    // Revoke object URL from memory cache if present
    if (blobUrlCache.has(id)) {
      try {
        URL.revokeObjectURL(blobUrlCache.get(id)!);
      } catch (e) {}
      blobUrlCache.delete(id);
    }

    const idb = await openIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = idb.transaction(BLOB_STORE, 'readwrite');
      const store = tx.objectStore(BLOB_STORE);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[Gallery] Delete blob notice:', err);
  }
}

export async function getBlobUrl(id: string, directBlob?: Blob): Promise<string | null> {
  if (blobUrlCache.has(id)) {
    return blobUrlCache.get(id)!;
  }

  const blob = directBlob || await getLocalBlob(id);
  if (!blob) return null;

  try {
    const url = URL.createObjectURL(blob);
    blobUrlCache.set(id, url);
    return url;
  } catch (err) {
    console.warn('[Gallery] Create object URL error:', err);
    return null;
  }
}

// ============================================================================
// 2. METADATA & QUEUE STORAGE (LOCAL-FIRST)
// ============================================================================

export const STORAGE_KEYS = {
  GALLERY: 'alamin_local_gallery',
  ORDER: 'alamin_gallery_order',
  DELETED_STATIC: 'alamin_deleted_static_images',
  ACTIVITY_LOG: 'alamin_activity_log',
  UPLOAD_QUEUE: 'alamin_pending_uploads',
  DELETE_QUEUE: 'alamin_pending_deletes',
  REORDER_QUEUE: 'alamin_pending_reorder',
  ACTIVITY_QUEUE: 'alamin_pending_activities'
} as const;

export interface PendingUploadTask {
  id: string; // unique project id
  title: string;
  category: string;
  localBlobId: string;
  order: number;
  createdAt: string;
  retryCount: number;
  nextRetryTime: number;
  lastError?: string;
}

export interface PendingDeleteTask {
  id: string | number;
  isFirestore: boolean;
  storagePath?: string;
  retryCount: number;
  nextRetryTime: number;
  lastError?: string;
}

export interface PendingReorderTask {
  orderIds: string[];
  updatedAt: number;
  retryCount: number;
  nextRetryTime: number;
  lastError?: string;
}

export interface PendingActivityTask {
  id: string;
  type: 'leads' | 'gallery' | 'before_after';
  description: string;
  createdAt: string;
  retryCount: number;
  nextRetryTime: number;
  lastError?: string;
}

export interface SyncState {
  isSyncing: boolean;
  pendingCount: number;
  lastSyncTime?: number;
  lastError?: string;
}

// Exponential backoff schedule (in ms): 2s, 5s, 15s, 30s, 60s
const BACKOFF_SCHEDULE = [2000, 5000, 15000, 30000, 60000];

function getBackoffDelay(retryCount: number): number {
  const index = Math.min(Math.max(0, retryCount), BACKOFF_SCHEDULE.length - 1);
  return BACKOFF_SCHEDULE[index];
}

// ============================================================================
// 3. READ & WRITE LOCAL STORAGE SAFELY
// ============================================================================

export function getLocalGallery(): Project[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.GALLERY);
    if (!raw) return [];
    const list: Project[] = JSON.parse(raw);
    return list.map(item => {
      // Backward compatibility: default syncStatus
      let syncStatus: SyncStatus = item.syncStatus || 'synced';
      if (!item.syncStatus) {
        if (item.downloadUrl || (typeof item.image === 'string' && item.image.startsWith('http'))) {
          syncStatus = 'synced';
        } else if (item.localBlobId || String(item.id).startsWith('proj_') || String(item.id).startsWith('local_')) {
          syncStatus = 'pending';
        }
      }
      return {
        ...item,
        syncStatus,
        order: typeof item.order === 'number' ? item.order : 0
      };
    });
  } catch (err) {
    console.warn('[Gallery] Read local gallery notice:', err);
    return [];
  }
}

export function saveLocalGallery(projects: Project[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.GALLERY, JSON.stringify(projects));
  } catch (err) {
    // If browser localStorage quota (5MB) is reached, save metadata without heavy base64 strings
    try {
      const slim = projects.map(p => ({
        ...p,
        image: typeof p.image === 'string' && p.image.startsWith('data:') ? '' : p.image
      }));
      localStorage.setItem(STORAGE_KEYS.GALLERY, JSON.stringify(slim));
    } catch (e) {
      console.warn('[Gallery] LocalStorage quota fallback error:', e);
    }
  }
}

export function getLocalOrder(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ORDER);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalOrder(orderIds: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ORDER, JSON.stringify(orderIds));
  } catch (err) {
    console.warn('[Gallery] Save local order notice:', err);
  }
}

export function getLocalDeletedStaticIds(): number[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DELETED_STATIC);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalDeletedStaticIds(ids: number[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.DELETED_STATIC, JSON.stringify(ids));
  } catch (err) {
    console.warn('[Gallery] Save local deleted static IDs notice:', err);
  }
}

export function getLocalActivities(): ActivityLogItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ACTIVITY_LOG);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalActivities(activities: ActivityLogItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ACTIVITY_LOG, JSON.stringify(activities.slice(0, 100)));
  } catch (err) {
    console.warn('[Gallery] Save local activities notice:', err);
  }
}

// Queue helpers
function getUploadQueue(): PendingUploadTask[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.UPLOAD_QUEUE);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveUploadQueue(queue: PendingUploadTask[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.UPLOAD_QUEUE, JSON.stringify(queue));
  } catch (e) {}
}

function getDeleteQueue(): PendingDeleteTask[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DELETE_QUEUE);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveDeleteQueue(queue: PendingDeleteTask[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.DELETE_QUEUE, JSON.stringify(queue));
  } catch (e) {}
}

function getReorderQueue(): PendingReorderTask | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.REORDER_QUEUE);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveReorderQueue(task: PendingReorderTask | null): void {
  try {
    if (task) {
      localStorage.setItem(STORAGE_KEYS.REORDER_QUEUE, JSON.stringify(task));
    } else {
      localStorage.removeItem(STORAGE_KEYS.REORDER_QUEUE);
    }
  } catch (e) {}
}

function getActivityQueue(): PendingActivityTask[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ACTIVITY_QUEUE);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveActivityQueue(queue: PendingActivityTask[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ACTIVITY_QUEUE, JSON.stringify(queue));
  } catch (e) {}
}

// ============================================================================
// 4. IMAGE RESOLVER (Restores live Object URLs from IndexedDB)
// ============================================================================

export async function resolveProjectImage(project: Project): Promise<string> {
  // 1. If it's a permanent HTTP/HTTPS URL, return it directly
  if (typeof project.image === 'string' && (project.image.startsWith('http://') || project.image.startsWith('https://') || project.image.startsWith('./') || project.image.startsWith('/'))) {
    return project.image;
  }
  if (project.downloadUrl && (project.downloadUrl.startsWith('http://') || project.downloadUrl.startsWith('https://'))) {
    return project.downloadUrl;
  }

  // 2. If image is a dataUrl with content, return it directly
  if (typeof project.image === 'string' && project.image.startsWith('data:') && project.image.length > 50) {
    return project.image;
  }

  // 3. ALWAYS check IndexedDB by localBlobId or id (prevents broken black boxes)
  const blobId = project.localBlobId || (typeof project.id === 'string' ? project.id : null);
  if (blobId) {
    const resolved = await getBlobUrl(blobId);
    if (resolved) return resolved;
  }

  return project.image || '';
}

export async function resolveProjectsImages(projects: Project[]): Promise<Project[]> {
  return Promise.all(
    projects.map(async (p) => {
      const liveImage = await resolveProjectImage(p);
      return {
        ...p,
        image: liveImage || p.image
      };
    })
  );
}

// ============================================================================
// 5. EVENT LISTENERS & STATE SUBSCRIPTIONS
// ============================================================================

type SyncCallback = (state: SyncState) => void;
type GalleryUpdateCallback = (projects: Project[]) => void;

const syncListeners = new Set<SyncCallback>();
const galleryListeners = new Set<GalleryUpdateCallback>();

export function subscribeToSyncState(cb: SyncCallback): () => void {
  syncListeners.add(cb);
  cb(getCurrentSyncState());
  return () => syncListeners.delete(cb);
}

export function subscribeToGalleryUpdates(cb: GalleryUpdateCallback): () => void {
  galleryListeners.add(cb);
  return () => galleryListeners.delete(cb);
}

function notifySyncListeners() {
  const state = getCurrentSyncState();
  syncListeners.forEach(cb => {
    try { cb(state); } catch (e) {}
  });
}

function notifyGalleryListeners(projects: Project[]) {
  galleryListeners.forEach(cb => {
    try { cb(projects); } catch (e) {}
  });
}

let isSyncRunning = false;
let lastSyncTime: number | undefined;
let lastSyncError: string | undefined;

export function getCurrentSyncState(): SyncState {
  const uploads = getUploadQueue().length;
  const deletes = getDeleteQueue().length;
  const reorder = getReorderQueue() ? 1 : 0;
  const activities = getActivityQueue().length;
  const pendingCount = uploads + deletes + reorder + activities;

  return {
    isSyncing: isSyncRunning,
    pendingCount,
    lastSyncTime,
    lastError: lastSyncError
  };
}

// ============================================================================
// 6. PUBLIC OPERATIONS (LOCAL-FIRST APIS)
// ============================================================================

/**
 * 1. Enqueue New Upload (Local-First):
 * Saves compressed Blob into IndexedDB immediately, updates React UI state & localStorage,
 * and queues the background upload to Firebase Storage and Firestore.
 */
export async function enqueueNewUpload(params: {
  title: string;
  category: string;
  blob: Blob;
  order?: number;
}): Promise<Project> {
  const { db, doc, setDoc, serverTimestamp } = await galleryBackend();
  const localId = 'proj_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);

  // 1. Save compressed Blob to IndexedDB as permanent local backup
  await saveLocalBlob(localId, params.blob);
  console.log('[Gallery] Local save completed in IndexedDB for blob:', localId);

  // 2. Convert blob to high-efficiency Data URL
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(params.blob);
  });

  // 3. Construct local project item
  const newProject: Project = {
    id: localId,
    title: params.title.trim(),
    category: params.category,
    image: dataUrl,
    localBlobId: localId,
    isFirestore: true,
    syncStatus: 'uploading',
    order: typeof params.order === 'number' ? params.order : 0,
    createdAt: new Date().toISOString(),
    retryCount: 0
  };

  // 4. Update local gallery list and ordering immediately for 0ms UI response
  const currentList = getLocalGallery();
  const updatedList = [newProject, ...currentList.filter(p => p.id !== localId)];
  saveLocalGallery(updatedList);
  notifyGalleryListeners(updatedList);

  const currentOrder = getLocalOrder();
  saveLocalOrder([localId, ...currentOrder.filter(id => id !== localId)]);

  // 5. Save directly to Firestore collection 'gallery'
  try {
    await setDoc(doc(db, 'gallery', localId), {
      title: params.title.trim(),
      category: params.category,
      image: dataUrl,
      order: newProject.order || 0,
      createdAt: serverTimestamp()
    });

    newProject.syncStatus = 'synced';
    const syncedList = getLocalGallery().map(p => p.id === localId ? { ...p, syncStatus: 'synced' as SyncStatus } : p);
    saveLocalGallery(syncedList);
    notifyGalleryListeners(syncedList);
    console.log('[Gallery] Direct upload to Firestore succeeded for:', localId);
  } catch (cloudErr: any) {
    console.warn('[Gallery] Direct upload failed, keeping in offline retry queue:', cloudErr);
    newProject.syncStatus = 'pending';
    const uploadTask: PendingUploadTask = {
      id: localId,
      title: params.title.trim(),
      category: params.category,
      localBlobId: localId,
      order: newProject.order || 0,
      createdAt: newProject.createdAt,
      retryCount: 0,
      nextRetryTime: Date.now() + 5000
    };
    saveUploadQueue([uploadTask, ...getUploadQueue().filter(t => t.id !== localId)]);
    notifySyncListeners();
  }

  // 7. Log activity
  enqueueLocalActivity('gallery', `إضافة مشروع جديد للمعرض: "${params.title.trim()}" في تصنيف "${params.category}"`);

  return newProject;
}

/**
 * 2. Enqueue Reorder (Local-First + Coalescing):
 * Instantly updates local state and coalesces rapid drag events into a single sync request.
 */
let reorderDebounceTimer: any = null;

export function enqueueReorder(orderIds: string[]): void {
  // 1. Immediately update localStorage order
  saveLocalOrder(orderIds);

  // 2. Coalescing: replace any pending reorder task with the latest orderIds
  saveReorderQueue({
    orderIds,
    updatedAt: Date.now(),
    retryCount: 0,
    nextRetryTime: Date.now()
  });

  notifySyncListeners();

  // 3. Debounce cloud update to prevent Firestore quota exhaustion during rapid dragging
  if (reorderDebounceTimer) clearTimeout(reorderDebounceTimer);
  reorderDebounceTimer = setTimeout(() => {
    runSyncQueue();
  }, 1500);
}

/**
 * 3. Enqueue Deletion (Local-First):
 * Instantly removes item from local state and queues deletion from Firebase Storage & Firestore.
 */
export async function enqueueDelete(
  id: string | number,
  isFirestore?: boolean,
  storagePath?: string
): Promise<void> {
  const idStr = String(id);

  // 1. Remove from local gallery
  const currentList = getLocalGallery();
  const target = currentList.find(p => String(p.id) === idStr);
  const updatedList = currentList.filter(p => String(p.id) !== idStr);
  saveLocalGallery(updatedList);

  // 2. Remove from local order
  const currentOrder = getLocalOrder();
  const updatedOrder = currentOrder.filter(oid => oid !== idStr);
  saveLocalOrder(updatedOrder);

  // 3. If it's a static image, record in deleted static images
  if (!isFirestore) {
    const deletedStatic = getLocalDeletedStaticIds();
    if (!deletedStatic.includes(Number(id))) {
      saveLocalDeletedStaticIds([...deletedStatic, Number(id)]);
    }
  }

  // 4. Delete local blob from IndexedDB
  if (target?.localBlobId) {
    deleteLocalBlob(target.localBlobId);
  } else if (idStr.startsWith('proj_') || idStr.startsWith('local_')) {
    deleteLocalBlob(idStr);
  }

  // 5. Remove from upload queue if it was pending
  const uploadQueue = getUploadQueue().filter(t => t.id !== idStr);
  saveUploadQueue(uploadQueue);

  // 6. Enqueue cloud deletion task
  const deleteQueue = getDeleteQueue();
  if (!deleteQueue.some(t => String(t.id) === idStr)) {
    saveDeleteQueue([
      ...deleteQueue,
      {
        id,
        isFirestore: !!isFirestore,
        storagePath: storagePath || target?.firebaseStoragePath,
        retryCount: 0,
        nextRetryTime: Date.now()
      }
    ]);
  }

  // 7. Enqueue reorder update with new list
  enqueueReorder(updatedOrder);

  // 8. Log activity locally
  enqueueLocalActivity('gallery', `حذف مشروع من المعرض: "${target?.title || id}"`);

  notifyGalleryListeners(updatedList);
  notifySyncListeners();

  setTimeout(() => {
    runSyncQueue();
  }, 200);
}

/**
 * 4. Enqueue Local Activity Log (Local-First):
 */
export function enqueueLocalActivity(
  type: 'leads' | 'gallery' | 'before_after',
  description: string
): ActivityLogItem {
  const id = 'act_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const newItem: ActivityLogItem = {
    id,
    type,
    description,
    createdAt: new Date().toISOString(),
    syncStatus: 'pending'
  };

  // Save to local activities
  const list = getLocalActivities();
  saveLocalActivities([newItem, ...list]);

  // Enqueue cloud write
  const queue = getActivityQueue();
  saveActivityQueue([
    ...queue,
    {
      id,
      type,
      description,
      createdAt: newItem.createdAt,
      retryCount: 0,
      nextRetryTime: Date.now()
    }
  ]);

  notifySyncListeners();

  setTimeout(() => {
    runSyncQueue();
  }, 500);

  return newItem;
}

// ============================================================================
// 7. BACKGROUND SYNC WORKER
// ============================================================================

export async function runSyncQueue(force: boolean = false): Promise<void> {
  if (force) {
    isSyncRunning = false;
  } else if (isSyncRunning) {
    return;
  }
  isSyncRunning = true;
  notifySyncListeners();

  console.log('[Gallery] Sync started (force = ' + force + ')');

  try {
    const { db, doc, setDoc, deleteDoc, serverTimestamp } = await galleryBackend();
    // -------------------------------------------------------------
    // A. Process Pending Uploads
    // -------------------------------------------------------------
    const uploadQueue = getUploadQueue();
    const remainingUploads: PendingUploadTask[] = [];

    for (const task of uploadQueue) {
      if (!force && Date.now() < task.nextRetryTime) {
        remainingUploads.push(task);
        continue;
      }

      console.log(`[Gallery] Uploading task: ${task.id} (attempt #${task.retryCount + 1})`);

      try {
        // Mark as uploading in local gallery
        const currentGallery = getLocalGallery();
        const updatedWithUploading = currentGallery.map(p =>
          p.id === task.id ? { ...p, syncStatus: 'uploading' as SyncStatus } : p
        );
        saveLocalGallery(updatedWithUploading);
        notifyGalleryListeners(updatedWithUploading);

        // Get blob from IndexedDB or retrieve existing data URL
        let dataUrl = '';
        const blob = await getLocalBlob(task.localBlobId);
        if (blob) {
          dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } else {
          const found = currentGallery.find(p => p.id === task.id);
          if (found && found.image && (found.image.startsWith('data:') || found.image.startsWith('http'))) {
            dataUrl = found.image;
          }
        }

        if (!dataUrl) {
          throw new Error('لم يتم العثور على بيانات الصورة في المتصفح');
        }

        // Write directly to Firestore collection 'gallery'
        await setDoc(doc(db, 'gallery', task.id), {
          title: task.title,
          category: task.category,
          image: dataUrl,
          order: typeof task.order === 'number' ? task.order : 0,
          createdAt: serverTimestamp()
        }, { merge: true });

        // Success! Update local gallery item to 'synced'
        const syncedGallery = getLocalGallery().map(p => {
          if (p.id === task.id) {
            return {
              ...p,
              image: dataUrl,
              syncStatus: 'synced' as SyncStatus,
              retryCount: 0,
              lastError: undefined
            };
          }
          return p;
        });
        saveLocalGallery(syncedGallery);
        notifyGalleryListeners(syncedGallery);

        console.log(`[Gallery] Cloud sync succeeded for project: ${task.id}`);
      } catch (err: any) {
        const errorMsg = err?.message || 'Firestore sync error';
        console.warn(`[Gallery] Upload retry failed for ${task.id}:`, errorMsg);
        lastSyncError = errorMsg;

        const newRetryCount = task.retryCount + 1;
        const backoffMs = getBackoffDelay(newRetryCount);
        const nextRetry = Date.now() + (force ? 0 : backoffMs);

        const newStatus: SyncStatus = newRetryCount >= 5 ? 'failed' : 'pending';

        const updatedGallery = getLocalGallery().map(p => {
          if (p.id === task.id) {
            return {
              ...p,
              syncStatus: newStatus,
              retryCount: newRetryCount,
              lastError: errorMsg
            };
          }
          return p;
        });
        saveLocalGallery(updatedGallery);
        notifyGalleryListeners(updatedGallery);

        remainingUploads.push({
          ...task,
          retryCount: newRetryCount,
          nextRetryTime: nextRetry,
          lastError: errorMsg
        });
      }
    }

    saveUploadQueue(remainingUploads);

    // -------------------------------------------------------------
    // B. Process Pending Reorder
    // -------------------------------------------------------------
    const pendingReorder = getReorderQueue();
    if (pendingReorder && Date.now() >= pendingReorder.nextRetryTime) {
      try {
        await setDoc(doc(db, 'gallery_order', 'main'), {
          orderIds: pendingReorder.orderIds,
          updatedAt: serverTimestamp()
        }, { merge: true });

        saveReorderQueue(null);
        console.log('[Gallery] Reorder synced successfully');
      } catch (err: any) {
        console.warn('[Gallery] Reorder sync deferred:', err?.message);
        const newRetry = pendingReorder.retryCount + 1;
        saveReorderQueue({
          ...pendingReorder,
          retryCount: newRetry,
          nextRetryTime: Date.now() + getBackoffDelay(newRetry),
          lastError: err?.message
        });
      }
    }

    // -------------------------------------------------------------
    // C. Process Pending Deletions
    // -------------------------------------------------------------
    const deleteQueue = getDeleteQueue();
    const remainingDeletes: PendingDeleteTask[] = [];

    for (const task of deleteQueue) {
      if (Date.now() < task.nextRetryTime) {
        remainingDeletes.push(task);
        continue;
      }

      try {
        if (task.isFirestore) {
          await deleteDoc(doc(db, 'gallery', String(task.id)));
        } else {
          await setDoc(doc(db, 'deleted_static_images', String(task.id)), {
            deleted: true,
            deletedAt: serverTimestamp()
          }, { merge: true });
        }
        console.log('[Gallery] Delete synced for item:', task.id);
      } catch (err: any) {
        console.warn(`[Gallery] Delete failed for ${task.id}:`, err?.message);
        const newRetry = task.retryCount + 1;
        remainingDeletes.push({
          ...task,
          retryCount: newRetry,
          nextRetryTime: Date.now() + getBackoffDelay(newRetry),
          lastError: err?.message
        });
      }
    }

    saveDeleteQueue(remainingDeletes);

    // -------------------------------------------------------------
    // D. Process Pending Activity Logs
    // -------------------------------------------------------------
    const activityQueue = getActivityQueue();
    const remainingActivities: PendingActivityTask[] = [];

    for (const task of activityQueue) {
      if (Date.now() < task.nextRetryTime) {
        remainingActivities.push(task);
        continue;
      }

      try {
        await setDoc(doc(db, 'activity_log', task.id), {
          type: task.type,
          description: task.description,
          createdAt: serverTimestamp()
        }, { merge: true });
        console.log('[Gallery] Activity log synced:', task.id);
      } catch (err: any) {
        const newRetry = task.retryCount + 1;
        remainingActivities.push({
          ...task,
          retryCount: newRetry,
          nextRetryTime: Date.now() + getBackoffDelay(newRetry),
          lastError: err?.message
        });
      }
    }

    saveActivityQueue(remainingActivities);

    lastSyncTime = Date.now();
    console.log('[Gallery] Sync completed');
  } catch (err) {
    console.warn('[Gallery] Sync loop notice:', err);
  } finally {
    isSyncRunning = false;
    notifySyncListeners();
  }
}

// ============================================================================
// 8. RECONCILIATION HELPER (Protects Local Data from Remote Failures)
// ============================================================================

/**
 * Reconciles remote documents from Firestore with local state.
 * Rule: Local pending/uploading/failed items are NEVER discarded.
 * Remote documents are merged, matching on unique ID to prevent duplicates.
 */
export function reconcileGalleryItems(remoteDocs: Project[], localDocs: Project[]): Project[] {
  const mergedMap = new Map<string, Project>();

  // 1. Index remote documents
  remoteDocs.forEach(rem => {
    mergedMap.set(String(rem.id), {
      ...rem,
      syncStatus: 'synced',
      isFirestore: true
    });
  });

  // 2. Overlay local documents that are pending, uploading, or failed
  localDocs.forEach(loc => {
    const locId = String(loc.id);
    if (!mergedMap.has(locId)) {
      // Remote does not have this item yet -> MUST KEEP IT!
      mergedMap.set(locId, loc);
    } else {
      // Remote has it: if local has a live blob and remote image is identical or synced, update smoothly
      const remoteItem = mergedMap.get(locId)!;
      mergedMap.set(locId, {
        ...remoteItem,
        localBlobId: loc.localBlobId || remoteItem.localBlobId,
        image: remoteItem.image || loc.image,
        syncStatus: loc.syncStatus === 'pending' || loc.syncStatus === 'uploading' ? loc.syncStatus : 'synced'
      });
    }
  });

  return Array.from(mergedMap.values());
}

// ============================================================================
// 9. AUTOMATIC SYNC LISTENERS & INITIALIZATION
// ============================================================================

let isInitialized = false;

export function initializeGallerySync(): void {
  if (isInitialized || typeof window === 'undefined') return;
  isInitialized = true;

  // 1. Online / Offline listeners
  window.addEventListener('online', () => {
    console.log('[Gallery] Browser is ONLINE. Initiating background sync...');
    runSyncQueue();
  });

  window.addEventListener('offline', () => {
    console.log('[Gallery] Browser is OFFLINE. Offline mode active.');
    notifySyncListeners();
  });

  // 2. Periodic sync timer (every 30 seconds if there are pending items)
  setInterval(() => {
    const state = getCurrentSyncState();
    if (state.pendingCount > 0 && !state.isSyncing && navigator.onLine) {
      runSyncQueue();
    }
  }, 30000);

  // 3. Initial run on startup
  setTimeout(() => {
    runSyncQueue();
  }, 2000);
}
