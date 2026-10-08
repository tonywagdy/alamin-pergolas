import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Lock,
  LogIn,
  LogOut,
  ImagePlus,
  Upload,
  Users,
  Phone,
  MessageCircle,
  Trash2,
  CheckCircle2,
  Clock,
  Layers,
  Loader2,
  Sparkles,
  ArrowLeftRight,
  RotateCcw,
  ExternalLink,
  Search,
  Filter,
  RefreshCw,
  ArrowRight,
  Eye,
  Check,
  AlertTriangle,
  AlertCircle,
  X,
  LayoutDashboard,
  History,
  GripVertical,
  ChevronUp,
  ChevronDown,
  ListOrdered,
  Calendar,
  ArrowUpRight,
  Cloud,
  CloudOff
} from 'lucide-react';
import { compressImage, compressDataUrl, CompressionResult } from '../utils/imageCompressor';
import {
  initializeGallerySync,
  subscribeToSyncState,
  subscribeToGalleryUpdates,
  getCurrentSyncState,
  resolveProjectsImages,
  enqueueNewUpload,
  enqueueReorder,
  enqueueDelete,
  enqueueLocalActivity,
  runSyncQueue,
  reconcileGalleryItems,
  getLocalGallery,
  saveLocalGallery,
  getLocalOrder,
  saveLocalOrder,
  getLocalDeletedStaticIds,
  saveLocalDeletedStaticIds,
  getLocalActivities,
  saveLocalActivities,
  STORAGE_KEYS,
  SyncState
} from '../utils/gallerySync';
import { db, auth, storage } from '../firebase';
import {
  collection,
  addDoc,
  setDoc,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
  updateDoc,
  deleteDoc,
  doc,
  writeBatch
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { Lead, Project, ActivityLogItem } from '../types';
import { BEFORE_AFTER_ITEMS, PROJECTS, LOGO_URL, PHONE_NUMBER_INTL } from '../data';

const AUTHORIZED_ADMIN_EMAIL = 'twagdy067@gmail.com';

const CATEGORIES = [
  "الكل",
  "برجولات حدائق",
  "برجولات روف",
  "أسقف ديكورية",
  "أعمال خشبية",
  "ديكورات خشبية"
];

interface AdminPortalProps {
  onBackToPublicSite: () => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({ onBackToPublicSite }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'leads' | 'gallery' | 'beforeAfter' | 'activity'>('dashboard');

  // Leads state
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadSearch, setLeadSearch] = useState('');
  const [leadStatusFilter, setLeadStatusFilter] = useState<'all' | 'new' | 'contacted' | 'closed'>('all');

  // Local-First Sync State
  const [syncState, setSyncState] = useState<SyncState>(getCurrentSyncState());

  // Gallery state
  const [firestoreProjects, setFirestoreProjects] = useState<Project[]>(() => getLocalGallery());
  const [deletedStaticIds, setDeletedStaticIds] = useState<number[]>(() => getLocalDeletedStaticIds());
  const [customOrderIds, setCustomOrderIds] = useState<string[]>(() => getLocalOrder());
  const [galleryCategoryFilter, setGalleryCategoryFilter] = useState('الكل');
  const [draggedProjectIndex, setDraggedProjectIndex] = useState<number | null>(null);
  const [dragOverProjectIndex, setDragOverProjectIndex] = useState<number | null>(null);

  // Activity Log state
  const [activities, setActivities] = useState<ActivityLogItem[]>(() => getLocalActivities());
  const [activityFilter, setActivityFilter] = useState<'all' | 'leads' | 'gallery' | 'before_after'>('all');

  // Gallery Upload form states
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('برجولات حدائق');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatusText, setUploadStatusText] = useState<string>('');
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressedDataUrl, setCompressedDataUrl] = useState<string>('');
  const [compressedBlob, setCompressedBlob] = useState<Blob | null>(null);
  const [compressionInfo, setCompressionInfo] = useState<{
    originalSizeKb: number;
    compressedSizeKb: number;
    savingsPercent: number;
  } | null>(null);

  // Before & After management states
  const [baTitle, setBaTitle] = useState(BEFORE_AFTER_ITEMS[0].title);
  const [baBeforeImage, setBaBeforeImage] = useState(BEFORE_AFTER_ITEMS[0].beforeImage);
  const [baAfterImage, setBaAfterImage] = useState(BEFORE_AFTER_ITEMS[0].afterImage);
  const [baAspectRatio, setBaAspectRatio] = useState<'4/3' | '16/10' | '16/9' | '3/4'>('4/3');
  const [baFitMode, setBaFitMode] = useState<'contain' | 'cover'>('contain');
  const [baBeforeBlob, setBaBeforeBlob] = useState<Blob | null>(null);
  const [baAfterBlob, setBaAfterBlob] = useState<Blob | null>(null);
  const [baDirty, setBaDirty] = useState(false);
  const baDirtyRef = useRef(false);
  baDirtyRef.current = baDirty;

  const [isSavingBA, setIsSavingBA] = useState(false);
  const [isCompressingBA, setIsCompressingBA] = useState<'before' | 'after' | null>(null);
  const [baSuccessMsg, setBaSuccessMsg] = useState('');

  // Interactive test slider state
  const [testSliderPos, setTestSliderPos] = useState(50);
  const testSliderRef = useRef<HTMLDivElement>(null);

  // In-App Action Confirmations & Toasts (Replaces window.confirm/alert for 100% iframe reliability)
  const [leadIdPendingDelete, setLeadIdPendingDelete] = useState<string | null>(null);
  const [galleryItemPendingDelete, setGalleryItemPendingDelete] = useState<string | number | null>(null);
  const [activityPendingDelete, setActivityPendingDelete] = useState<string | null>(null);
  const [showClearAllActivitiesConfirm, setShowClearAllActivitiesConfirm] = useState(false);
  const [isDeletingActivity, setIsDeletingActivity] = useState(false);
  const [showResetBAConfirm, setShowResetBAConfirm] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage((curr) => (curr?.text === text ? null : curr));
    }, 4000);
  };

  // Monitor auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setAuthLoading(false);
      if (currentUser) {
        if (currentUser.emailVerified && currentUser.email === AUTHORIZED_ADMIN_EMAIL) {
          setUser(currentUser);
          setAuthError(null);
        } else {
          setUser(null);
          setAuthError(`عذراً، البريد (${currentUser.email}) غير مصرح له بالدخول. الدخول مقتصر على حساب الإدارة المعتمد.`);
          signOut(auth);
        }
      } else {
        setUser(null);
      }
    });

    const applyResolvedGallery = async (projects: Project[]) => {
      const resolved = await resolveProjectsImages(projects);
      setFirestoreProjects(resolved);
    };

    // Initialize Local-First gallery sync & restore cached blobs
    initializeGallerySync();
    const unsubSync = subscribeToSyncState(setSyncState);
    const unsubGalleryLocal = subscribeToGalleryUpdates((updatedList) => {
      applyResolvedGallery(updatedList);
    });
    applyResolvedGallery(getLocalGallery());

    return () => {
      unsubscribe();
      unsubSync();
      unsubGalleryLocal();
    };
  }, []);

  // Fetch data when authenticated
  useEffect(() => {
    if (!user) return;

    const applyResolvedGallery = async (projects: Project[]) => {
      const resolved = await resolveProjectsImages(projects);
      setFirestoreProjects(resolved);
    };

    // 1. Leads listener
    const qLeads = query(collection(db, 'leads'), orderBy('createdAt', 'desc'));
    const unsubLeads = onSnapshot(qLeads, (snapshot) => {
      const items: Lead[] = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...(docSnap.data() as any)
      }));

      try {
        const stored = localStorage.getItem('alamin_local_leads');
        if (stored) {
          const localItems: Lead[] = JSON.parse(stored);
          const merged = [...items];
          localItems.forEach(local => {
            if (!merged.some(m => m.phone === local.phone && m.name === local.name)) {
              merged.push(local);
            }
          });
          setLeads(merged);
          return;
        }
      } catch (e) {}

      setLeads(items);
    }, (error) => {
      console.warn("Leads fetch notice:", error);
      try {
        const stored = localStorage.getItem('alamin_local_leads');
        if (stored) setLeads(JSON.parse(stored));
      } catch (e) {}
    });

    // 2. Gallery listener: Reconciles remote documents with local offline/pending items
    const qGallery = collection(db, 'gallery');
    const unsubGallery = onSnapshot(qGallery, (snapshot) => {
      const remoteItems: Project[] = snapshot.docs.map(docSnap => {
        const data = docSnap.data() as any;
        return {
          id: docSnap.id,
          ...data,
          isFirestore: true,
          syncStatus: 'synced',
          image: data.image || '',
          order: typeof data.order === 'number' ? data.order : undefined
        };
      });

      // Safely reconcile remote items with local offline/pending items
      const localItems = getLocalGallery();
      const reconciled = reconcileGalleryItems(remoteItems, localItems);
      saveLocalGallery(reconciled);
      applyResolvedGallery(reconciled);
    }, (err) => {
      console.warn("[Gallery] Firestore listener notice (quota or offline - preserving local):", err);
      applyResolvedGallery(getLocalGallery());
    });

    // 3. Deleted static items listener
    const qDeleted = query(collection(db, 'deleted_static_images'));
    const unsubDeleted = onSnapshot(qDeleted, (snapshot) => {
      const ids = snapshot.docs.map(docSnap => Number(docSnap.id));
      setDeletedStaticIds(ids);
      saveLocalDeletedStaticIds(ids);
    }, (err) => {
      console.warn("Deleted images fetch notice:", err);
      setDeletedStaticIds(getLocalDeletedStaticIds());
    });

    // 4. Before & After single listener (conserves Firestore reads)
    const unsubBAMain = onSnapshot(doc(db, 'before_after', 'main'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (!baDirtyRef.current) {
          if (data.title) setBaTitle(data.title);
          if (data.beforeImage) setBaBeforeImage(data.beforeImage);
          if (data.afterImage) setBaAfterImage(data.afterImage);
          if (data.aspectRatio) setBaAspectRatio(data.aspectRatio);
          if (data.fitMode) setBaFitMode(data.fitMode);
        }
      } else {
        try {
          const cached = localStorage.getItem('alamin_before_after');
          if (cached && !baDirtyRef.current) {
            const parsed = JSON.parse(cached);
            if (parsed.beforeImage) setBaBeforeImage(parsed.beforeImage);
            if (parsed.afterImage) setBaAfterImage(parsed.afterImage);
            if (parsed.title) setBaTitle(parsed.title);
            if (parsed.aspectRatio) setBaAspectRatio(parsed.aspectRatio);
            if (parsed.fitMode) setBaFitMode(parsed.fitMode);
          }
        } catch (e) {}
      }
    }, (err) => {
      console.warn("BA main fetch notice (using server cache):", err);
    });

    // 5. Activity log listener
    const qActivity = collection(db, 'activity_log');
    const unsubActivity = onSnapshot(qActivity, (snapshot) => {
      const remoteItems: ActivityLogItem[] = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...(docSnap.data() as any)
      }));

      // Merge remote items with local items
      const localItems = getLocalActivities();
      const map = new Map<string, ActivityLogItem>();
      remoteItems.forEach(item => { if (item.id) map.set(item.id, { ...item, syncStatus: 'synced' }); });
      localItems.forEach(item => { if (item.id && !map.has(item.id)) map.set(item.id, item); });

      const merged = Array.from(map.values()).sort((a, b) => {
        const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime();
        const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime();
        return timeB - timeA;
      });

      setActivities(merged);
      saveLocalActivities(merged);
    }, (err) => {
      console.warn("Activity log fetch notice:", err);
      setActivities(getLocalActivities());
    });

    // 6. Gallery custom order listener
    const unsubOrder = onSnapshot(doc(db, 'gallery_order', 'main'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (Array.isArray(data.orderIds)) {
          // If no local pending reorder queue, update local order
          const queue = localStorage.getItem(STORAGE_KEYS.REORDER_QUEUE);
          if (!queue) {
            setCustomOrderIds(data.orderIds);
            saveLocalOrder(data.orderIds);
          }
        }
      }
    }, (err) => {
      console.warn("Gallery order fetch notice:", err);
      const localOrder = getLocalOrder();
      if (localOrder.length > 0) setCustomOrderIds(localOrder);
    });

    return () => {
      unsubLeads();
      unsubGallery();
      unsubDeleted();
      unsubBAMain();
      unsubActivity();
      unsubOrder();
    };
  }, [user]);

  // Auth Handlers
  const handleLogin = async () => {
    setAuthError(null);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      if (!result.user.emailVerified || result.user.email !== AUTHORIZED_ADMIN_EMAIL) {
        setAuthError(`الحساب (${result.user.email}) ليس الحساب المعتمد للإدارة (${AUTHORIZED_ADMIN_EMAIL}).`);
        await signOut(auth);
      }
    } catch (error: any) {
      console.error("Admin login error:", error);
      setAuthError(error.message || "فشل تسجيل الدخول. يرجى المحاولة مجدداً.");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  // Activity Logger Helper (Local-First + Background Sync)
  const logActivity = async (type: 'leads' | 'gallery' | 'before_after', description: string) => {
    const newLogItem = enqueueLocalActivity(type, description);
    setActivities(prev => [newLogItem, ...prev.filter(a => a.id !== newLogItem.id)]);
  };

  // Activity Log deletion actions
  const handleDeleteActivity = async (id?: string) => {
    if (!id) return;
    setActivityPendingDelete(null);
    setActivities(prev => prev.filter(a => a.id !== id));

    try {
      const stored = localStorage.getItem('alamin_activity_log');
      if (stored) {
        const filtered = JSON.parse(stored).filter((a: any) => a.id !== id);
        localStorage.setItem('alamin_activity_log', JSON.stringify(filtered));
      }
    } catch (e) {}

    showToast("تم حذف السجل بنجاح", "success");

    try {
      if (!id.startsWith('act_')) {
        await deleteDoc(doc(db, 'activity_log', id));
      }
    } catch (err: any) {
      console.warn("Delete activity cloud notice:", err);
    }
  };

  const handleClearAllActivities = async () => {
    setShowClearAllActivitiesConfirm(false);
    if (activities.length === 0) return;

    setIsDeletingActivity(true);
    const toDelete = [...activities];
    setActivities([]);

    try {
      localStorage.removeItem('alamin_activity_log');
    } catch (e) {}

    showToast("تم مسح جميع السجلات بنجاح!", "success");

    try {
      const batch = writeBatch(db);
      toDelete.forEach(act => {
        if (act.id && !act.id.startsWith('act_')) {
          batch.delete(doc(db, 'activity_log', act.id));
        }
      });
      await batch.commit();
    } catch (err: any) {
      console.warn("Clear all cloud activities notice:", err);
    } finally {
      setIsDeletingActivity(false);
    }
  };

  // Lead Actions
  const handleUpdateLeadStatus = async (leadId: string, newStatus: 'new' | 'contacted' | 'closed') => {
    const targetLead = leads.find(l => l.id === leadId);
    const statusLabels: Record<string, string> = {
      new: 'جديد (لم يتم الرد)',
      contacted: 'تم التواصل',
      closed: 'مكتمل ومغلق'
    };
    try {
      await updateDoc(doc(db, 'leads', leadId), { status: newStatus });
      await logActivity('leads', `تغيير حالة طلب العميل "${targetLead?.name || 'طلب'}" إلى: ${statusLabels[newStatus]}`);
    } catch (error) {
      console.warn("Update lead status notice:", error);
    }
  };

  const handleConfirmDeleteLead = async (leadId: string) => {
    const targetLead = leads.find(l => l.id === leadId);
    // 1. Optimistic removal: immediate UI response
    setLeads(prev => prev.filter(l => l.id !== leadId));
    setLeadIdPendingDelete(null);
    showToast("تم حذف طلب العميل بنجاح", "success");

    // 2. Remove from LocalStorage
    try {
      const stored = localStorage.getItem('alamin_local_leads');
      if (stored) {
        const localItems = JSON.parse(stored).filter((l: any) => l.id !== leadId);
        localStorage.setItem('alamin_local_leads', JSON.stringify(localItems));
      }
    } catch (e) {
      console.warn("LocalStorage lead delete notice:", e);
    }

    // 3. Delete from Firestore if exists
    try {
      await deleteDoc(doc(db, 'leads', leadId));
      await logActivity('leads', `حذف طلب العميل "${targetLead?.name || 'طلب'}" نهائياً`);
    } catch (error) {
      console.warn("Delete lead Firestore notice:", error);
    }
  };

  // Gallery Reordering & Actions (Local-First + Coalescing Queue)
  const handleReorder = async (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;

    // Resolve items from filteredProjects (the current view)
    const fromItem = filteredProjects[fromIndex];
    const toItem = filteredProjects[toIndex];
    if (!fromItem || !toItem) return;

    // Find their positions in allProjects (the full catalogue)
    const actualFrom = allProjects.findIndex(p => String(p.id) === String(fromItem.id));
    const actualTo = allProjects.findIndex(p => String(p.id) === String(toItem.id));
    if (actualFrom === -1 || actualTo === -1 || actualFrom === actualTo) return;

    const reordered = [...allProjects];
    const [moved] = reordered.splice(actualFrom, 1);
    reordered.splice(actualTo, 0, moved);

    const newOrderIds = reordered.map(p => String(p.id));

    // 1. Instant optimistic update so UI reflects the new order immediately
    setCustomOrderIds(newOrderIds);

    // 2. Delegate to local-first sync manager (updates localStorage, coalesces, debounces cloud sync)
    enqueueReorder(newOrderIds);

    // 3. Log activity immediately
    await logActivity('gallery', `إعادة ترتيب صور المعرض: نقل "${moved.title}" إلى الترتيب #${actualTo + 1}`);
    showToast("تم تحديث وحفظ ترتيب صور المعرض بنجاح!", "success");
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedProjectIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverProjectIndex !== index) {
      setDragOverProjectIndex(index);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedProjectIndex !== null && draggedProjectIndex !== targetIndex) {
      await handleReorder(draggedProjectIndex, targetIndex);
    }
    setDraggedProjectIndex(null);
    setDragOverProjectIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedProjectIndex(null);
    setDragOverProjectIndex(null);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (previewUrl) {
      try { URL.revokeObjectURL(previewUrl); } catch (e) {}
    }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setIsCompressing(true);
    setCompressionInfo(null);

    try {
      const result: CompressionResult = await compressImage(file, 1280, 0.8);
      setCompressedDataUrl(result.dataUrl);
      setCompressedBlob(result.blob);
      const savings = Math.max(0, Math.round(((result.originalSizeKb - result.compressedSizeKb) / result.originalSizeKb) * 100));
      setCompressionInfo({
        originalSizeKb: result.originalSizeKb,
        compressedSizeKb: result.compressedSizeKb,
        savingsPercent: savings,
      });
    } catch (err) {
      console.warn("Client compression warning, will use direct fallback:", err);
    } finally {
      setIsCompressing(false);
    }
  };

  const handleUploadImage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !category || (!selectedFile && !compressedBlob)) return;

    setIsUploading(true);
    setUploadStatusText('جاري تحضير وضغط الصورة محلياً...');

    try {
      let blobToUpload = compressedBlob;

      if (!blobToUpload && selectedFile) {
        setUploadStatusText('جاري ضغط وتقليل حجم الصورة...');
        const res = await compressImage(selectedFile, 1280, 0.8);
        blobToUpload = res.blob;
      }

      if (!blobToUpload) {
        throw new Error('لم يتم تجهيز ملف الصورة بنجاح');
      }

      setUploadStatusText('جاري حفظ الصورة محلياً وبدء المزامنة...');

      // Enqueue upload through local-first sync manager
      const newProj = await enqueueNewUpload({
        title: title.trim(),
        category,
        blob: blobToUpload,
        order: 0
      });

      // Update React state immediately
      setFirestoreProjects(prev => [newProj, ...prev.filter(p => p.id !== newProj.id)]);
      setCustomOrderIds(prev => [String(newProj.id), ...prev.filter(oid => oid !== String(newProj.id))]);

      // Reset form
      setTitle('');
      setSelectedFile(null);
      if (previewUrl) {
        try { URL.revokeObjectURL(previewUrl); } catch (e) {}
      }
      setPreviewUrl('');
      setCompressedDataUrl('');
      setCompressedBlob(null);
      setCompressionInfo(null);

      showToast("تمت إضافة المشروع للمعرض بنجاح وبسرعة فائقة!", "success");
    } catch (error: any) {
      console.error("Upload error:", error);
      showToast(`حدث خطأ أثناء الإضافة: ${error?.message || 'يرجى المحاولة مرة أخرى'}`, "error");
    } finally {
      setIsUploading(false);
      setUploadStatusText('');
    }
  };

  const handleManualSync = async () => {
    try {
      showToast("جاري المزامنة ورفع الصور للسيرفر السحابي الآن...", "success");
      await runSyncQueue(true);
      showToast("تمت مزامنة وحفظ جميع الصور في السيرفر بنجاح!", "success");
    } catch (err: any) {
      showToast(`فشلت المزامنة: ${err?.message || 'يرجى المحاولة مجدداً'}`, "error");
    }
  };

  const handleConfirmDeleteGalleryItem = async (id: string | number, isFirestore?: boolean) => {
    const target = allProjects.find(p => p.id === id);
    setGalleryItemPendingDelete(null);

    // 1. Instant local removal from state
    if (isFirestore) {
      setFirestoreProjects(prev => prev.filter(p => String(p.id) !== String(id)));
    } else {
      setDeletedStaticIds(prev => [...prev, Number(id)]);
    }

    const updatedOrderIds = customOrderIds.filter(orderId => orderId !== String(id));
    setCustomOrderIds(updatedOrderIds);

    // 2. Delegate to local-first delete manager
    await enqueueDelete(id, isFirestore, target?.firebaseStoragePath);

    showToast("تم حذف المشروع من المعرض بنجاح!", "success");
  };

  // Before / After Actions
  const handleSelectBAFile = async (e: React.ChangeEvent<HTMLInputElement>, side: 'before' | 'after') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressingBA(side);
    setBaSuccessMsg('');
    try {
      // High-efficiency web compression: 1080px max, 0.78 quality, max 300,000 characters (~220 KB)
      const res: CompressionResult = await compressImage(file, 1080, 0.78, 300000);
      if (side === 'before') {
        setBaBeforeImage(res.dataUrl);
        setBaBeforeBlob(res.blob);
      } else {
        setBaAfterImage(res.dataUrl);
        setBaAfterBlob(res.blob);
      }
      setBaDirty(true);
    } catch (err) {
      console.warn("Client compression notice, attempting fallback:", err);
      const reader = new FileReader();
      reader.onload = async () => {
        if (typeof reader.result === 'string') {
          try {
            const compressed = await compressDataUrl(reader.result, 1080, 0.78, 300000);
            if (side === 'before') {
              setBaBeforeImage(compressed.dataUrl);
              setBaBeforeBlob(compressed.blob);
            } else {
              setBaAfterImage(compressed.dataUrl);
              setBaAfterBlob(compressed.blob);
            }
          } catch {
            if (side === 'before') setBaBeforeImage(reader.result as string);
            else setBaAfterImage(reader.result as string);
          }
          setBaDirty(true);
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setIsCompressingBA(null);
    }
  };

  const handleSaveBeforeAfter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!baBeforeImage || !baAfterImage) {
      showToast("يرجى التأكد من وجود صورة للمكان قبل العمل وصورة بعد التركيب", "error");
      return;
    }

    if (!auth.currentUser) {
      showToast("انتهت جلسة تسجيل الدخول، يرجى تسجيل الدخول بحساب المدير أولاً", "error");
      return;
    }

    setIsSavingBA(true);
    setBaSuccessMsg('');

    try {
      // 1. Strict compression check: ensure both images are lightweight (<= 300,000 characters)
      const beforeCompressed = await compressDataUrl(baBeforeImage, 1080, 0.78, 300000);
      const afterCompressed = await compressDataUrl(baAfterImage, 1080, 0.78, 300000);

      let finalBefore = beforeCompressed.dataUrl;
      let finalAfter = afterCompressed.dataUrl;
      const beforeBlob = baBeforeBlob || beforeCompressed.blob;
      const afterBlob = baAfterBlob || afterCompressed.blob;

      const cleanTitle = baTitle.trim() || BEFORE_AFTER_ITEMS[0].title;

      // 3. Save to Firestore (cloud sync fallback)
      try {
        await setDoc(doc(db, 'before_after', 'main'), {
          beforeImage: finalBefore,
          afterImage: finalAfter,
          title: cleanTitle,
          aspectRatio: baAspectRatio,
          fitMode: baFitMode,
          updatedAt: serverTimestamp()
        }, { merge: true });

        // Sync sub-documents
        await Promise.all([
          setDoc(doc(db, 'before_after', 'before'), {
            image: finalBefore,
            updatedAt: serverTimestamp()
          }, { merge: true }),
          setDoc(doc(db, 'before_after', 'after'), {
            image: finalAfter,
            updatedAt: serverTimestamp()
          }, { merge: true })
        ]);
      } catch (cloudErr) {
        throw cloudErr;
      }

      // 4. Update local states & cache now that cloud Firestore is safely committed
      setBaBeforeImage(finalBefore);
      setBaAfterImage(finalAfter);
      setBaDirty(false);

      try {
        localStorage.setItem('alamin_before_after', JSON.stringify({
          beforeImage: finalBefore,
          afterImage: finalAfter,
          title: cleanTitle,
          aspectRatio: baAspectRatio,
          fitMode: baFitMode
        }));
      } catch (e) {}

      setBaSuccessMsg("تم حفظ صور قبل وبعد بنجاح وتم نشرها على كافة الأجهزة والموقع فوراً!");
      await logActivity('before_after', `تحديث صور مقارنة قبل وبعد: "${cleanTitle}"`);
      showToast("تم حفظ صور قبل وبعد وتحديث الموقع بنجاح!", "success");
    } catch (error: any) {
      console.error("Firestore before/after save error:", error);
      showToast(`تعذر حفظ الصور في السيرفر: ${error?.message || 'يرجى مراجعة اتصال الإنترنت'}`, "error");
    } finally {
      setIsSavingBA(false);
    }
  };

  const handleConfirmResetBeforeAfter = async () => {
    setShowResetBAConfirm(false);
    setIsSavingBA(true);
    const defaultData = {
      beforeImage: BEFORE_AFTER_ITEMS[0].beforeImage,
      afterImage: BEFORE_AFTER_ITEMS[0].afterImage,
      title: BEFORE_AFTER_ITEMS[0].title,
      aspectRatio: '4/3',
      fitMode: 'contain'
    };

    setBaBeforeImage(defaultData.beforeImage);
    setBaAfterImage(defaultData.afterImage);
    setBaTitle(defaultData.title);
    setBaAspectRatio('4/3');
    setBaFitMode('contain');
    setBaDirty(false);

    try {
      localStorage.setItem('alamin_before_after', JSON.stringify(defaultData));
      await Promise.all([
        setDoc(doc(db, 'before_after', 'main'), {
          ...defaultData,
          updatedAt: serverTimestamp()
        }, { merge: true }),
        setDoc(doc(db, 'before_after', 'before'), {
          image: defaultData.beforeImage,
          updatedAt: serverTimestamp()
        }, { merge: true }),
        setDoc(doc(db, 'before_after', 'after'), {
          image: defaultData.afterImage,
          updatedAt: serverTimestamp()
        }, { merge: true })
      ]);
      await logActivity('before_after', 'استعادة الصور الافتراضية لقسم قبل وبعد');
      showToast("تمت استعادة الصور الأصلية بنجاح ونشرها!", "success");
    } catch (e: any) {
      console.warn("Reset notice:", e);
      showToast("تمت استعادة الصور الأصلية محلياً", "success");
    } finally {
      setIsSavingBA(false);
    }
  };

  // Slider Test handler
  const updateTestPosition = useCallback((clientX: number) => {
    if (!testSliderRef.current) return;
    const rect = testSliderRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const position = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setTestSliderPos(position);
  }, []);

  // Filtered Leads
  const filteredLeads = leads.filter(l => {
    const matchesStatus = leadStatusFilter === 'all' || l.status === leadStatusFilter;
    const matchesSearch = !leadSearch.trim() ||
      l.name.toLowerCase().includes(leadSearch.toLowerCase()) ||
      l.phone.includes(leadSearch) ||
      (l.service && l.service.toLowerCase().includes(leadSearch.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  // Combined Projects sorted ascending by order, matching Gallery.tsx exactly
  const allProjects: Project[] = useMemo(() => {
    const rawList: Project[] = [
      ...firestoreProjects.map((p, idx) => ({
        ...p,
        isFirestore: true,
        order: typeof p.order === 'number' ? p.order : idx
      })),
      ...PROJECTS.filter(p => !deletedStaticIds.includes(Number(p.id))).map((p, idx) => ({
        ...p,
        isFirestore: false,
        order: typeof p.order === 'number' ? p.order : (100 + idx)
      }))
    ];

    if (customOrderIds.length > 0) {
      const orderMap = new Map<string, number>(customOrderIds.map((id, index) => [String(id), index]));
      return rawList.sort((a, b) => {
        const idA = String(a.id);
        const idB = String(b.id);
        const hasA = orderMap.has(idA);
        const hasB = orderMap.has(idB);
        const posA = Number(hasA ? orderMap.get(idA) : (typeof a.order === 'number' ? a.order : 0));
        const posB = Number(hasB ? orderMap.get(idB) : (typeof b.order === 'number' ? b.order : 0));
        return posA - posB;
      });
    }

    return rawList.sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0));
  }, [firestoreProjects, deletedStaticIds, customOrderIds]);

  const filteredProjects = galleryCategoryFilter === 'الكل'
    ? allProjects
    : allProjects.filter(p => p.category === galleryCategoryFilter);

  // Unread new leads count
  const newLeadsCount = leads.filter(l => l.status === 'new').length;

  // -------------------------------------------------------------
  // VIEW 1: LOADING STATE
  // -------------------------------------------------------------
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white" dir="rtl">
        <Loader2 size={40} className="animate-spin text-amber-500 mb-4" />
        <p className="text-sm text-slate-300 font-bold">جاري التحقق من هوية الأمان...</p>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW 2: UNHEALTHY / UNAUTHENTICATED LOGIN GATE
  // -------------------------------------------------------------
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between" dir="rtl">
        {/* Top Minimal Bar */}
        <header className="p-6 border-b border-slate-800/80 flex items-center justify-between max-w-6xl w-full mx-auto">
          <div className="flex items-center gap-3">
            <div className="bg-white p-2 rounded-xl">
              <img src={LOGO_URL} alt="الأمين للبرجولات" className="h-9 w-auto" />
            </div>
            <div>
              <span className="font-black text-base sm:text-lg block text-white">الأمين للبرجولات</span>
              <span className="text-[11px] text-amber-400 font-semibold tracking-wide">بوابة الإدارة المركزية</span>
            </div>
          </div>

          <button
            onClick={onBackToPublicSite}
            className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl transition-colors cursor-pointer"
          >
            <span>العودة للموقع الرئيسي</span>
            <ArrowRight size={14} />
          </button>
        </header>

        {/* Center Login Box */}
        <div className="max-w-md w-full mx-auto px-4 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden"
          >
            {/* Top Accent Gradient */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-amber-400 to-[#143d6a]" />

            <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
              <Lock size={30} />
            </div>

            <h1 className="text-2xl font-black text-center text-white mb-2">تسجيل دخول الإدارة</h1>
            <p className="text-xs text-slate-400 text-center mb-6 leading-relaxed">
              منطقة آمنة ومحمية مخصصة لإدارة طلبات العملاء، معرض الأعمال، وتحديثات صور قبل وبعد.
            </p>

            {authError && (
              <div className="mb-6 p-4 bg-red-950/60 border border-red-800/80 rounded-2xl text-red-300 text-xs leading-relaxed flex items-start gap-2.5">
                <AlertTriangle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
                <span>{authError}</span>
              </div>
            )}

            <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-2xl mb-6 text-[11px] text-slate-400 space-y-1.5">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <ShieldCheck size={14} />
                <span>حماية مشددة عبر Google Identity</span>
              </div>
              <p className="text-slate-400 leading-normal">
                الوصول مسموح حصرياً للمدير المعتمد:
                <strong className="block text-slate-200 mt-0.5 font-mono text-xs">{AUTHORIZED_ADMIN_EMAIL}</strong>
              </p>
            </div>

            <button
              onClick={handleLogin}
              className="w-full bg-white hover:bg-slate-100 text-slate-900 py-3.5 px-5 rounded-2xl font-bold text-sm shadow-xl flex items-center justify-center gap-3 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span>تسجيل الدخول بحساب Google</span>
            </button>

            <div className="mt-6 pt-6 border-t border-slate-800/80 text-center">
              <button
                onClick={onBackToPublicSite}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                الرجوع لتصفح الموقع كزائر
              </button>
            </div>
          </motion.div>
        </div>

        {/* Footer */}
        <footer className="p-6 text-center text-xs text-slate-600 border-t border-slate-900">
          شركة الأمين للبرجولات © {new Date().getFullYear()} — لوحة التحكم الآمنة
        </footer>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW 3: FULL STANDALONE ADMIN DASHBOARD
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col" dir="rtl">
      {/* Top Application Header */}
      <header className="bg-slate-900/90 border-b border-slate-800 sticky top-0 z-50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">

          {/* Brand & Status */}
          <div className="flex items-center gap-3.5">
            <div className="bg-white p-2 rounded-xl shadow-xs">
              <img src={LOGO_URL} alt="الأمين" className="h-8 w-auto" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-base sm:text-lg text-white">لوحة تحكم الأمين</span>
                <span className="hidden sm:inline-flex items-center gap-1 bg-emerald-950/80 border border-emerald-800/60 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  متصل ومؤمّن
                </span>
              </div>
              <span className="text-xs text-slate-400 hidden md:block">
                مرحباً بك، <strong className="text-slate-200">{user.email}</strong>
              </span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={onBackToPublicSite}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
              title="تصفح الموقع الرئيسي"
            >
              <ExternalLink size={14} />
              <span className="hidden sm:inline">معاينة الموقع</span>
            </button>

            <button
              onClick={handleLogout}
              className="bg-red-950/50 hover:bg-red-900/80 border border-red-800/60 text-red-300 text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              title="تسجيل الخروج من لوحة التحكم"
            >
              <LogOut size={14} />
              <span>خروج</span>
            </button>
          </div>
        </div>

        {/* Tab Switcher Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex border-t border-slate-800/80 gap-2 overflow-x-auto py-2">
          {/* Tab 1: Dashboard */}
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`py-2 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'dashboard'
                ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <LayoutDashboard size={16} />
            <span>الرئيسية</span>
          </button>

          {/* Tab 2: Leads */}
          <button
            onClick={() => setActiveTab('leads')}
            className={`py-2 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'leads'
                ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <Users size={16} />
            <span>طلبات واستفسارات العملاء</span>
            {newLeadsCount > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === 'leads' ? "bg-slate-950 text-amber-400" : "bg-amber-500 text-slate-950"
              }`}>
                {newLeadsCount} جديد
              </span>
            )}
          </button>

          {/* Tab 3: Gallery */}
          <button
            onClick={() => setActiveTab('gallery')}
            className={`py-2 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'gallery'
                ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <ImagePlus size={16} />
            <span>معرض المشروعات</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === 'gallery' ? "bg-slate-950 text-amber-400" : "bg-slate-800 text-slate-400"
            }`}>
              {allProjects.length}
            </span>
          </button>

          {/* Tab 4: Before & After */}
          <button
            onClick={() => setActiveTab('beforeAfter')}
            className={`py-2 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'beforeAfter'
                ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <ArrowLeftRight size={16} />
            <span>قبل وبعد</span>
          </button>

          {/* Tab 5: Activity Log */}
          <button
            onClick={() => setActiveTab('activity')}
            className={`py-2 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'activity'
                ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <History size={16} />
            <span>سجل النشاط</span>
            {activities.length > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === 'activity' ? "bg-slate-950 text-amber-400" : "bg-slate-800 text-slate-400"
              }`}>
                {activities.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">

        {/* ----------------------------------------------------------------- */}
        {/* TAB 0: DASHBOARD (HOME) */}
        {/* ----------------------------------------------------------------- */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            {/* Greeting Card */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
              <div>
                <span className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3.5 py-1.5 rounded-full inline-block mb-3">
                  لوحة معلومات شركة الأمين المركزية
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-white mb-2">
                  مرحباً بك في لوحة الإدارة
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 max-w-xl leading-relaxed">
                  متابعة طلبات المعاينة والاستفسارات، إدارة معرض الصور وإعادة ترتيبها بالسحب والإفلات، وتحديث صور قبل وبعد.
                </p>
              </div>

              <div className="flex items-center gap-2 self-stretch sm:self-auto">
                <button
                  onClick={() => setActiveTab('gallery')}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-amber-500/20 flex-1 sm:flex-none"
                >
                  <ImagePlus size={16} />
                  <span>إضافة مشروع جديد</span>
                </button>
                <button
                  onClick={() => setActiveTab('leads')}
                  className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer border border-slate-700 flex-1 sm:flex-none"
                >
                  <Users size={16} />
                  <span>عرض الطلبات</span>
                </button>
              </div>
            </div>

            {/* Stat Cards Grid (6 Metric Cards as Requested) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">

              {/* Stat 1: NEW LEADS (PROMINENT HIGHLIGHT) */}
              <div className="bg-gradient-to-br from-amber-500/20 via-amber-500/5 to-slate-900 border-2 border-amber-500/50 rounded-3xl p-6 shadow-xl shadow-amber-500/10 flex flex-col justify-between relative overflow-hidden group">
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600"></div>
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-black text-amber-300 uppercase tracking-wider flex items-center gap-2 bg-amber-500/20 border border-amber-500/40 px-3 py-1 rounded-full">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                      طلبات جديدة بانتظار الرد
                    </span>
                    <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                      <Clock size={20} />
                    </div>
                  </div>
                  <div className="text-4xl sm:text-5xl font-black text-white mb-2">{newLeadsCount}</div>
                  <p className="text-xs text-amber-200/80 leading-relaxed">
                    {newLeadsCount > 0
                      ? "تحتاج تواصل ومتابعة سريعة هاتفياً أو عبر واتساب مع العملاء."
                      : "لا توجد طلبات جديدة حالياً، تم الرد على كافة الطلبات بنجاح."}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-amber-500/20 flex items-center justify-between">
                  <button
                    onClick={() => {
                      setLeadStatusFilter('new');
                      setActiveTab('leads');
                    }}
                    className="text-xs font-black text-amber-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>عرض الطلبات الجديدة مباشرة</span>
                    <ArrowLeftRight size={13} />
                  </button>
                  <span className="text-[11px] font-bold text-amber-400/80 bg-amber-950/60 px-2 py-0.5 rounded-lg border border-amber-500/30">
                    أولوية قصوى
                  </span>
                </div>
              </div>

              {/* Stat 2: TOTAL LEADS */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold text-slate-400">إجمالي طلبات العملاء</span>
                    <div className="w-10 h-10 rounded-2xl bg-slate-800 text-amber-400 flex items-center justify-center border border-slate-700">
                      <Users size={20} />
                    </div>
                  </div>
                  <div className="text-3xl sm:text-4xl font-black text-white mb-2">{leads.length}</div>
                  <p className="text-xs text-slate-500">
                    كافة استفسارات وطلبات المعاينة التي تم إرسالها من نموذج الموقع.
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between">
                  <button
                    onClick={() => {
                      setLeadStatusFilter('all');
                      setActiveTab('leads');
                    }}
                    className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <span>فتح جدول الطلبات</span>
                    <ArrowUpRight size={14} />
                  </button>
                  <span className="text-[11px] text-slate-400 font-mono">100% محفوظة</span>
                </div>
              </div>

              {/* Stat 3: CONTACTED LEADS */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold text-slate-400">تم التواصل معهم</span>
                    <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
                      <Phone size={20} />
                    </div>
                  </div>
                  <div className="text-3xl sm:text-4xl font-black text-white mb-2">
                    {leads.filter(l => l.status === 'contacted').length}
                  </div>
                  <p className="text-xs text-slate-500">
                    عملاء تم الاتصال بهم أو إرسال مقايسات وتفاصيل عبر واتساب.
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between">
                  <button
                    onClick={() => {
                      setLeadStatusFilter('contacted');
                      setActiveTab('leads');
                    }}
                    className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <span>استعراض المتواصل معهم</span>
                    <ArrowUpRight size={14} />
                  </button>
                  <span className="text-[11px] text-slate-500 font-bold">قيد المتابعة</span>
                </div>
              </div>

              {/* Stat 4: CLOSED LEADS */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold text-slate-400">طلبات مكتملة ومغلقة</span>
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                      <CheckCircle2 size={20} />
                    </div>
                  </div>
                  <div className="text-3xl sm:text-4xl font-black text-white mb-2">
                    {leads.filter(l => l.status === 'closed').length}
                  </div>
                  <p className="text-xs text-slate-500">
                    طلبات تم الاتفاق عليها أو إتمام المعاينة والتنفيذ بنجاح.
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between">
                  <button
                    onClick={() => {
                      setLeadStatusFilter('closed');
                      setActiveTab('leads');
                    }}
                    className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <span>استعراض الطلبات المكتملة</span>
                    <ArrowUpRight size={14} />
                  </button>
                  <span className="text-[11px] text-slate-500 font-bold">مكتمل</span>
                </div>
              </div>

              {/* Stat 5: GALLERY IMAGES */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold text-slate-400">صور المعرض الحالية</span>
                    <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
                      <ImagePlus size={20} />
                    </div>
                  </div>
                  <div className="text-3xl sm:text-4xl font-black text-white mb-2">{allProjects.length}</div>
                  <p className="text-xs text-slate-500">
                    منها {firestoreProjects.length} صورة مرفوعة حديثاً من اللوحة بترتيب مخصص.
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between">
                  <button
                    onClick={() => setActiveTab('gallery')}
                    className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <span>إعادة ترتيب المعرض بالسحب</span>
                    <ArrowUpRight size={14} />
                  </button>
                  <span className="text-[11px] text-slate-400 font-mono">سحب وإفلات</span>
                </div>
              </div>

              {/* Stat 6: BEFORE AND AFTER */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold text-slate-400">مقارنة قبل وبعد</span>
                    <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20">
                      <ArrowLeftRight size={20} />
                    </div>
                  </div>
                  <div className="text-3xl sm:text-4xl font-black text-white mb-2">{BEFORE_AFTER_ITEMS.length}</div>
                  <p className="text-xs text-slate-400 truncate font-semibold" title={baTitle}>
                    {baTitle}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between">
                  <button
                    onClick={() => setActiveTab('beforeAfter')}
                    className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <span>تعديل صور السلايدر</span>
                    <ArrowUpRight size={14} />
                  </button>
                  <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    نشط بالموقع
                  </span>
                </div>
              </div>

            </div>

            {/* Section: LAST 5 LEADS (As specifically requested) */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                    <Clock size={20} />
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-white">آخر 5 طلبات وصلت للموقع</h3>
                    <p className="text-xs text-slate-400">وصول مباشر وفوري لأحدث طلبات المعاينة والاستفسارات الواردة.</p>
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab('leads')}
                  className="bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 px-4 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
                >
                  <span>عرض كافة الطلبات ({leads.length})</span>
                  <ArrowRight size={14} />
                </button>
              </div>

              {leads.length === 0 ? (
                <div className="py-12 text-center">
                  <Users size={36} className="text-slate-600 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-400">لا توجد طلبات واردة حتى الآن</p>
                  <p className="text-xs text-slate-500 mt-1">ستظهر هنا تلقائياً عند إرسال أي عميل لطلب معاينة من نموذج الاتصال بالموقع.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {leads.slice(0, 5).map((lead, idx) => {
                    const waText = `أهلاً بك أستاذ ${lead.name}، شركة الأمين للبرجولات تتشرف بالتواصل معك بخصوص طلبك (${lead.service}).`;
                    const waLink = `https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(waText)}`;

                    return (
                      <div
                        key={lead.id || idx}
                        className="bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all"
                      >
                        {/* Lead Info */}
                        <div className="flex items-center gap-3.5">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black ${
                            lead.status === 'new'
                              ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                              : lead.status === 'contacted'
                              ? "bg-blue-500/20 text-blue-400 border border-blue-500/40"
                              : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                          }`}>
                            #{idx + 1}
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-black text-sm text-white">{lead.name}</h4>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                lead.status === 'new'
                                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                                  : lead.status === 'contacted'
                                  ? "bg-blue-500/20 text-blue-400 border border-blue-500/40"
                                  : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                              }`}>
                                {lead.status === 'new' ? 'جديد' : lead.status === 'contacted' ? 'تم التواصل' : 'مغلق'}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-400">
                              <span className="text-amber-400 font-bold">{lead.service || "برجولة خشبية"}</span>
                              <span className="font-mono text-slate-300" dir="ltr">{lead.phone}</span>
                            </div>
                          </div>
                        </div>

                        {/* Date and Quick Action */}
                        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end pt-2 md:pt-0 border-t md:border-t-0 border-slate-800">
                          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                            <Calendar size={13} />
                            <span>
                              {lead.createdAt?.toDate
                                ? lead.createdAt.toDate().toLocaleString('ar-EG')
                                : typeof lead.createdAt === 'string'
                                ? new Date(lead.createdAt).toLocaleString('ar-EG')
                                : 'الآن'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <a
                              href={waLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-emerald-600/80 hover:bg-emerald-600 text-white p-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
                              title="رد عبر واتساب"
                            >
                              <MessageCircle size={14} />
                            </a>

                            <button
                              onClick={() => {
                                setLeadSearch(lead.phone || lead.name);
                                setActiveTab('leads');
                              }}
                              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                            >
                              <span>عرض التفاصيل</span>
                              <ArrowLeftRight size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick Action Hub */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div
                onClick={() => setActiveTab('gallery')}
                className="bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-2xl p-5 cursor-pointer transition-all hover:bg-slate-850 group"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                    <ListOrdered size={18} />
                  </div>
                  <h4 className="font-bold text-sm text-white group-hover:text-amber-400 transition-colors">
                    ترتيب صور المعرض
                  </h4>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  اسحب الصور وأفلتها لتحديد الترتيب الدقيق الذي يظهر للزوار في الصفحة الرئيسية.
                </p>
              </div>

              <div
                onClick={() => setActiveTab('beforeAfter')}
                className="bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-2xl p-5 cursor-pointer transition-all hover:bg-slate-850 group"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                    <ArrowLeftRight size={18} />
                  </div>
                  <h4 className="font-bold text-sm text-white group-hover:text-amber-400 transition-colors">
                    إدارة قبل وبعد
                  </h4>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  رفع صور المكان قبل التركيب وبعد الانتهاء لتوضيح جودة وفخامة التنفيذ للعملاء.
                </p>
              </div>

              <div
                onClick={() => setActiveTab('activity')}
                className="bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-2xl p-5 cursor-pointer transition-all hover:bg-slate-850 group"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                    <History size={18} />
                  </div>
                  <h4 className="font-bold text-sm text-white group-hover:text-amber-400 transition-colors">
                    سجل النشاط والعمليات
                  </h4>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  استعراض جميع التعديلات السابقة المنفذة على الطلبات، المعرض، والمقارنات.
                </p>
              </div>
            </div>

          </div>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* TAB 1: LEADS MANAGEMENT */}
        {/* ----------------------------------------------------------------- */}
        {activeTab === 'leads' && (
          <div className="space-y-6">
            {/* Filter & Search Toolbar */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
              {/* Search */}
              <div className="relative w-full sm:w-80">
                <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={leadSearch}
                  onChange={(e) => setLeadSearch(e.target.value)}
                  placeholder="ابحث بالاسم، الهاتف، أو الخدمة..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-10 pl-4 py-2 text-xs text-white placeholder-slate-500 focus:border-amber-500 outline-none"
                />
              </div>

              {/* Status Filter Tabs */}
              <div className="flex gap-1.5 w-full sm:w-auto overflow-x-auto">
                <button
                  onClick={() => setLeadStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    leadStatusFilter === 'all'
                      ? "bg-amber-500 text-slate-950"
                      : "bg-slate-950 text-slate-400 hover:text-white"
                  }`}
                >
                  الكل ({leads.length})
                </button>
                <button
                  onClick={() => setLeadStatusFilter('new')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    leadStatusFilter === 'new'
                      ? "bg-amber-500 text-slate-950"
                      : "bg-slate-950 text-slate-400 hover:text-white"
                  }`}
                >
                  جديدة ({leads.filter(l => l.status === 'new').length})
                </button>
                <button
                  onClick={() => setLeadStatusFilter('contacted')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    leadStatusFilter === 'contacted'
                      ? "bg-amber-500 text-slate-950"
                      : "bg-slate-950 text-slate-400 hover:text-white"
                  }`}
                >
                  تم التواصل ({leads.filter(l => l.status === 'contacted').length})
                </button>
                <button
                  onClick={() => setLeadStatusFilter('closed')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    leadStatusFilter === 'closed'
                      ? "bg-amber-500 text-slate-950"
                      : "bg-slate-950 text-slate-400 hover:text-white"
                  }`}
                >
                  مكتملة ({leads.filter(l => l.status === 'closed').length})
                </button>
              </div>
            </div>

            {/* Leads List */}
            {filteredLeads.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
                <Users size={40} className="text-slate-600 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-300 mb-1">لا توجد طلبات مطابقة</h3>
                <p className="text-xs text-slate-500">
                  {leadSearch ? "جرب البحث بكلمات أخرى" : "ستظهر هنا كافة طلبات المعاينة والاستفسارات التي يرسلها العملاء"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredLeads.map((lead) => {
                  const waReplyText = `أهلاً بك أستاذ ${lead.name}، معك م/ شركة الأمين للبرجولات بخصوص طلبك (${lead.service}). يشرفنا خدمتك وتحديد موعد المعاينة.`;
                  const waUrl = `https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(waReplyText)}`;

                  return (
                    <div
                      key={lead.id}
                      className={`bg-slate-900 border rounded-2xl p-5 flex flex-col justify-between transition-all ${
                        lead.status === 'new'
                          ? "border-amber-500/50 shadow-lg shadow-amber-500/5 bg-amber-500/[0.02]"
                          : "border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      <div className="space-y-3">
                        {/* Header: Name + Status badge */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-black text-base text-white">{lead.name}</h4>
                            <span className="text-xs text-amber-400 font-bold block mt-0.5">
                              {lead.service || "برجولة خشبية"}
                            </span>
                          </div>

                          <select
                            value={lead.status || 'new'}
                            onChange={(e) => handleUpdateLeadStatus(lead.id, e.target.value as any)}
                            className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border outline-none cursor-pointer ${
                              lead.status === 'new'
                                ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                                : lead.status === 'contacted'
                                ? "bg-blue-500/20 text-blue-400 border-blue-500/40"
                                : "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                            }`}
                          >
                            <option value="new" className="bg-slate-900 text-white">جديد (لم يتم الرد)</option>
                            <option value="contacted" className="bg-slate-900 text-white">تم التواصل</option>
                            <option value="closed" className="bg-slate-900 text-white">مكتمل ومغلق</option>
                          </select>
                        </div>

                        {/* Customer Phone */}
                        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-2.5 flex items-center justify-between text-xs">
                          <span className="text-slate-400">رقم الهاتف:</span>
                          <span className="font-mono font-bold text-slate-200" dir="ltr">{lead.phone}</span>
                        </div>

                        {lead.city && <p className="text-xs text-slate-300">منطقة التنفيذ: {lead.city}</p>}
                        {lead.landingPage && <p className="text-xs text-slate-400">صفحة الطلب: {lead.landingPage === 'roof' ? 'برجولات روف' : lead.landingPage === 'garden' ? 'برجولات حدائق' : 'الرئيسية'}</p>}
                        {/* Customer Message */}
                        {lead.message && (
                          <div className="bg-slate-950/40 border border-slate-800/60 rounded-xl p-3 text-xs text-slate-300 leading-relaxed">
                            <span className="text-slate-500 block text-[10px] mb-1 font-bold">ملاحظات العميل:</span>
                            {lead.message}
                          </div>
                        )}

                        {/* Timestamp */}
                        <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
                          <Clock size={12} />
                          <span>
                            {lead.createdAt?.toDate
                              ? lead.createdAt.toDate().toLocaleString('ar-EG')
                              : typeof lead.createdAt === 'string'
                              ? new Date(lead.createdAt).toLocaleString('ar-EG')
                              : 'الآن'}
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons & In-Card Deletion Confirmation */}
                      {leadIdPendingDelete === lead.id ? (
                        <div className="pt-3 mt-3 border-t border-red-900/60 flex flex-col gap-2 bg-red-950/40 p-3 rounded-xl border border-red-900/50">
                          <div className="flex items-center gap-2 text-xs font-bold text-red-200">
                            <AlertCircle size={15} className="text-red-400 shrink-0" />
                            <span>تأكيد حذف طلب {lead.name} نهائياً؟</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <button
                              type="button"
                              onClick={() => handleConfirmDeleteLead(lead.id)}
                              className="bg-red-600 hover:bg-red-500 active:bg-red-700 text-white py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all flex-1 cursor-pointer shadow-md shadow-red-950"
                            >
                              <Trash2 size={13} />
                              <span>نعم، حذف نهائي</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setLeadIdPendingDelete(null)}
                              className="bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 px-3 rounded-lg text-xs font-bold transition-all flex-1 cursor-pointer"
                            >
                              إلغاء
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="pt-4 mt-4 border-t border-slate-800 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-1">
                            <a
                              href={`tel:${lead.phone}`}
                              className="bg-[#143d6a] hover:bg-[#1a4f8a] text-white p-2.5 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold transition-colors flex-1"
                              title="اتصال هاتفي مباشر"
                            >
                              <Phone size={14} />
                              <span>اتصال</span>
                            </a>

                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-emerald-600 hover:bg-emerald-500 text-white p-2.5 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold transition-colors flex-1"
                              title="رد فوري عبر واتساب"
                            >
                              <MessageCircle size={14} />
                              <span>واتساب</span>
                            </a>
                          </div>

                          <button
                            type="button"
                            onClick={() => setLeadIdPendingDelete(lead.id)}
                            className="bg-red-950/40 hover:bg-red-900/60 text-red-400 p-2.5 rounded-xl transition-colors cursor-pointer border border-red-900/40 hover:border-red-600/60"
                            title="حذف هذا الطلب"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* TAB 2: GALLERY & PROJECTS MANAGEMENT */}
        {/* ----------------------------------------------------------------- */}
        {activeTab === 'gallery' && (
          <div className="space-y-8">

            {/* Upload Section Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
              <div className="flex items-center gap-2.5 mb-6 pb-4 border-b border-slate-800">
                <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl flex items-center justify-center">
                  <Upload size={20} />
                </div>
                <div>
                  <h3 className="font-black text-lg text-white">إضافة مشروع جديد للمعرض</h3>
                  <p className="text-xs text-slate-400">يتم ضغط الصورة تلقائياً للحفاظ على سرعة تصفح الموقع والظهور الفوري للعملاء.</p>
                </div>
              </div>

              <form onSubmit={handleUploadImage} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Title */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-2">عنوان ووصف المشروع *</label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="مثال: برجولة حديقة مودرن خشب عزيزي مع دهانات عازلة"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:border-amber-500 outline-none"
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-2">تصنيف العمل في المعرض *</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:border-amber-500 outline-none cursor-pointer"
                    >
                      <option value="برجولات حدائق">برجولات حدائق وفلل</option>
                      <option value="برجولات روف">برجولات روف وأسطح</option>
                      <option value="أسقف ديكورية">أسقف ديكورية وتجاليد</option>
                      <option value="أعمال خشبية">أعمال خشبية وبوابات</option>
                      <option value="ديكورات خشبية">ديكورات وجلسات خشبية</option>
                    </select>
                  </div>
                </div>

                {/* File Drop & Compression Box */}
                <div className="border-2 border-dashed border-slate-800 hover:border-amber-500/50 rounded-2xl p-6 bg-slate-950/50 text-center transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="admin-gallery-file"
                  />
                  <label htmlFor="admin-gallery-file" className="cursor-pointer flex flex-col items-center">
                    {previewUrl ? (
                      <div className="space-y-3">
                        <div className="max-w-sm mx-auto h-48 rounded-xl overflow-hidden border border-slate-700 bg-slate-900 shadow-lg">
                          <img src={previewUrl} alt="معاينة" className="w-full h-full object-cover" />
                        </div>
                        <span className="text-xs text-amber-400 font-bold underline inline-block">تغيير الصورة المحددة</span>
                      </div>
                    ) : (
                      <>
                        <div className="w-14 h-14 bg-slate-800 text-slate-400 rounded-2xl flex items-center justify-center mb-3">
                          <ImagePlus size={26} />
                        </div>
                        <span className="text-sm font-bold text-white mb-1">اضغط هنا لاختيار صورة المشروع من جهازك</span>
                        <span className="text-xs text-slate-500">يدعم JPG, PNG, WEBP — يتم الضغط التلقائي السريع</span>
                      </>
                    )}
                  </label>

                  {/* Compression Feedback */}
                  {isCompressing && (
                    <div className="mt-3 text-xs text-amber-400 flex items-center justify-center gap-1.5 font-bold">
                      <Loader2 size={14} className="animate-spin" />
                      <span>جاري ضغط الصورة بالذكاء لتسريع الموقع...</span>
                    </div>
                  )}

                  {compressionInfo && (
                    <div className="mt-3 inline-flex items-center gap-2 bg-emerald-950/50 border border-emerald-800/60 px-3 py-1.5 rounded-xl text-emerald-300 text-xs font-bold">
                      <Sparkles size={14} className="text-amber-400" />
                      <span>تم ضغط الحجم بنجاح: وفرت {compressionInfo.savingsPercent}% من المساحة</span>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isUploading || isCompressing || !title.trim() || !previewUrl}
                  className="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 text-slate-950 px-8 py-3.5 rounded-xl font-black text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20"
                >
                  {isUploading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>{uploadStatusText || 'جاري النشر...'}</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      <span>حفظ ونشر المشروع في المعرض فوراً</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Manage Existing Projects Section */}
            <div className="space-y-4">
              {/* Sync Status Alert Banner */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-xl border ${
                    syncState.isSyncing
                      ? 'bg-sky-500/10 border-sky-500/30 text-sky-400'
                      : syncState.pendingCount > 0
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                      : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  }`}>
                    {syncState.isSyncing ? (
                      <RefreshCw size={18} className="animate-spin" />
                    ) : syncState.pendingCount > 0 ? (
                      <Cloud size={18} />
                    ) : (
                      <CheckCircle2 size={18} />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">حالة التخزين والمزامنة:</span>
                      {syncState.isSyncing ? (
                        <span className="text-sky-400 font-bold">جاري مزامنة التغييرات مع السيرفر في الخلفية...</span>
                      ) : syncState.pendingCount > 0 ? (
                        <span className="text-amber-400 font-bold">يوجد ({syncState.pendingCount}) تعديل/صورة محفوظة محلياً بأمان بانتظار المزامنة</span>
                      ) : (
                        <span className="text-emerald-400 font-bold">جميع الصور والتعديلات متزامنة ومحفوظة سحابياً بنجاح</span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      النظام يعمل بتقنية Local-First: جميع الصور المضغوطة والتعديلات محفوظة محلياً في المتصفح ولا يمكن أن تضيع حتى في حال انتهاء الكوتا السحابية أو انقطاع الإنترنت.
                    </p>
                  </div>
                </div>

                {syncState.pendingCount > 0 && (
                  <button
                    type="button"
                    onClick={handleManualSync}
                    disabled={syncState.isSyncing}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    <RefreshCw size={13} className={syncState.isSyncing ? "animate-spin" : ""} />
                    <span>مزامنة الآن</span>
                  </button>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-black text-lg text-white">المشروعات الحالية بالمعرض ({filteredProjects.length})</h3>
                  <p className="text-xs text-slate-400">يمكنك سحب وإفلات الصور لإعادة ترتيبها فوراً كما تظهر للزوار في المعرض العام.</p>
                </div>

                {/* Category Filter */}
                <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setGalleryCategoryFilter(cat)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                        galleryCategoryFilter === cat
                          ? "bg-amber-500 text-slate-950"
                          : "bg-slate-900 text-slate-400 hover:text-white"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Drag and Drop instructions banner */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 text-amber-400 font-bold">
                  <ListOrdered size={18} className="shrink-0" />
                  <span>ميزة إعادة الترتيب (Drag & Drop):</span>
                  <span className="text-slate-300 font-normal">
                    اسحب أي كرت وأفلته في المكان المطلوب أو استخدم أزرار الأسهم، ويتم حفظ الترتيب تلقائياً في السيرفر وظهوره للزوار.
                  </span>
                </div>
                {galleryCategoryFilter !== 'الكل' && (
                  <span className="text-amber-400 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-xl text-[11px] font-bold shrink-0">
                    لإعادة الترتيب الشامل، اختر تصنيف "الكل"
                  </span>
                )}
              </div>

              {/* Projects Grid with Drag & Drop and Move buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredProjects.map((project, index) => {
                  const isCurrentFilterAll = galleryCategoryFilter === 'الكل';
                  const isBeingDragged = draggedProjectIndex === index;
                  const isDragOver = dragOverProjectIndex === index;

                  return (
                    <div
                      key={project.id}
                      draggable={isCurrentFilterAll}
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDrop={(e) => handleDrop(e, index)}
                      onDragEnd={handleDragEnd}
                      className={`bg-slate-900 border rounded-2xl overflow-hidden group flex flex-col justify-between transition-all duration-200 select-none ${
                        isBeingDragged
                          ? 'opacity-40 border-dashed border-amber-500 scale-95'
                          : isDragOver
                          ? 'border-amber-400 ring-2 ring-amber-400/40'
                          : 'border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="relative aspect-[4/3] bg-slate-950 overflow-hidden">
                        <img
                          src={project.image}
                          alt={project.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 pointer-events-none"
                          loading="lazy"
                        />

                        {/* Top Badges: Order & Category */}
                        <div className="absolute top-2 right-2 flex items-center gap-1.5">
                          <span className="bg-slate-950/90 backdrop-blur-md text-[10px] font-black text-amber-400 px-2 py-0.5 rounded-lg border border-amber-500/30">
                            #{index + 1}
                          </span>
                          <span className="bg-slate-950/80 backdrop-blur-md text-[10px] font-bold text-slate-300 px-2 py-0.5 rounded-lg">
                            {project.category}
                          </span>
                        </div>

                        {/* Drag Handle Indicator */}
                        {isCurrentFilterAll && (
                          <div
                            className="absolute top-2 left-2 bg-slate-950/80 backdrop-blur-md text-amber-400 p-1.5 rounded-lg cursor-grab active:cursor-grabbing hover:bg-amber-500 hover:text-slate-950 transition-colors shadow-md"
                            title="اسحب من هنا لتغيير الترتيب"
                          >
                            <GripVertical size={14} />
                          </div>
                        )}
                      </div>

                      <div className="p-3.5 space-y-3 flex-1 flex flex-col justify-between">
                        <div>
                          <p className="text-xs font-bold text-slate-200 line-clamp-2 leading-relaxed">
                            {project.title}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            <span className="text-[10px] text-slate-500">
                              {project.isFirestore ? "مشروع مرفوع" : "صورة افتراضية"}
                            </span>

                            {project.isFirestore && project.syncStatus === 'uploading' && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-sky-400 bg-sky-950/80 border border-sky-500/40 px-1.5 py-0.5 rounded font-bold">
                                <RefreshCw size={10} className="animate-spin" /> جاري المزامنة
                              </span>
                            )}
                            {project.isFirestore && (project.syncStatus === 'pending' || (!project.syncStatus && String(project.id).startsWith('proj_'))) && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 bg-amber-950/80 border border-amber-500/40 px-1.5 py-0.5 rounded font-bold">
                                <span>⏳</span> محلي (بانتظار الرفع)
                              </span>
                            )}
                            {project.isFirestore && project.syncStatus === 'failed' && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-rose-400 bg-rose-950/80 border border-rose-500/40 px-1.5 py-0.5 rounded font-bold">
                                <span>⚠</span> محلي (سيعاد المحاولة)
                              </span>
                            )}
                            {project.isFirestore && project.syncStatus === 'synced' && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                                <span>✓</span> متزامن
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Order Control Arrows */}
                        {isCurrentFilterAll && (
                          <div className="flex items-center justify-between bg-slate-950/60 p-1.5 rounded-xl border border-slate-800/80 text-[11px]">
                            <span className="text-slate-400 font-bold px-1 text-[10px]">الترتيب:</span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={index === 0}
                                onClick={() => handleReorder(index, index - 1)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-amber-500 hover:text-slate-950 disabled:opacity-20 disabled:hover:bg-slate-800 disabled:hover:text-slate-400 text-slate-300 transition-colors cursor-pointer"
                                title="تقديم للأمام"
                              >
                                <ChevronUp size={13} />
                              </button>
                              <button
                                type="button"
                                disabled={index === filteredProjects.length - 1}
                                onClick={() => handleReorder(index, index + 1)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-amber-500 hover:text-slate-950 disabled:opacity-20 disabled:hover:bg-slate-800 disabled:hover:text-slate-400 text-slate-300 transition-colors cursor-pointer"
                                title="تأخير للخلف"
                              >
                                <ChevronDown size={13} />
                              </button>
                            </div>
                          </div>
                        )}

                        {galleryItemPendingDelete === project.id ? (
                          <div className="bg-red-950/90 border border-red-800/80 rounded-xl p-2.5 flex flex-col gap-2">
                            <span className="text-[11px] text-red-200 font-bold text-center">تأكيد حذف هذا المشروع؟</span>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleConfirmDeleteGalleryItem(project.id, project.isFirestore)}
                                className="bg-red-600 hover:bg-red-500 active:bg-red-700 text-white py-1.5 px-2 rounded-lg text-[11px] font-bold flex-1 cursor-pointer"
                              >
                                نعم، احذف
                              </button>
                              <button
                                type="button"
                                onClick={() => setGalleryItemPendingDelete(null)}
                                className="bg-slate-800 hover:bg-slate-700 text-slate-300 py-1.5 px-2 rounded-lg text-[11px] font-bold flex-1 cursor-pointer"
                              >
                                إلغاء
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setGalleryItemPendingDelete(project.id)}
                            className="w-full bg-red-950/40 hover:bg-red-900/60 border border-red-900/50 text-red-300 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Trash2 size={13} />
                            <span>حذف من المعرض</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* TAB 3: BEFORE & AFTER MANAGEMENT */}
        {/* ----------------------------------------------------------------- */}
        {activeTab === 'beforeAfter' && (
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
              <div className="flex items-center gap-2.5 mb-6 pb-4 border-b border-slate-800">
                <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl flex items-center justify-center">
                  <ArrowLeftRight size={20} />
                </div>
                <div>
                  <h3 className="font-black text-lg text-white">إدارة صور مقارنة قبل وبعد</h3>
                  <p className="text-xs text-slate-400">عدل صورة المكان قبل البدء وصورة النتيجة بعد التركيب لاطلاع الزوار على جودة التنفيذ.</p>
                </div>
              </div>

              <form onSubmit={handleSaveBeforeAfter} className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-2">عنوان التحول *</label>
                  <input
                    type="text"
                    value={baTitle}
                    onChange={(e) => {
                      setBaTitle(e.target.value);
                      setBaDirty(true);
                    }}
                    placeholder="مثال: تحويل روف خرساني إلى واحة استجمام فندقية"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:border-amber-500 outline-none"
                  />
                </div>

                {/* Upload Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Before Upload */}
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-500"></span>
                        صورة قبل العمل
                      </span>
                      {isCompressingBA === 'before' && (
                        <span className="text-[10px] text-amber-400 font-bold flex items-center gap-1">
                          <Loader2 size={12} className="animate-spin" /> جاري الضغط...
                        </span>
                      )}
                    </div>

                    <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-slate-900 border border-slate-800">
                      <img src={baBeforeImage} alt="قبل العمل" className="w-full h-full object-cover" />
                    </div>

                    <label className="block">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleSelectBAFile(e, 'before')}
                        disabled={isSavingBA || isCompressingBA !== null}
                        className="w-full text-xs text-slate-400 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-800 file:text-white hover:file:bg-amber-500 hover:file:text-slate-950 file:cursor-pointer cursor-pointer"
                      />
                    </label>
                  </div>

                  {/* After Upload */}
                  <div className="bg-slate-950 border border-amber-500/30 rounded-2xl p-4 space-y-3 bg-amber-500/[0.02]">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-400 flex items-center gap-2">
                        <Sparkles size={14} />
                        صورة بعد التركيب
                      </span>
                      {isCompressingBA === 'after' && (
                        <span className="text-[10px] text-amber-400 font-bold flex items-center gap-1">
                          <Loader2 size={12} className="animate-spin" /> جاري الضغط...
                        </span>
                      )}
                    </div>

                    <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-slate-900 border border-amber-500/30">
                      <img src={baAfterImage} alt="بعد التركيب" className="w-full h-full object-cover" />
                    </div>

                    <label className="block">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleSelectBAFile(e, 'after')}
                        disabled={isSavingBA || isCompressingBA !== null}
                        className="w-full text-xs text-slate-400 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-amber-500 file:text-slate-950 hover:file:bg-amber-400 file:cursor-pointer cursor-pointer"
                      />
                    </label>
                  </div>
                </div>

                {/* Visual Fit Mode & Aspect Ratio Options */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  {/* Option 1: Fit Mode */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-2">
                      طريقة عرض وملاءمة الصور داخل السلايدر:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => { setBaFitMode('contain'); setBaDirty(true); }}
                        className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
                          baFitMode === 'contain'
                            ? 'bg-amber-500/20 border-amber-500 text-white ring-1 ring-amber-500'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-black text-amber-400">احتواء كامل (Smart Fit) ✨</span>
                          {baFitMode === 'contain' && <CheckCircle2 size={14} className="text-amber-400" />}
                        </div>
                        <p className="text-[10px] text-slate-400 leading-tight">
                          إظهار الصورة كاملة 100% دون قص أي جزء من البرجولة مع خلفية ضبابية فخمة تملأ الجوانب.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => { setBaFitMode('cover'); setBaDirty(true); }}
                        className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
                          baFitMode === 'cover'
                            ? 'bg-amber-500/20 border-amber-500 text-white ring-1 ring-amber-500'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-black text-amber-400">ملء الإطار (Cover)</span>
                          {baFitMode === 'cover' && <CheckCircle2 size={14} className="text-amber-400" />}
                        </div>
                        <p className="text-[10px] text-slate-400 leading-tight">
                          ملء كامل مساحة الإطار مع قص الحواف الزائدة لتغطية الإطار كلياً.
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* Option 2: Frame Aspect Ratio */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-2">
                      أبعاد إطار السلايدر (نسبة العرض للارتفاع):
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { id: '4/3', label: '4:3 متوازن', desc: 'الأفضل للبرجولات' },
                        { id: '16/10', label: '16:10 معتدل', desc: 'شاشة متناسقة' },
                        { id: '16/9', label: '16:9 عريض', desc: 'مساحات أفقية' },
                        { id: '3/4', label: '3:4 طولي', desc: 'لصور الموبايل' }
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => { setBaAspectRatio(item.id as any); setBaDirty(true); }}
                          className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                            baAspectRatio === item.id
                              ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-md'
                              : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white text-xs font-bold'
                          }`}
                        >
                          <span className="block text-xs">{item.label}</span>
                          <span className={`block text-[9px] mt-0.5 ${baAspectRatio === item.id ? 'text-slate-900 font-bold' : 'text-slate-500'}`}>
                            {item.desc}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {baSuccessMsg && (
                  <div className="p-3 bg-emerald-950/60 border border-emerald-800/80 rounded-xl text-emerald-300 text-xs font-bold text-center">
                    {baSuccessMsg}
                  </div>
                )}

                {/* Save & Reset Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={isSavingBA || isCompressingBA !== null}
                    className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 py-3.5 px-6 rounded-xl font-black text-xs sm:text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20"
                  >
                    {isSavingBA ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>جاري الحفظ وتحديث الموقع...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={16} />
                        <span>حفظ ونشر التعديلات فوراً على الموقع</span>
                      </>
                    )}
                  </button>

                  {showResetBAConfirm ? (
                    <div className="bg-slate-800 border border-amber-500/40 rounded-xl p-2.5 flex items-center gap-2">
                      <span className="text-xs text-slate-200 font-bold">استعادة الصور الأصلية؟</span>
                      <button
                        type="button"
                        onClick={handleConfirmResetBeforeAfter}
                        className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                      >
                        نعم
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowResetBAConfirm(false)}
                        className="bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                      >
                        إلغاء
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowResetBAConfirm(true)}
                      disabled={isSavingBA}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-300 py-3.5 px-5 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <RotateCcw size={14} />
                      <span>استعادة الصور الأصلية</span>
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Live Interactive Preview Box */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-white flex items-center gap-2">
                  <Eye size={16} className="text-amber-400" />
                  <span>معاينة حية وتجربة السلايدر التفاعلي كما سيظهر للعميل</span>
                </h4>
                <span className="text-[11px] text-slate-400">اسحب المؤشر للمقارنة</span>
              </div>

              <div
                ref={testSliderRef}
                onMouseMove={(e) => updateTestPosition(e.clientX)}
                onTouchMove={(e) => e.touches[0] && updateTestPosition(e.touches[0].clientX)}
                className={`relative w-full rounded-2xl overflow-hidden select-none cursor-ew-resize border border-slate-800 shadow-2xl bg-slate-950 transition-all ${
                  baAspectRatio === '4/3' ? 'aspect-[4/3] max-w-2xl mx-auto' :
                  baAspectRatio === '16/10' ? 'aspect-[16/10] max-w-3xl mx-auto' :
                  baAspectRatio === '3/4' ? 'aspect-[3/4] max-w-md mx-auto' :
                  'aspect-[16/9] max-w-3xl mx-auto'
                }`}
              >
                {/* Ambient Blurred Background for contain mode */}
                {baFitMode === 'contain' && (
                  <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <img
                      src={baAfterImage}
                      alt=""
                      className="w-full h-full object-cover blur-2xl scale-125 opacity-35 brightness-75"
                    />
                  </div>
                )}

                {/* AFTER Image (Background) */}
                <img
                  src={baAfterImage}
                  alt="بعد التركيب"
                  className={`absolute inset-0 w-full h-full pointer-events-none ${
                    baFitMode === 'contain' ? 'object-contain' : 'object-cover'
                  }`}
                />

                {/* BEFORE Image (Clipped Overlay) */}
                <div
                  className="absolute inset-0 overflow-hidden pointer-events-none"
                  style={{ clipPath: `inset(0 ${100 - testSliderPos}% 0 0)` }}
                >
                  {baFitMode === 'contain' && (
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                      <img
                        src={baBeforeImage}
                        alt=""
                        className="w-full h-full object-cover blur-2xl scale-125 opacity-35 brightness-75"
                      />
                    </div>
                  )}
                  <img
                    src={baBeforeImage}
                    alt="قبل العمل"
                    className={`absolute inset-0 w-full h-full pointer-events-none ${
                      baFitMode === 'contain' ? 'object-contain' : 'object-cover'
                    }`}
                  />
                  <span className="absolute top-4 right-4 bg-slate-950/80 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-bold border border-white/10 z-10">
                    قبل العمل
                  </span>
                </div>

                <span className="absolute top-4 left-4 bg-amber-500 text-slate-950 px-3 py-1 rounded-full text-xs font-black shadow-lg z-10">
                  بعد التركيب ✨
                </span>

                {/* Slider Handle Divider */}
                <div
                  className="absolute top-0 bottom-0 w-1 bg-white shadow-2xl pointer-events-none z-20"
                  style={{ left: `${testSliderPos}%` }}
                >
                  <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 bg-white text-slate-900 rounded-full shadow-2xl flex items-center justify-center border-2 border-amber-500">
                    <ArrowLeftRight size={14} />
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* TAB 4: ACTIVITY LOG */}
        {/* ----------------------------------------------------------------- */}
        {activeTab === 'activity' && (
          <div className="space-y-6">
            {/* Header & Filter Toolbar */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                  <History size={20} />
                </div>
                <div>
                  <h3 className="font-black text-lg text-white">سجل العمليات والنشاط (Activity Log)</h3>
                  <p className="text-xs text-slate-400">سجل تلقائي ومؤرخ لجميع التعديلات والعمليات المنفذة في لوحة التحكم.</p>
                </div>
              </div>

              {/* Filter Pills and Clear All Action */}
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <div className="flex gap-1.5 overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setActivityFilter('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                      activityFilter === 'all'
                        ? "bg-amber-500 text-slate-950"
                        : "bg-slate-950 text-slate-400 hover:text-white"
                    }`}
                  >
                    الكل ({activities.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivityFilter('leads')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                      activityFilter === 'leads'
                        ? "bg-amber-500 text-slate-950"
                        : "bg-slate-950 text-slate-400 hover:text-white"
                    }`}
                  >
                    الطلبات ({activities.filter(a => a.type === 'leads').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivityFilter('gallery')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                      activityFilter === 'gallery'
                        ? "bg-amber-500 text-slate-950"
                        : "bg-slate-950 text-slate-400 hover:text-white"
                    }`}
                  >
                    المعرض ({activities.filter(a => a.type === 'gallery').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivityFilter('before_after')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                      activityFilter === 'before_after'
                        ? "bg-amber-500 text-slate-950"
                        : "bg-slate-950 text-slate-400 hover:text-white"
                    }`}
                  >
                    قبل وبعد ({activities.filter(a => a.type === 'before_after').length})
                  </button>
                </div>

                {/* Clear All Logs Button */}
                {activities.length > 0 && (
                  showClearAllActivitiesConfirm ? (
                    <div className="bg-red-950/80 border border-red-800/80 rounded-xl p-1.5 px-3 flex items-center gap-2">
                      <span className="text-[11px] text-red-200 font-bold">مسح السجل بالكامل؟</span>
                      <button
                        type="button"
                        onClick={handleClearAllActivities}
                        disabled={isDeletingActivity}
                        className="bg-red-600 hover:bg-red-500 text-white px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors"
                      >
                        نعم
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowClearAllActivitiesConfirm(false)}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors"
                      >
                        إلغاء
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowClearAllActivitiesConfirm(true)}
                      className="bg-red-950/40 hover:bg-red-900/60 border border-red-900/40 hover:border-red-600/60 text-red-300 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                      title="مسح كافة سجلات النشاط"
                    >
                      <Trash2 size={13} />
                      <span>مسح الكل</span>
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Activities List */}
            {activities.filter(a => activityFilter === 'all' || a.type === activityFilter).length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center">
                <History size={40} className="text-slate-600 mx-auto mb-3" />
                <h4 className="text-base font-bold text-slate-300 mb-1">لا توجد عمليات مسجلة حالياً</h4>
                <p className="text-xs text-slate-500">
                  {activityFilter !== 'all'
                    ? "لا توجد عمليات مسجلة في هذا التصنيف حالياً."
                    : "تم مسح كافة السجلات، أو لم تُنفَّذ أي عمليات جديدة بعد."}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {activities
                  .filter(a => activityFilter === 'all' || a.type === activityFilter)
                  .map((act) => {
                    const isLeads = act.type === 'leads';
                    const isGallery = act.type === 'gallery';
                    const isBA = act.type === 'before_after';

                    const typeName = isLeads ? 'طلبات العملاء' : isGallery ? 'معرض الصور' : 'قبل وبعد';

                    return (
                      <div
                        key={act.id}
                        className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 transition-colors"
                      >
                        {activityPendingDelete === act.id ? (
                          <div className="bg-red-950/80 border border-red-800/80 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
                            <span className="text-xs text-red-200 font-bold flex items-center gap-1.5">
                              <AlertCircle size={15} className="text-red-400 shrink-0" />
                              <span>تأكيد حذف هذا السجل نهائياً؟</span>
                            </span>
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                              <button
                                type="button"
                                onClick={() => handleDeleteActivity(act.id)}
                                className="bg-red-600 hover:bg-red-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex-1 sm:flex-none"
                              >
                                نعم، احذف
                              </button>
                              <button
                                type="button"
                                onClick={() => setActivityPendingDelete(null)}
                                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex-1 sm:flex-none"
                              >
                                إلغاء
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5">
                            <div className="flex items-center gap-3.5">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                isLeads
                                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                  : isGallery
                                  ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                                  : "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                              }`}>
                                {isLeads && <Users size={18} />}
                                {isGallery && <ImagePlus size={18} />}
                                {isBA && <ArrowLeftRight size={18} />}
                              </div>

                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                    isLeads
                                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                      : isGallery
                                      ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                                      : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                                  }`}>
                                    {typeName}
                                  </span>
                                </div>
                                <p className="text-xs sm:text-sm font-bold text-slate-200 leading-relaxed">
                                  {act.description}
                                </p>
                              </div>
                            </div>

                            {/* Timestamp & Delete button */}
                            <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto">
                              <div className="text-[11px] text-slate-400 flex items-center gap-1.5 bg-slate-950/70 border border-slate-800/80 px-3 py-1.5 rounded-xl font-mono">
                                <Clock size={12} className="text-amber-400" />
                                <span>
                                  {act.createdAt?.toDate
                                    ? act.createdAt.toDate().toLocaleString('ar-EG')
                                    : typeof act.createdAt === 'string'
                                    ? new Date(act.createdAt).toLocaleString('ar-EG')
                                    : 'الآن'}
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={() => setActivityPendingDelete(act.id || null)}
                                className="bg-red-950/40 hover:bg-red-900/60 border border-red-900/40 hover:border-red-600/60 text-red-400 p-2 rounded-xl transition-all cursor-pointer"
                                title="حذف هذا السجل"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

      </main>

      {/* Floating In-App Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 pointer-events-auto"
          >
            <div className={`px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border text-sm font-bold ${
              toastMessage.type === 'error'
                ? "bg-red-950/95 border-red-800 text-red-200 shadow-red-950/60"
                : "bg-slate-900/95 border-emerald-500/40 text-emerald-300 shadow-emerald-950/50"
            } backdrop-blur-xl`}>
              {toastMessage.type === 'error' ? (
                <AlertCircle size={18} className="text-red-400 shrink-0" />
              ) : (
                <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
              )}
              <span>{toastMessage.text}</span>
              <button
                type="button"
                onClick={() => setToastMessage(null)}
                className="mr-2 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
        بوابة الإدارة المركزية والآمنة — شركة الأمين لتصميم وتصنيع البرجولات © {new Date().getFullYear()}
      </footer>
    </div>
  );
};

export default AdminPortal;
